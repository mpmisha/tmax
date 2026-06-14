---
id: TASK-184
title: Initialize a new Backlog project from a folder without one
status: Done
assignee: []
created_date: '2026-06-14 06:18'
updated_date: '2026-06-14 06:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adding a folder (or current dir) that has no backlog/ now offers to initialize one (git init if needed + backlog init), so users can scaffold a board from any folder.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Adding a folder without backlog/ offers to initialize and, on confirm, creates and adds it
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
backlog-service initProject (git init if no .git, then backlog init with non-interactive flags); BACKLOG_INIT_PROJECT IPC; addOrInit shared by form + add-current-dir with a confirm.
<!-- SECTION:FINAL_SUMMARY:END -->
