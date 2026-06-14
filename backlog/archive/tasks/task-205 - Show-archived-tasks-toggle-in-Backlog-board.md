---
id: TASK-205
title: Show archived tasks toggle in Backlog board
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 09:55'
updated_date: '2026-06-14 09:57'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users could archive tasks but had no way to view them in the board (archive moved files to backlog/archive/tasks which the scanner ignored). Added a header toggle that re-scans including archive/tasks; archived tasks group under a pinned far-right 'Archived' column. getTask now reads the archive subdir so detail opens too.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Header toggle shows/hides archived tasks
- [x] #2 Archived tasks appear in a pinned 'Archived' column on the right
- [x] #3 Clicking an archived card opens its detail
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a header toggle (🗄) to the Backlog board that re-scans including backlog/archive/tasks. Archived tasks get a synthetic 'Archived' status and group into a column pinned to the far right. backlogListTasks(projects, includeArchived) threads through IPC/preload/renderer; getTask now reads the archive subdir so archived detail opens. Builds clean (out-next); ships next release.
<!-- SECTION:FINAL_SUMMARY:END -->
