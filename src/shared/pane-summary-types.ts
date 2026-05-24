import type { SessionProvider } from './copilot-types';

// ── Pane summary feature ────────────────────────────────────────────
// AI-distilled one-sentence summary of "what is the user doing in this
// pane right now". Sourced by spawning a sandboxed, non-interactive
// summarizer invocation of the same AI CLI that owns the pane (today:
// Copilot only; Claude deferred to v2). The result is surfaced on hover
// of the tab/pane title and via the pane ⋯ menu (Refresh / Copy).
//
// Lifetime is in-memory only — not persisted across restarts. The user
// asked for "refresh per session", and persisting would also imply
// stale summaries across CLI / model upgrades.

/** Name prefix written to ~/.copilot/session-state/<id>/workspace.yaml's
 *  `name:` field for every summarizer invocation. The Copilot session
 *  monitor (src/main/copilot-session-monitor.ts) filters these out so
 *  they never appear in the AI Sessions panel. */
export const SUMMARIZER_SESSION_NAME_PREFIX = 'tmax-summarizer:';

/** Returns true when an AI session's name was written by our own
 *  summarizer spawn. Used by the session monitor to skip them and by
 *  tests to recognise spike artifacts. */
export function isSummarizerSessionName(name: string | undefined | null): boolean {
  return !!name && name.startsWith(SUMMARIZER_SESSION_NAME_PREFIX);
}

/** Compact identity for the source AI session at the time of a
 *  summary. Two AI sessions with the same {provider, sessionId,
 *  transcriptVersion} produce the same summary, so the service uses
 *  this triple as its cache key (de-dups two panes pointing at one
 *  session and short-circuits re-requests until the session moves on).
 *
 *  transcriptVersion is derived from `messageCount + ":" + latestPromptTime`,
 *  both already exposed on CopilotSessionSummary. We avoid file mtime
 *  because JSONL writes can lag behind the in-memory session state by
 *  hundreds of ms and would produce spurious cache invalidations. */
export function buildTranscriptVersion(messageCount: number, latestPromptTime: number | undefined): string {
  return `${messageCount}:${latestPromptTime ?? 0}`;
}

export type PaneSummaryStatus = 'idle' | 'pending' | 'ready' | 'error' | 'unavailable';

/** Stored per TerminalId in the renderer store (paneSummaries map). */
export interface PaneSummary {
  /** Provider that produced this summary (or would have, for 'error'/'pending'). */
  provider: SessionProvider;
  /** AI session id this summary was distilled from. */
  sessionId: string;
  /** Identity of the transcript at generation time (see buildTranscriptVersion). */
  transcriptVersion: string;
  /** The 1-sentence summary text, or '' while pending / on error. Validators
   *  ensure this is short, single-line, no leading/trailing quotes or preamble. */
  text: string;
  /** ms-since-epoch when text was written. 0 for pending/error. */
  generatedAt: number;
  status: PaneSummaryStatus;
  /** Short error label suitable for tooltips (e.g. "copilot CLI not found",
   *  "timed out after 60s", "output rejected by validator"). Never the
   *  raw transcript or stderr body. */
  lastError?: string;
}

/** Renderer → main: ask for a summary for a specific pane. */
export interface PaneSummaryRequest {
  terminalId: string;
  sessionId: string;
  provider: SessionProvider;
  /** When true, bypass cache and the auto-trigger gate (used by the
   *  `Refresh Summary` menu item). */
  force?: boolean;
  /** Optional WSL distro the summarizer should be spawned inside. */
  wslDistro?: string;
}

/** Main → renderer: a summary is ready. */
export interface PaneSummaryResult {
  terminalId: string;
  sessionId: string;
  provider: SessionProvider;
  transcriptVersion: string;
  text: string;
  generatedAt: number;
}

/** Main → renderer: summary attempt failed. */
export interface PaneSummaryError {
  terminalId: string;
  sessionId: string;
  provider: SessionProvider;
  /** Short, user-presentable label. NEVER includes transcript bodies. */
  message: string;
  /** When true the provider is gated off entirely for this session — the
   *  hook should set status='unavailable' and stop retrying. */
  unavailable?: boolean;
}

/** AppConfig.paneSummary shape — shared between main config-store and
 *  renderer types. Defaults: enabled=true, delayMs=5 minutes. */
export interface PaneSummaryConfig {
  enabled: boolean;
  /** How long after a session starts (ms) before the first auto-summary
   *  fires. Also gated on messageCount ≥ 3 inside the renderer hook. */
  delayMs: number;
}

export const DEFAULT_PANE_SUMMARY_CONFIG: PaneSummaryConfig = {
  enabled: true,
  delayMs: 5 * 60 * 1000,
};
