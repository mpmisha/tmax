// Native Backlog.md write layer (no CLI / Bun / git dependency).
//
// Pure file operations (only `fs` + `path`) so the board can create and edit
// tasks for users who don't have the backlog CLI installed. Output is kept
// byte-compatible with backlog.md so the real CLI / web UI can still read and
// edit the same files. Verified against CLI-generated output:
//   id: TASK-<n> (uppercase) in frontmatter, filename task-<n> - <slug>.md;
//   updated_date inserted after created_date on first edit; titles single-
//   quoted only when YAML requires it; AC lines are "- [ ] #N text".
//
// Kept dependency-free (no electron import) so it can be unit-tested directly.

import * as fs from 'fs';
import * as path from 'path';

/** Strip the "TASK-"/"task-" prefix to the bare numeric id. */
export function bareId(taskId: string): string {
  const m = String(taskId).match(/(\d+)/);
  return m ? m[1] : String(taskId);
}

/** Detect the dominant line ending so edits preserve the file's style. */
function detectEol(content: string): string {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/** Local "YYYY-MM-DD HH:MM" timestamp, matching backlog.md's date fields. */
function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Emit a YAML scalar, single-quoting only when YAML would require it. */
function yamlScalar(s: string): string {
  if (s === '') return "''";
  const indicators = '-?:,[]{}#&*!|>\'"%@`';
  const needs =
    indicators.includes(s[0]) ||
    /:\s/.test(s) ||
    /:$/.test(s) ||
    /\s#/.test(s) ||
    /^\s|\s$/.test(s) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||
    /^[-+]?[0-9.]+$/.test(s);
  return needs ? `'${s.replace(/'/g, "''")}'` : s;
}

/** backlog.md filename slug: non-alphanumerics collapse to single hyphens. */
function slugifyTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const WRITE_SUBDIRS = ['tasks', 'completed'] as const;

function findTaskFile(
  projectPath: string,
  taskId: string,
): { dir: string; file: string; full: string } | null {
  const n = bareId(taskId);
  for (const sub of WRITE_SUBDIRS) {
    const dir = path.join(projectPath, 'backlog', sub);
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const file = entries.find((f) => new RegExp(`^task-${n}\\s+-\\s`).test(f) || f === `task-${n}.md`);
    if (file) return { dir, file, full: path.join(dir, file) };
  }
  return null;
}

// Locate a task file across every subdir, including drafts and the archive, so
// callers (e.g. permanent delete) can act on a task wherever it currently
// lives - not just the active tasks/completed dirs that findTaskFile covers.
export function locateTaskFileAnywhere(
  projectPath: string,
  taskId: string,
): { dir: string; file: string; full: string } | null {
  const n = bareId(taskId);
  const dirs = ['tasks', 'completed', 'drafts', path.join('archive', 'tasks')];
  for (const sub of dirs) {
    const dir = path.join(projectPath, 'backlog', sub);
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const file = entries.find((f) => new RegExp(`^task-${n}\\s+-\\s`).test(f) || f === `task-${n}.md`);
    if (file) return { dir, file, full: path.join(dir, file) };
  }
  return null;
}

export interface EditPayload {
  projectPath: string;
  taskId: string;
  status?: string;
  title?: string;
  description?: string;
  checkAc?: number[];
  uncheckAc?: number[];
}

export function editTask(p: EditPayload): { ok: boolean; error?: string } {
  // Look everywhere (incl. archive) so an archived task can be edited and, when
  // given a non-Archived status, restored to the active board (un-archive).
  const loc = locateTaskFileAnywhere(p.projectPath, p.taskId);
  if (!loc) return { ok: false, error: `Task ${p.taskId} not found` };
  let content: string;
  try {
    content = fs.readFileSync(loc.full, 'utf-8');
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const eol = detectEol(content);
  const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!fmMatch) return { ok: false, error: 'No frontmatter' };
  let fm = fmMatch[2];
  let body = content.slice(fmMatch[0].length);

  let changed = false;

  if (p.status) {
    if (/^status:.*$/m.test(fm)) fm = fm.replace(/^status:.*$/m, `status: ${yamlScalar(p.status)}`);
    changed = true;
  }
  if (p.title) {
    if (/^title:.*$/m.test(fm)) fm = fm.replace(/^title:.*$/m, `title: ${yamlScalar(p.title)}`);
    changed = true;
  }

  // Acceptance-criteria checkbox toggles operate on the body's AC block.
  const acOps: Array<{ idx: number; check: boolean }> = [
    ...(p.checkAc || []).map((idx) => ({ idx, check: true })),
    ...(p.uncheckAc || []).map((idx) => ({ idx, check: false })),
  ];
  if (acOps.length) {
    const lines = body.split(/\r?\n/);
    let inAc = false;
    let acNo = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/<!--\s*AC:BEGIN\s*-->/.test(lines[i])) { inAc = true; continue; }
      if (/<!--\s*AC:END\s*-->/.test(lines[i])) { inAc = false; continue; }
      if (!inAc) continue;
      const m = lines[i].match(/^(\s*-\s*)\[([ xX])\](.*)$/);
      if (m) {
        acNo++;
        const op = acOps.find((o) => o.idx === acNo);
        if (op) lines[i] = `${m[1]}[${op.check ? 'x' : ' '}]${m[3]}`;
      }
    }
    body = lines.join(eol);
    changed = true;
  }

  // Replace the Description section body (create it if the task has none).
  if (typeof p.description === 'string') {
    const re = /(<!--\s*SECTION:DESCRIPTION:BEGIN\s*-->\r?\n)([\s\S]*?)(\r?\n<!--\s*SECTION:DESCRIPTION:END\s*-->)/;
    if (re.test(body)) {
      body = body.replace(re, `$1${p.description}$3`);
    } else {
      body = body.replace(/\s*$/, '') +
        `\n\n## Description\n\n<!-- SECTION:DESCRIPTION:BEGIN -->\n${p.description}\n<!-- SECTION:DESCRIPTION:END -->\n`;
    }
    changed = true;
  }

  if (!changed) return { ok: true };

  // Touch updated_date (insert right after created_date if missing).
  const stamp = nowStamp();
  if (/^updated_date:.*$/m.test(fm)) {
    fm = fm.replace(/^updated_date:.*$/m, `updated_date: '${stamp}'`);
  } else if (/^created_date:.*$/m.test(fm)) {
    fm = fm.replace(/^(created_date:.*)$/m, `$1\nupdated_date: '${stamp}'`);
  }

  const rebuilt = `${fmMatch[1]}${fm}${fmMatch[3]}${body}`;
  const out = eol === '\r\n' ? rebuilt.replace(/\r?\n/g, '\r\n') : rebuilt.replace(/\r\n/g, '\n');

  try {
    fs.writeFileSync(loc.full, out, 'utf-8');
    // Destination name reflects a title change; destination dir moves the file
    // out of the archive back into tasks/ when un-archiving (status set to a
    // real, non-Archived status). Both are applied as a single rename.
    const destName = p.title ? `task-${bareId(p.taskId)} - ${slugifyTitle(p.title)}.md` : loc.file;
    const archived = loc.dir.replace(/\\/g, '/').includes('/archive/tasks');
    const unarchiving = archived && !!p.status && p.status !== 'Archived';
    const destDir = unarchiving ? path.join(p.projectPath, 'backlog', 'tasks') : loc.dir;
    const destFull = path.join(destDir, destName);
    if (destFull !== loc.full) {
      fs.mkdirSync(destDir, { recursive: true });
      if (!fs.existsSync(destFull)) fs.renameSync(loc.full, destFull);
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: true };
}

