---
id: TASK-196
title: Backlog Browse opens Documents instead of the pane cwd
status: Done
assignee: []
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 09:00'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Despite passing defaultPath (focused pane cwd, with projects-parent fallback) and normalizing+existence-checking it in the main handler, the folder dialog still opens at OneDrive Documents for the user. A diagnostic toast was added to confirm whether the renderer passes the right path (likely a stale main process, since the handler is main-side and doesn't hot-reload). Confirm root cause and fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Browse opens at the focused pane's directory (or projects' parent) on a freshly launched build
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved. Root cause was a stale main process (the dialog defaultPath handler is main-side and doesn't hot-reload). A diagnostic toast confirmed the renderer passes the correct pane cwd; hardened the main handler (path.normalize + existence check) with a projects-parent fallback. Works on a freshly launched build.
<!-- SECTION:FINAL_SUMMARY:END -->
