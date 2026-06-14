---
id: TASK-172
title: Right-click context menu on Backlog task cards
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 16:39'
updated_date: '2026-06-13 17:09'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-167. Add a right-click context menu to task cards in the Backlog board for quick actions without opening the detail modal (move status, copy id/title, reveal file, archive, open details). Reuses the existing .context-menu styles.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Right-clicking a task card opens a context menu at the cursor, dismissed by outside-click or Esc, clamped to the viewport
- [x] #2 Menu can change the task status (move to To Do / In Progress / Done) via the backlog CLI, with the current status indicated
- [x] #3 Menu offers Open details, Copy task ID, Copy title, Reveal task file in folder, and Archive
- [x] #4 Menu is keyboard/cross-platform safe and styled consistently with tmax's existing context menus
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Right-click a task card to open a context menu (reuses the app .context-menu styles, portaled to body, outside-click/Esc dismiss, viewport-clamped). Actions: Open details, Move to ▸ (status submenu with current marked, writes via backlog CLI), Copy ID, Copy title, Reveal task file (fileReveal), Archive.

Also fixed a UX bug found while testing: pressing Esc to dismiss the menu used to close the whole board, because BacklogBoard and the menu both listen for Esc on document in capture phase. BacklogBoard now defers when a menu is open. Covered by e2e task-172-175-card-menu-and-panel.spec.ts.
<!-- SECTION:FINAL_SUMMARY:END -->
