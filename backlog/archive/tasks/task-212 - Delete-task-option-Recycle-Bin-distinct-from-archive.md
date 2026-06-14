---
id: TASK-212
title: 'Delete task option (Recycle Bin), distinct from archive'
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:12'
updated_date: '2026-06-14 10:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users wanted a way to remove a task entirely, not just archive it. Added a permanent delete that sends the task file to the OS Recycle Bin/Trash via Electron shell.trashItem (recoverable outside the app). Available from the card context menu, the multi-select bar (bulk), and the task detail. Always confirms first. New IPC BACKLOG_DELETE_TASK + locateTaskFileAnywhere (searches tasks/completed/drafts/archive).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Card context menu has a Delete action separate from Archive
- [x] #2 Delete confirms, then removes the task to the Recycle Bin
- [x] #3 Bulk delete works on a multi-selection
- [x] #4 Delete also available from the task detail
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delete-to-Recycle-Bin added across card menu, multi-select bar, and detail. New IPC BACKLOG_DELETE_TASK uses shell.trashItem; locateTaskFileAnywhere finds the file in tasks/completed/drafts/archive. Always confirms. Renderer hardened to toast (not silently no-op) if the bridge is missing on a stale dev build.
<!-- SECTION:FINAL_SUMMARY:END -->
