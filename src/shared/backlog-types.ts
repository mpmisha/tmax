// Shared Backlog board types (TASK-167), used by the main-process service,
// the preload bridge, and the renderer view.

export interface BacklogProjectRef {
  name: string;
  path: string;
}

export interface BacklogTask {
  id: string;
  title: string;
  status: string;
  assignee: string[];
  labels: string[];
  priority?: string;
  /** Source filename, e.g. "task-167 - Foo.md". */
  file: string;
  /** Subfolder the file lives in: "tasks" or "completed". */
  sub: string;
  project: BacklogProjectRef;
  /** Last-modified time in ms, for recency sorting. */
  mtime: number;
  created_date?: string;
  updated_date?: string;
}

export interface BacklogTaskDetail {
  frontmatter: Record<string, unknown>;
  body: string;
}
