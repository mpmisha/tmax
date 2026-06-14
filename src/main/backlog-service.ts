// Native Backlog.md aggregation service (TASK-167).
//
// Replaces the standalone "backlog-hub" app: reads Backlog.md task markdown
// directly off disk across several configured project folders (fast, no CLI),
// and shells out to the `backlog` CLI only for writes (status/title/AC/create/
// archive) so the YAML round-trips exactly the way the CLI expects.
//
// The frontmatter parser is ported from backlog-hub's src/server.ts so behavior
// (block scalars used for quoted titles, block lists for assignee/labels) stays
// identical.

import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC } from '../shared/ipc-channels';
import type { BacklogProjectRef, BacklogTask, BacklogTaskDetail } from '../shared/backlog-types';
// Write operations live in backlog-writer.ts (pure, CLI-free, testable).
import { editTask, createTask, archiveTask, initProject, locateTaskFileAnywhere } from './backlog-writer';
import type { EditPayload, CreatePayload } from './backlog-writer';

// ── Frontmatter parsing (ported from backlog-hub) ────────────────────

function unquote(v: string): string {
  const t = v.trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseTaskFrontmatter(content: string): Record<string, any> | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const out: Record<string, any> = {};
  let listKey: string | null = null;
  let listAcc: string[] = [];
  const flushList = () => {
    if (listKey !== null) {
      out[listKey] = listAcc;
      listKey = null;
      listAcc = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (listItem && listKey !== null) {
      listAcc.push(unquote(listItem[1]));
      continue;
    }
    flushList();
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawVal = kv[2];
    const blockScalar = rawVal.match(/^([>|])([-+]?)\s*$/);
    if (blockScalar) {
      const style = blockScalar[1]; // '>' folded, '|' literal
      const chomp = blockScalar[2]; // '-' strip, '+' keep, '' clip
      const contentLines: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next === '' || /^\s/.test(next)) {
          contentLines.push(next);
          i++;
        } else {
          break;
        }
      }
      let indent = 0;
      for (const cl of contentLines) {
        if (cl.trim() !== '') {
          const m2 = cl.match(/^(\s*)/);
          indent = m2 ? m2[1].length : 0;
          break;
        }
      }
      const stripped = contentLines.map((cl) =>
        cl.length >= indent ? cl.slice(indent) : cl.replace(/^\s*/, ''),
      );
      let value: string;
      if (style === '|') {
        value = stripped.join('\n');
      } else {
        const parts: string[] = [];
        let buf = '';
        for (const sl of stripped) {
          if (sl === '') {
            if (buf) {
              parts.push(buf);
              buf = '';
            }
            parts.push('');
          } else {
            buf = buf ? buf + ' ' + sl : sl;
          }
        }
        if (buf) parts.push(buf);
        value = '';
        for (let p = 0; p < parts.length; p++) {
          if (parts[p] === '') {
            value += '\n';
          } else {
            if (value && !value.endsWith('\n')) value += ' ';
            value += parts[p];
          }
        }
      }
      if (chomp !== '+') {
        value = value.replace(/\n+$/, '');
      }
      out[key] = value;
    } else if (rawVal === '' || rawVal === undefined) {
      listKey = key;
      listAcc = [];
    } else if (rawVal.trim() === '[]') {
      out[key] = [];
    } else {
      out[key] = unquote(rawVal);
    }
  }
  flushList();
  return out;
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((s) => s.length > 0);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

// ── Task scanning (reads) ────────────────────────────────────────────

const TASK_SUBDIRS = ['tasks', 'completed'] as const;

