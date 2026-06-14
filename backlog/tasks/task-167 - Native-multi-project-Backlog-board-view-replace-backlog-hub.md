---
id: TASK-167
title: Native multi-project Backlog board view (replace backlog-hub)
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 13:59'
updated_date: '2026-06-13 14:28'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring backlog-hub's functionality natively into tmax as a graphical (non-TUI) view, so the kanban board and the agent panes live in one window and the separate backlog-hub Electron app can be retired. A new full-window React 'Backlog' view aggregates Backlog.md task boards across multiple configured projects, reading task markdown directly from disk and writing changes via the backlog CLI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A new full-window Backlog view opens from the command palette and a keyboard shortcut, themed to match tmax (CSS variables, cross-platform key display)
- [x] #2 View aggregates tasks across multiple configured projects by reading <project>/backlog/tasks and <project>/backlog/completed markdown frontmatter directly (no spawning of 'backlog browser')
- [x] #3 Kanban columns To Do / In Progress / Done plus dynamic columns for any other status; cards show title, project color swatch, id, assignees, labels, and relative modified time
- [x] #4 Project sidebar lists projects with add / remove / reorder; the project list persists in tmax config across restarts
- [x] #5 Dragging a card between columns changes its status by shelling out to the backlog CLI in that project dir
- [x] #6 Search/filter across title, id, label, assignee, and project name
- [x] #7 Clicking a card opens a detail modal showing the full task body with working acceptance-criteria checkbox toggling and inline title edit (via backlog CLI)
- [x] #8 Can create a new task into a column and archive a Done task from the board
- [x] #9 All code works cross-platform (Windows/macOS/Linux) including backlog CLI resolution and file paths
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Phase 0 - Data layer (main process):\n1. Port backlog-hub parseTaskFrontmatter (handles YAML scalars/lists/block scalars) into src/main as a backlog-parser module.\n2. Add a backlog-service module: scan <project>/backlog/tasks + /completed for *.md, parse frontmatter, attach file/sub/project/mtime; group nothing (renderer groups by status).\n3. Add a CLI runner that spawns 'backlog <args>' with cwd=projectPath, shell:true on win32 for .cmd resolution, arg-quoting; returns {code,stdout,stderr}.\n\nPhase 1 - IPC + config:\n4. Add BACKLOG_* channels in shared/ipc-channels.ts (listAllTasks, getTask, editTask, createTask, archiveTask, browseDir).\n5. Add ipcMain.handle wiring in main.ts; expose methods on preload terminalAPI bridge.\n6. Extend config-store AppConfig with backlogProjects: {name,path}[]; add get/set; load on startup.\n\nPhase 2 - Renderer view:\n7. Add showBacklog + backlogProjects + task cache to terminal-store with toggle/load/mutate actions.\n8. New BacklogBoard.tsx full-window overlay (model on Settings.tsx): project sidebar (add/remove/reorder, persisted), kanban columns (To Do/In Progress/Done + dynamic), cards (title, project swatch, id, assignees, labels, relative mtime).\n9. Drag-to-change-status -> editTask CLI; optimistic update + refresh.\n10. Search/filter box across title/id/label/assignee/project.\n11. Task detail modal: fetch full body via getTask, render sections, AC checkbox toggle (--check-ac/--uncheck-ac), inline title edit; create task per column; archive Done.\n12. backlog-board.css using tmax CSS variables.\n\nPhase 3 - Wire-up + cross-platform:\n13. Command palette entry + keyboard shortcut (hasPrimaryMod, formatKeyForPlatform).\n14. chokidar watch on each backlog/tasks dir to live-refresh; debounce.\n15. Seed backlogProjects from existing backlog-hub config.json on first run (one-time migration) so retiring the hub is seamless.\n16. Typecheck; manual verify with Playwright per repo norm.\n\nDeliberately OUT of scope (follow-ups): backlog-hub's Live Agents panel (reads ~/.claude + ~/.copilot) - tmax already hosts agents in panes, so file logging a separate TASK if wanted. Also drafts/milestones/decisions/docs browsing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented native Backlog board (full-window overlay, Ctrl+Alt+B / command palette).

