// Pane summary service — Task pane-summary (T2)
//
// Spawns a sandboxed, non-interactive `copilot -p` child process to
// distill a 1-sentence "what is the user doing in this pane" summary
// from a Copilot AI session's recent user prompts.
//
// Design constraints (validated by Task 0 spike on 2026-05-20):
//   • `--available-tools` ALONE does NOT sandbox. We must use the
//     `--deny-tool 'shell(*)' --deny-tool 'write' --excluded-tools …`
//     trio. Verified empirically that this blocks file reads.
//   • Every `copilot -p` invocation creates a new session dir in
//     ~/.copilot/session-state/<uuid>/. We tag ours with
//     `-n "tmax-summarizer:<uuid>"` AND best-effort delete the dir
//     after the spawn completes; the session monitor also filters by
//     this prefix as a belt-and-braces.
//   • `--effort medium` produces high-quality output in ~12s on the
//     test corpus. We set a 60s timeout and one retry.
//   • Prompt feeding: we send ONLY the user's own recent prompts
//     (not assistant transcript) on stdin to dramatically reduce
//     the prompt-injection surface area. The system prompt prefix
//     instructs the model to use no tools.
//   • De-dup is session-keyed (provider+sessionId). Two panes pointing
//     at one session share one in-flight job; the same result fans
//     out to both terminals.
//   • Concurrency cap = 2 to avoid pegging the CPU on a multi-pane
//     workspace; further requests queue.
//   • In-memory cache keyed by {provider, sessionId, transcriptVersion}
//     — short-circuits identical requests for the same transcript.

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { IPC } from '../shared/ipc-channels';
import {
  SUMMARIZER_SESSION_NAME_PREFIX,
  buildTranscriptVersion,
  type PaneSummaryRequest,
  type PaneSummaryResult,
  type PaneSummaryError,
  type PaneSummaryConfig,
} from '../shared/pane-summary-types';
import type { CopilotSessionMonitor } from './copilot-session-monitor';
import type { CopilotSession } from '../shared/copilot-types';
import { extractCopilotPrompts } from './copilot-events-parser';
import { diagLog, sanitize } from './diag-logger';

// ── Tunables ───────────────────────────────────────────────────────
const SPAWN_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;
const MAX_CONCURRENCY = 2;
const MAX_PROMPTS_IN_TRANSCRIPT = 6;
const MAX_PROMPT_CHARS = 400;
const MAX_OUTPUT_CHARS = 4_000;          // hard cap on raw stdout we accept
const CACHE_TTL_MS = 60 * 60 * 1000;     // 1h — purely a memory cap; refreshed by transcriptVersion

const SYSTEM_PROMPT =
  'You are a passive summarizer. Do not use any tools. ' +
  'Reply with one short sentence (12 words max) describing what the user is working on. ' +
  'No preamble, no quotes, no markdown.';

// ── Types ──────────────────────────────────────────────────────────

interface InFlightJob {
  provider: 'copilot' | 'claude-code';
  sessionId: string;
  transcriptVersion: string;
  promise: Promise<{ text: string } | { error: string; unavailable?: boolean }>;
  /** terminal ids subscribed to this job's result */
  subscribers: Set<string>;
  /** for retry tracking */
  attempts: number;
  /** Set true when a newer job for the same session has superseded
   *  this one. Stale jobs still complete (they're already spawned) but
   *  must not write to the cache or notify subscribers. */
  stale: boolean;
}

interface CacheEntry {
  text: string;
  generatedAt: number;
  transcriptVersion: string;
}

interface QueuedRequest {
  req: PaneSummaryRequest;
  sender: Electron.WebContents;
  enqueuedAt: number;
}

const MAX_QUEUE_DEPTH = 64;

export interface PaneSummaryServiceDeps {
  monitor: CopilotSessionMonitor;
  /** optional: override executable resolution (tests). */
  resolveExecutable?: () => string;
  config?: () => PaneSummaryConfig | undefined;
}

// ── Output validation ──────────────────────────────────────────────

const MEANINGLESS = [
  /^session in progress\.?$/i,
  /^working on (a|the )?session\.?$/i,
  /^(no|n\/a|nothing)\.?$/i,
  /^summary unavailable\.?$/i,
  /^the user is/i,  // the prompt explicitly forbids "The user is …"; reject as low quality
];