async function scanProject(
  project: BacklogProjectRef,
  includeArchived = false,
): Promise<BacklogTask[]> {
  const tasks: BacklogTask[] = [];
  const subs = includeArchived ? [...TASK_SUBDIRS, 'archive/tasks'] : [...TASK_SUBDIRS];
  for (const sub of subs) {
    const dir = path.join(project.path, 'backlog', sub);
    let entries: string[];
    try {
      entries = await fs.promises.readdir(dir);
    } catch {
      continue; // project may not have this subdir
    }
    // Read files within a dir concurrently so the main-process event loop
    // isn't blocked serially scanning many archived markdown files (TASK-216).
    const parsed = await Promise.all(
      entries
        .filter((file) => file.endsWith('.md'))
        .map(async (file): Promise<BacklogTask | null> => {
          const full = path.join(dir, file);
          let content: string;
          let mtime = 0;
          try {
            const stat = await fs.promises.stat(full);
            mtime = stat.mtimeMs;
            content = await fs.promises.readFile(full, 'utf-8');
          } catch {
            return null;
          }
          const fm = parseTaskFrontmatter(content);
          if (!fm) return null;
          // Archived tasks group under a synthetic "Archived" status so they land
          // in their own column rather than mixing back into the live workflow.
          // Files in completed/ are Done even if the frontmatter predates the move.
          const isArchived = sub === 'archive/tasks';
          const status = isArchived
            ? 'Archived'
            : String(fm.status || (sub === 'completed' ? 'Done' : 'To Do'));
          return {
            id: String(fm.id || file.replace(/\.md$/, '')),
            title: String(fm.title || file.replace(/\.md$/, '')),
            status,
            assignee: asArray(fm.assignee),
            labels: asArray(fm.labels),
            priority: fm.priority ? String(fm.priority) : undefined,
            file,
            sub,
            project: { name: project.name, path: project.path },
            mtime,
            created_date: fm.created_date ? String(fm.created_date) : undefined,
            updated_date: fm.updated_date ? String(fm.updated_date) : undefined,
          };
        }),
    );
    for (const t of parsed) {
      if (t) tasks.push(t);
    }
  }
  return tasks;
}

async function listAllTasks(
  projects: BacklogProjectRef[],
  includeArchived = false,
): Promise<BacklogTask[]> {
  const perProject = await Promise.all(
    projects
      .filter((p) => p && p.path)
      .map((p) => scanProject(p, includeArchived)),
  );
  const all: BacklogTask[] = [];
  for (const list of perProject) all.push(...list);
  return all;
}

// Subdirs getTask is allowed to read from (includes archive so the board can
// open archived task detail when "show archived" is on).
const READ_SUBDIRS = [...TASK_SUBDIRS, 'archive/tasks'];

function getTask(projectPath: string, sub: string, file: string): BacklogTaskDetail | null {
  // Guard against path traversal - sub must be a known subdir and file a bare name.
  if (!READ_SUBDIRS.includes(sub)) return null;
  if (file.includes('/') || file.includes('\\') || file.includes('..')) return null;
  const full = path.join(projectPath, 'backlog', sub, file);
  let content: string;
  try {
    content = fs.readFileSync(full, 'utf-8');
  } catch {
    return null;
  }
  const fm = parseTaskFrontmatter(content) || {};
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  return { frontmatter: fm, body };
}

// ── IPC wiring ───────────────────────────────────────────────────────

export function registerBacklogHandlers(): void {
  ipcMain.handle(IPC.BACKLOG_LIST_TASKS, async (_e, projects: BacklogProjectRef[], includeArchived?: boolean) => {
    try {
      return await listAllTasks(projects || [], !!includeArchived);
    } catch (err) {
      console.error('[backlog] listTasks failed:', err);
      return [];
    }
  });

  ipcMain.handle(
    IPC.BACKLOG_GET_TASK,
    async (_e, projectPath: string, sub: string, file: string) => {
      return getTask(projectPath, sub, file);
    },
  );

  ipcMain.handle(IPC.BACKLOG_EDIT_TASK, async (_e, payload: EditPayload) => {
    return editTask(payload);
  });

  ipcMain.handle(IPC.BACKLOG_CREATE_TASK, async (_e, payload: CreatePayload) => {
    return createTask(payload);
  });

  ipcMain.handle(
    IPC.BACKLOG_INIT_PROJECT,
    async (_e, projectPath: string, name: string) => {
      return initProject(projectPath, name);
    },
  );

  ipcMain.handle(
    IPC.BACKLOG_ARCHIVE_TASK,
    async (_e, projectPath: string, taskId: string) => {
      return archiveTask(projectPath, taskId);
    },
  );

  // Permanent delete (distinct from archive): send the task file to the OS
  // Recycle Bin / Trash so it's removed from the backlog but still recoverable
  // outside the app if the user deleted it by mistake.
  ipcMain.handle(
    IPC.BACKLOG_DELETE_TASK,
    async (_e, projectPath: string, taskId: string) => {
      const loc = locateTaskFileAnywhere(projectPath, taskId);
      if (!loc) return { ok: false, error: `Task ${taskId} not found` };
      try {
        await shell.trashItem(loc.full);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
  );

  // Validate that a folder looks like a Backlog.md project (has backlog/).
  ipcMain.handle(IPC.BACKLOG_VALIDATE_PROJECT, async (_e, projectPath: string) => {
    try {
      const stat = fs.statSync(path.join(projectPath, 'backlog'));
      return { ok: stat.isDirectory() };
    } catch {
      return { ok: false };
    }
  });
}