export interface CreatePayload {
  projectPath: string;
  title: string;
  status?: string;
  description?: string;
  labels?: string[];
}

function readZeroPad(projectPath: string): number {
  try {
    const cfg = fs.readFileSync(path.join(projectPath, 'backlog', 'config.yml'), 'utf-8');
    const m = cfg.match(/^zero_padded_ids:\s*(\d+)/m);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

// Collect every task id currently in use across all backlog subdirs. Scanning
// the filesystem (rather than trusting a stored next_id counter like the CLI
// does) is what makes our ID allocation self-healing: a drifted/duplicated
// counter can't make us reuse a number that already exists on disk.
function usedIds(projectPath: string): Set<number> {
  const used = new Set<number>();
  const dirs = ['tasks', 'completed', 'drafts', path.join('archive', 'tasks')];
  for (const sub of dirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(path.join(projectPath, 'backlog', sub));
    } catch {
      continue;
    }
    for (const f of entries) {
      const m = f.match(/^task-(\d+)\b/);
      if (m) used.add(parseInt(m[1], 10));
    }
  }
  return used;
}

function nextId(projectPath: string, used = usedIds(projectPath)): number {
  let n = 1;
  for (const id of used) n = Math.max(n, id + 1);
  // Defensive: guarantee the chosen id isn't already taken even if the max+1
  // math is somehow off (e.g. a gap left by a manual edit).
  while (used.has(n)) n++;
  return n;
}

export function createTask(p: CreatePayload): { ok: boolean; id?: string; error?: string } {
  try {
    const pad = readZeroPad(p.projectPath);
    const status = p.status || 'To Do';
    const labels =
      p.labels && p.labels.length
        ? '\n' + p.labels.map((l) => `  - ${yamlScalar(l)}`).join('\n')
        : ' []';
    const buildContent = (idNum: string) =>
      [
        '---',
        `id: TASK-${idNum}`,
        `title: ${yamlScalar(p.title)}`,
        `status: ${yamlScalar(status)}`,
        'assignee: []',
        `created_date: '${nowStamp()}'`,
        `labels:${labels}`,
        'dependencies: []',
        '---',
        '',
        '## Description',
        '',
        '<!-- SECTION:DESCRIPTION:BEGIN -->',
        p.description || '',
        '<!-- SECTION:DESCRIPTION:END -->',
        '',
      ].join('\n');

    // Re-scan ids and try to claim one with an exclusive ('wx') write. If a
    // concurrent create grabbed the same number between scan and write, the
    // write fails with EEXIST and we re-scan for a fresh id and retry. This is
    // the last line of defence against the duplicate-task-id bug.
    const used = usedIds(p.projectPath);
    for (let attempt = 0; attempt < 25; attempt++) {
      const num = nextId(p.projectPath, used);
      const idNum = pad > 0 ? String(num).padStart(pad, '0') : String(num);
      const file = `task-${idNum} - ${slugifyTitle(p.title)}.md`;
      const full = path.join(p.projectPath, 'backlog', 'tasks', file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      try {
        fs.writeFileSync(full, buildContent(idNum), { encoding: 'utf-8', flag: 'wx' });
        return { ok: true, id: `TASK-${idNum}` };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          used.add(num); // someone took it; skip and retry with the next free id
          continue;
        }
        throw err;
      }
    }
    return { ok: false, error: 'Could not allocate a unique task id' };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function archiveTask(projectPath: string, taskId: string): { ok: boolean; error?: string } {
  const loc = findTaskFile(projectPath, taskId);
  if (!loc) return { ok: false, error: `Task ${taskId} not found` };
  try {
    const destDir = path.join(projectPath, 'backlog', 'archive', 'tasks');
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(loc.full, path.join(destDir, loc.file));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

const CONFIG_YML = (name: string) =>
  [
    `project_name: "${name}"`,
    'default_status: "To Do"',
    'statuses: ["To Do", "In Progress", "Done"]',
    'labels: []',
    'milestones: []',
    'date_format: yyyy-mm-dd',
    'max_column_width: 20',
    'auto_open_browser: true',
    'default_port: 6420',
    'auto_commit: false',
    'task_prefix: "task"',
    '',
  ].join('\n');

/**
 * Initialize a Backlog.md project in a folder natively - scaffold the directory
 * structure + config.yml. No git or CLI required.
 */
export function initProject(projectPath: string, name: string): { ok: boolean; error?: string } {
  try {
    const root = path.join(projectPath, 'backlog');
    for (const sub of ['tasks', 'completed', 'drafts', 'docs', 'decisions', 'milestones', path.join('archive', 'tasks')]) {
      fs.mkdirSync(path.join(root, sub), { recursive: true });
    }
    const cfg = path.join(root, 'config.yml');
    if (!fs.existsSync(cfg)) fs.writeFileSync(cfg, CONFIG_YML(name || path.basename(projectPath)), 'utf-8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