function isMeaninglessSummary(text: string): boolean {
  const stripped = text.replace(/[.!?]+$/, '').trim();
  if (stripped.length < 6) return true;
  return MEANINGLESS.some((re) => re.test(stripped));
}

/** Best-effort sanitization of model output into a single short sentence.
 *  Returns null when output should be rejected (caller will surface a
 *  validator error and retain any prior summary). */
export function validateAndCleanSummary(raw: string): string | null {
  if (!raw) return null;
  let text = raw.slice(0, MAX_OUTPUT_CHARS);

  // Strip code fences and JSON wrappers the model occasionally adds even
  // when told not to.
  text = text.replace(/^```[\w]*\s*/m, '').replace(/```\s*$/m, '');
  // Take first non-empty line.
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  text = firstLine;

  // Strip surrounding quotes (single, double, smart).
  text = text.replace(/^[\s"'“”‘’`]+/, '').replace(/[\s"'“”‘’`]+$/, '');
  // Strip leading "Summary:" / "TL;DR:" / "Answer:" preambles.
  text = text.replace(/^(summary|tl;dr|answer|response|result)\s*[:\-—]\s*/i, '');
  // Collapse interior whitespace.
  text = text.replace(/\s+/g, ' ').trim();

  // Hard caps.
  const words = text.split(/\s+/);
  if (words.length > 25) text = words.slice(0, 25).join(' ');
  if (text.length > 180) text = text.slice(0, 180).trim();

  if (text.length < 6) return null;
  if (isMeaninglessSummary(text)) return null;

  // Ensure terminal punctuation for readability.
  if (!/[.!?]$/.test(text)) text += '.';

  return text;
}

// ── Service ────────────────────────────────────────────────────────

export class PaneSummaryService {
  private readonly deps: PaneSummaryServiceDeps;
  private readonly cache = new Map<string, CacheEntry>(); // key = provider:sessionId
  private readonly inFlight = new Map<string, InFlightJob>(); // key = provider:sessionId
  private readonly queue: QueuedRequest[] = [];
  private activeCount = 0;
  private disposed = false;

  constructor(deps: PaneSummaryServiceDeps) {
    this.deps = deps;
  }

  /** Renderer entry point. Fire-and-forget; results arrive via IPC. */
  request(req: PaneSummaryRequest, sender: Electron.WebContents): void {
    if (this.disposed) return;
    const cfg = this.deps.config?.();
    if (cfg && cfg.enabled === false) {
      this.emitError(sender, {
        terminalId: req.terminalId,
        sessionId: req.sessionId,
        provider: req.provider,
        message: 'pane summary disabled in settings',
        unavailable: true,
      });
      return;
    }

    // v1: Claude not supported.
    if (req.provider !== 'copilot') {
      this.emitError(sender, {
        terminalId: req.terminalId,
        sessionId: req.sessionId,
        provider: req.provider,
        message: 'pane summary v1 supports Copilot only',
        unavailable: true,
      });
      return;
    }

    void this.handleRequest(req, sender);
  }

  private async handleRequest(req: PaneSummaryRequest, sender: Electron.WebContents): Promise<void> {
    const session = this.deps.monitor.getSession(req.sessionId);

    if (!session) {
      this.emitError(sender, {
        terminalId: req.terminalId,
        sessionId: req.sessionId,
        provider: req.provider,
        message: 'AI session not loaded',
      });
      return;
    }

    const transcriptVersion = buildTranscriptVersion(session.messageCount, session.latestPromptTime);
    const cacheKey = `${req.provider}:${req.sessionId}`;

    // Cache hit (and not forced) → emit existing result.
    if (!req.force) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.transcriptVersion === transcriptVersion) {
        this.emitResult(sender, {
          terminalId: req.terminalId,
          sessionId: req.sessionId,
          provider: req.provider,
          transcriptVersion,
          text: cached.text,
          generatedAt: cached.generatedAt,
        });
        return;
      }
    }

    // Dedup: same {provider, sessionId, transcriptVersion} already in flight?
    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight && inFlight.transcriptVersion === transcriptVersion) {
      inFlight.subscribers.add(req.terminalId);
      // Subscribe this terminal to the existing promise too.
      void inFlight.promise.then((outcome) => {
        if (inFlight.stale) return;
        if (!inFlight.subscribers.has(req.terminalId)) return;
        if ('text' in outcome) {
          this.emitResult(sender, {
            terminalId: req.terminalId,
            sessionId: req.sessionId,
            provider: req.provider,
            transcriptVersion,
            text: outcome.text,
            generatedAt: this.cache.get(cacheKey)?.generatedAt ?? Date.now(),
          });
        } else {
          this.emitError(sender, {
            terminalId: req.terminalId,
            sessionId: req.sessionId,
            provider: req.provider,
            message: outcome.error,
            unavailable: outcome.unavailable,
          });
        }
      });
      return;
    }

    // An older job for this session is in flight but its transcriptVersion
    // is stale (typically a force=true refresh after new messages arrived).
    // Mark it stale so when it finally completes it neither writes to the
    // cache nor notifies subscribers — they're about to get a fresher result.
    if (inFlight && inFlight.transcriptVersion !== transcriptVersion) {
      inFlight.stale = true;
    }

    // Concurrency gate.
    if (this.activeCount >= MAX_CONCURRENCY) {
      // Coalesce: if a queued entry already exists for this terminalId,
      // replace it with the newer request rather than appending. Prevents
      // queue bloat from impatient menu-refresh clicks.
      const existingIdx = this.queue.findIndex((q) => q.req.terminalId === req.terminalId);
      if (existingIdx >= 0) {
        this.queue[existingIdx] = { req: { ...req }, sender, enqueuedAt: Date.now() };
      } else if (this.queue.length >= MAX_QUEUE_DEPTH) {
        // Hard cap — fail loudly rather than leak memory.
        this.emitError(sender, {
          terminalId: req.terminalId,
          sessionId: req.sessionId,
          provider: req.provider,
          message: 'summary queue full; try again shortly',
        });
        return;
      } else {
        this.queue.push({ req: { ...req }, sender, enqueuedAt: Date.now() });
      }
      diagLog('paneSummary.queued', { sessionId: sanitize(req.sessionId), queueDepth: this.queue.length });
      return;
    }

    await this.runJob(req, session, transcriptVersion, sender);
  }

  /** Look up a session in the monitor by id. Kept as a stub so tests can
   *  swap the monitor implementation without honouring the real shape. */
  private findSessionInMonitor(_sessionId: string): CopilotSession | undefined {
    return undefined;
  }

  private async runJob(
    req: PaneSummaryRequest,
    session: CopilotSession,
    transcriptVersion: string,
    sender: Electron.WebContents,
  ): Promise<void> {
    const cacheKey = `${req.provider}:${req.sessionId}`;
    this.activeCount++;

    const job: InFlightJob = {
      provider: req.provider,
      sessionId: req.sessionId,
      transcriptVersion,
      subscribers: new Set<string>([req.terminalId]),
      attempts: 0,
      stale: false,
      promise: this.executeWithRetry(req, session),
    };
    this.inFlight.set(cacheKey, job);

    try {
      const outcome = await job.promise;
      // If this job was superseded by a newer one for the same session
      // (transcriptVersion advanced), silently drop the result — the
      // newer job will deliver a fresher answer.
      if (job.stale) {
        diagLog('paneSummary.stale', { sessionId: sanitize(req.sessionId), transcriptVersion });
        return;
      }
      if ('text' in outcome) {
        this.cache.set(cacheKey, {
          text: outcome.text,
          generatedAt: Date.now(),
          transcriptVersion,
        });
        this.purgeStaleCacheEntries();
        // Fan out result to every subscribed pane.
        for (const terminalId of job.subscribers) {
          this.emitResult(sender, {
            terminalId,
            sessionId: req.sessionId,
            provider: req.provider,
            transcriptVersion,
            text: outcome.text,
            generatedAt: this.cache.get(cacheKey)!.generatedAt,
          });
        }
      } else {
        for (const terminalId of job.subscribers) {
          this.emitError(sender, {
            terminalId,
            sessionId: req.sessionId,
            provider: req.provider,
            message: outcome.error,
            unavailable: outcome.unavailable,
          });
        }
      }
    } finally {
      // Only clear the inFlight slot if we're still the current owner;
      // a newer job may have replaced us already.
      if (this.inFlight.get(cacheKey) === job) {
        this.inFlight.delete(cacheKey);
      }
      this.activeCount--;
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    while (this.activeCount < MAX_CONCURRENCY && this.queue.length > 0) {
      const next = this.queue.shift()!;
      // The per-item sender may have gone away between enqueue and now.
      if (next.sender.isDestroyed()) continue;
      void this.handleRequest(next.req, next.sender);
    }
  }

  private async executeWithRetry(
    req: PaneSummaryRequest,
    session: CopilotSession,
  ): Promise<{ text: string } | { error: string; unavailable?: boolean }> {
    let lastError = 'unknown error';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.executeOnce(req, session);
        if ('text' in result) return result;
        if (result.unavailable) return result; // don't retry on unavailable
        lastError = result.error;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      diagLog('paneSummary.retry', {
        sessionId: sanitize(req.sessionId),
        attempt,
        lastError,
      });
    }
    return { error: lastError };
  }

  /** Single attempt: collect transcript → spawn copilot → validate → cleanup. */
  private async executeOnce(
    req: PaneSummaryRequest,
    session: CopilotSession,
  ): Promise<{ text: string } | { error: string; unavailable?: boolean }> {
    const transcript = this.buildTranscript(req, session);
    if (!transcript) {
      return { error: 'no user prompts found in session', unavailable: false };
    }

    const summarizerName = `${SUMMARIZER_SESSION_NAME_PREFIX}${randomUUID()}`;

    const t0 = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let spawnError: string | null = null;

    try {
      ({ stdout, stderr, timedOut } = await this.spawnCopilot(transcript, summarizerName, req.wslDistro));
    } catch (err) {
      spawnError = err instanceof Error ? err.message : String(err);
    }

    const elapsed = Date.now() - t0;
    diagLog('paneSummary.spawn', {
      sessionId: sanitize(req.sessionId),
      provider: req.provider,
      summarizerName: sanitize(summarizerName),
      elapsedMs: elapsed,
      timedOut,
      hadStderr: stderr.length > 0,
      hadError: !!spawnError,
    });

    // Best-effort cleanup: only the session dir we just created. Don't
    // touch dirs belonging to concurrent summarizer runs.
    this.cleanupOurSummarizerSession(summarizerName);

    // Detect "command not found" — child.on('error') resolves with the
    // message folded into stderr, so we must inspect both stderr and
    // any thrown spawnError.
    const combined = `${spawnError ?? ''}\n${stderr}`.toLowerCase();
    if (combined.includes('enoent') || combined.includes('not found') || combined.includes('command not found')) {
      return { error: 'copilot CLI not found', unavailable: true };
    }
    if (spawnError) {
      return { error: `spawn failed: ${spawnError.slice(0, 120)}` };
    }
    if (timedOut) {
      return { error: `timed out after ${Math.round(SPAWN_TIMEOUT_MS / 1000)}s` };
    }

    const cleaned = validateAndCleanSummary(stdout);
    if (!cleaned) {
      return { error: 'output rejected by validator' };
    }
    return { text: cleaned };
  }

  private buildTranscript(req: PaneSummaryRequest, session: CopilotSession): string | null {
    // Reuse the cached prompts from copilot-events-parser when possible.
    const basePath = this.deps.monitor.getBasePath?.() ?? path.join(os.homedir(), '.copilot', 'session-state');
    const eventsPath = path.join(basePath, req.sessionId, 'events.jsonl');
    const prompts = extractCopilotPrompts(eventsPath, MAX_PROMPTS_IN_TRANSCRIPT);
    if (prompts.length === 0) {
      // Fallback to the single latest prompt on the summary, if any.
      if (session.latestPrompt) {
        return this.assemblePrompt([session.latestPrompt]);
      }
      return null;
    }
    return this.assemblePrompt(prompts);
  }

  private assemblePrompt(userPrompts: string[]): string {
    const lines: string[] = [SYSTEM_PROMPT, '', 'Recent user prompts from the session:'];
    for (const p of userPrompts) {
      const safe = p.replace(/\u0000/g, '').replace(/\r/g, '').slice(0, MAX_PROMPT_CHARS);
      // Indent with "> " so the model sees these clearly as quoted user
      // material rather than its own instructions.
      for (const line of safe.split('\n')) {
        lines.push(`> ${line}`);
      }
      lines.push('');
    }
    lines.push('Now reply with the single-sentence summary, no preamble.');
    return lines.join('\n');
  }

  // ── Spawn ────────────────────────────────────────────────────────

  /** Resolve the absolute path to the `copilot` executable.
   *
   *  Electron launched from Finder/Dock on macOS gets a stripped PATH
   *  (`/usr/bin:/bin:/usr/sbin:/sbin`) that doesn't include common
   *  installation locations like Homebrew's `/opt/homebrew/bin` or
   *  `~/.local/bin`. `spawn('copilot', …)` then fails with ENOENT and
   *  the summary never appears. To make the feature work in that
   *  environment we try a fixed list of common locations and fall back
   *  to the bare name (so a PATH-augmented shell still works). The
   *  resolved path is cached for the lifetime of the service. */
  private resolvedExecutable: string | null = null;
  private resolveCopilotPath(): string {
    if (this.deps.resolveExecutable) return this.deps.resolveExecutable();
    if (this.resolvedExecutable) return this.resolvedExecutable;

    const candidates: string[] = [];
    if (process.platform === 'win32') {
      candidates.push('copilot.exe', 'copilot.cmd', 'copilot');
    } else {
      const home = os.homedir();
      candidates.push(
        '/opt/homebrew/bin/copilot',           // Apple Silicon Homebrew
        '/usr/local/bin/copilot',              // Intel Homebrew + many installers
        path.join(home, '.local', 'bin', 'copilot'),
        path.join(home, '.npm-global', 'bin', 'copilot'),
        path.join(home, '.nvm', 'versions', 'node', '*', 'bin', 'copilot'),
      );
    }

    for (const c of candidates) {
      // Skip globs — fs.existsSync doesn't expand them.
      if (c.includes('*')) continue;
      try {
        if (fs.existsSync(c)) {
          this.resolvedExecutable = c;
          diagLog('paneSummary.exeResolved', { path: c });
          return c;
        }
      } catch { /* ignore */ }
    }

    // Last resort: search PATH (works when launched from a shell that
    // augmented PATH already).
    const pathEnv = process.env.PATH ?? '';
    const sep = process.platform === 'win32' ? ';' : ':';
    const exeName = process.platform === 'win32' ? 'copilot.exe' : 'copilot';
    for (const dir of pathEnv.split(sep)) {
      if (!dir) continue;
      const full = path.join(dir, exeName);
      try {
        if (fs.existsSync(full)) {
          this.resolvedExecutable = full;
          diagLog('paneSummary.exeResolved', { path: full });
          return full;
        }
      } catch { /* ignore */ }
    }

    // Couldn't resolve — return bare name; spawn will hit ENOENT and we
    // surface unavailable.
    diagLog('paneSummary.exeNotResolved', {});
    return 'copilot';
  }

  private augmentedPath(): string {
    const cur = process.env.PATH ?? '';
    if (process.platform === 'win32') return cur;
    const sep = ':';
    const extra = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      `${os.homedir()}/.local/bin`,
      `${os.homedir()}/.npm-global/bin`,
    ];
    const existing = new Set(cur.split(sep));
    const additions = extra.filter((p) => !existing.has(p));
    return additions.length ? `${cur}${sep}${additions.join(sep)}` : cur;
  }

  private spawnCopilot(
    promptText: string,
    summarizerName: string,
    wslDistro?: string,
  ): Promise<{ stdout: string; stderr: string; timedOut: boolean }> {
    const exe = this.resolveCopilotPath();

    const baseArgs = [
      '-p', '',
      '-n', summarizerName,
      '--silent',
      '--log-level', 'none',
      '--effort', 'medium',
      '--no-ask-user',
      '--no-custom-instructions',
      '--no-auto-update',
      '--no-remote',
      '--disallow-temp-dir',
      '--deny-tool', 'shell(*)',
      '--deny-tool', 'write',
      '--excluded-tools', 'view,bash,powershell,grep,glob,edit,create',
      '--allow-all-tools',
    ];

    let cmd: string;
    let args: string[];
    if (wslDistro && process.platform === 'win32') {
      cmd = 'wsl.exe';
      args = ['-d', wslDistro, '--', exe, ...baseArgs];
    } else {
      cmd = exe;
      args = baseArgs;
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      const child = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        // Run from a neutral cwd so no cwd-scoped settings or .git affect the spawn.
        cwd: os.tmpdir(),
        env: {
          ...process.env,
          // Augment PATH so the child can find node/python etc. even when
          // Electron was launched with a stripped PATH (Finder/Dock).
          PATH: this.augmentedPath(),
          // Defence in depth: tell Copilot not to read user instructions
          // via env vars some shells honour.
          COPILOT_NONINTERACTIVE: '1',
        },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
        // Hard kill 2s later if still alive.
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* ignore */ } }, 2_000);
      }, SPAWN_TIMEOUT_MS);

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT_CHARS) stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT_CHARS) stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // Surface ENOENT etc. via stderr-style channel.
        stderr = (stderr + '\n' + (err?.message ?? String(err))).trim();
        resolve({ stdout, stderr, timedOut });
      });

      child.on('close', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, timedOut });
      });

      // Write the prompt to stdin and close. Wrap in try in case the
      // child died before stdin was ready.
      try {
        child.stdin.write(promptText);
        child.stdin.end();
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            stdout,
            stderr: (stderr + '\n' + String(err)).trim(),
            timedOut,
          });
        }
      }
    });
  }

  // ── Session-dir cleanup ──────────────────────────────────────────

  /** Find and remove only the session dir created for this exact spawn,
   *  identified by `name: tmax-summarizer:<uuid>` in workspace.yaml.
   *  Safe against concurrent summarizer jobs. */
  private cleanupOurSummarizerSession(summarizerName: string): void {
    const baseDir = path.join(os.homedir(), '.copilot', 'session-state');
    try {
      if (!fs.existsSync(baseDir)) return;
      for (const entry of fs.readdirSync(baseDir)) {
        const full = path.join(baseDir, entry);
        const wsPath = path.join(full, 'workspace.yaml');
        if (!fs.existsSync(wsPath)) continue;
        try {
          const content = fs.readFileSync(wsPath, 'utf-8');
          if (new RegExp(`^(name|summary):\\s*${escapeRegExp(summarizerName)}\\s*$`, 'm').test(content)) {
            try { fs.rmSync(full, { recursive: true, force: true }); } catch { /* ignore */ }
            return;
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  /** Best-effort sweep of ALL leftover summarizer dirs. Only called from
   *  dispose() — when the service is shutting down nothing else is
   *  spawning, so the cross-run race in #7 doesn't apply. */
  private sweepAllSummarizerSessions(): void {
    const baseDir = path.join(os.homedir(), '.copilot', 'session-state');
    try {
      if (!fs.existsSync(baseDir)) return;
      for (const entry of fs.readdirSync(baseDir)) {
        const full = path.join(baseDir, entry);
        if (this.isOurSummarizerDir(full)) {
          try { fs.rmSync(full, { recursive: true, force: true }); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  private isOurSummarizerDir(fullPath: string): boolean {
    try {
      const wsPath = path.join(fullPath, 'workspace.yaml');
      if (!fs.existsSync(wsPath)) return false;
      const content = fs.readFileSync(wsPath, 'utf-8');
      // Match either `name: tmax-summarizer:…` or `summary: tmax-summarizer:…`
      // because CLI versions differ on which field holds `-n`.
      return new RegExp(`^(name|summary):\\s*${SUMMARIZER_SESSION_NAME_PREFIX}`, 'm').test(content);
    } catch {
      return false;
    }
  }

  // ── Cache ────────────────────────────────────────────────────────

  private purgeStaleCacheEntries(): void {
    if (this.cache.size <= 64) return;
    const now = Date.now();
    for (const [k, v] of this.cache) {
      if (now - v.generatedAt > CACHE_TTL_MS) this.cache.delete(k);
    }
    // Hard cap: if still > 64, evict oldest.
    if (this.cache.size > 64) {
      const sorted = Array.from(this.cache.entries()).sort((a, b) => a[1].generatedAt - b[1].generatedAt);
      const toDrop = sorted.slice(0, this.cache.size - 64);
      for (const [k] of toDrop) this.cache.delete(k);
    }
  }

  // ── IPC emit (per-sender to avoid leaking summaries to other windows) ──

  private emitResult(sender: Electron.WebContents, result: PaneSummaryResult): void {
    this.send(sender, IPC.PANE_SUMMARY_RESULT, result);
  }

  private emitError(sender: Electron.WebContents, err: PaneSummaryError): void {
    this.send(sender, IPC.PANE_SUMMARY_ERROR, err);
  }

  private send(sender: Electron.WebContents, channel: string, payload: unknown): void {
    try {
      if (!sender.isDestroyed()) sender.send(channel, payload);
    } catch { /* ignore */ }
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  /** Clear cache and pending state. Safe to call repeatedly. */
  dispose(): void {
    this.disposed = true;
    this.cache.clear();
    this.inFlight.clear();
    this.queue.length = 0;
    // Shutdown-time sweep — no concurrent summarizers to race with.
    this.sweepAllSummarizerSessions();
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
