---
id: TASK-216
title: Show-archived first toggle briefly freezes the board
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 10:13'
updated_date: '2026-06-14 10:31'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First click on the show-archived toggle froze the UI for a few seconds. Likely the synchronous fs scan of backlog/archive/tasks on the main process (readFileSync per file) blocking, with no visible loading state on the toggle. Consider async/streamed reads or a spinner; cache the archive scan.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Toggling show-archived does not visibly freeze the UI
- [x] #2 A loading indicator shows while archived tasks load
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Archive scan no longer blocks the main process: scanProject/listAllTasks are now async, reading dir entries with fs.promises.readdir and parsing files concurrently via Promise.all (fs.promises.stat/readFile). The BACKLOG_LIST_TASKS handler awaits the result. BacklogTask shape and archived status='Archived' are unchanged. The archive toggle now shows a loading state: while a refresh is in flight it is disabled, sets aria-busy, and gets a 'busy' class that pulses the icon (new CSS, plus a :disabled style). Verified: tsc --noEmit clean for backlog-service.ts and BacklogBoard.tsx.
<!-- SECTION:FINAL_SUMMARY:END -->