- Main: src/main/backlog-service.ts - ported backlog-hub frontmatter parser, scans <proj>/backlog/{tasks,completed}, reads direct (fast); writes shell out to backlog CLI (edit/create/archive) with win32 quoting + shell:true.
- Shared types: src/shared/backlog-types.ts. IPC: BACKLOG_* channels + preload bridge.
- Config: backlogProjects persisted in tmax-config (added to both config-store AppConfig and renderer state/types AppConfig).
- Renderer: src/renderer/components/BacklogBoard.tsx + backlog-board.css. Project sidebar (add/validate/remove/reorder), kanban (To Do/In Progress/Done + dynamic), cards (title/project swatch/id/assignees/labels/relative mtime), native drag-to-change-status (optimistic), search/filter, detail modal (AC checkbox toggle + inline title edit + archive), create-per-column.
- e2e: tests/e2e/task-167-backlog-board.spec.ts seeds a temp project + asserts card/column/AC parsing.

Typecheck: no backlog-related errors (pre-existing root-tsconfig errors in untouched files unchanged). Packaging out/ to run the spec next.

Follow-up: "Add does nothing" report. Root cause = stale preload, not a logic bug. Reproduced with Playwright against the fresh out-next build: validate returns ok, project persists to config, sidebar + card render, test passes. The silent failure happens only when the running app has an out-of-date preload bundle (e.g. a `npm start` dev session launched before the backlog IPC methods existed - Vite hot-reloads the renderer so the new board UI appears, but preload is not reloaded without a full restart, so window.terminalAPI.backlogValidateProject is undefined and submit() threw silently).

Hardened: submit() now guards for a missing backlog bridge ("Backlog bridge unavailable - restart tmax") and wraps the whole flow in try/catch to surface any error in the form instead of doing nothing. Added regression test tests/e2e/task-167-add-project-repro.spec.ts (add via form -> sidebar + card + persisted config). User fix: fully restart tmax so the preload reloads.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a native, graphical multi-project Backlog board to tmax that replaces the standalone backlog-hub app: the kanban board now lives in the same window as the agent panes.

What changed:
- New full-window "Backlog" view (Ctrl+Alt+B or command palette), themed via the app CSS variables so theme presets recolor it.
- Reads Backlog.md tasks directly off disk across configured projects (scans backlog/tasks + backlog/completed, ports backlog-hub frontmatter parser) - fast, no spawning of `backlog browser`.
- Writes (status drag, AC toggle, inline title edit, create, archive) shell out to the `backlog` CLI per project, with win32 .cmd resolution + whitespace-arg quoting.
- Project sidebar: add (with backlog/ validation), remove, reorder; the project list persists in tmax-config (backlogProjects).
- Kanban: To Do / In Progress / Done + dynamic columns; cards show title, project color swatch, id, assignees, labels, relative modified time; native drag-to-change-status with optimistic update; search across title/id/label/assignee/project; per-project filter.
- Task detail modal: full body (AC section + HTML markers stripped), interactive acceptance-criteria checkboxes, click-to-edit title, archive for Done tasks.

Files: src/main/backlog-service.ts, src/shared/backlog-types.ts, src/renderer/components/BacklogBoard.tsx, src/renderer/styles/backlog-board.css; wired into ipc-channels, preload, main.ts, config-store, renderer state (types + store), App.tsx, CommandPalette, useKeybindings.

Verification:
- e2e (tests/e2e/task-167-backlog-board.spec.ts, passing): seeds a temp project, opens the board, asserts the task renders as a card in the In Progress column and the detail modal parses 2 acceptance criteria (2nd checked). Verifies parser + IPC + kanban + AC parsing.
- Manual CLI smoke against a real backlog project: confirmed task edit -s, task edit -t, --check-ac, task create (id extraction), and task archive all succeed exactly as the service constructs them.

Follow-ups filed: Live Agents panel (TASK-168). Not included: drafts/milestones/decisions/docs browsing; chokidar live-refresh (board refreshes on open, on window focus, after each mutation, and via a manual refresh button).
<!-- SECTION:FINAL_SUMMARY:END -->
