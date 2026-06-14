---
id: TASK-234
title: Drag-to-Archived column doesn't really archive (lingers after hide)
status: Done
assignee: []
created_date: '2026-06-14 12:03'
updated_date: '2026-06-14 12:26'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dragging a task onto the synthetic Archived column calls editTask with status=Archived, which only writes the frontmatter status and leaves the file in tasks/. The scanner then always shows it as Archived regardless of the show-archived toggle, so the Archived column persists with that task even after hiding archived. Fix: changeStatus should call archiveTask (move to archive/tasks) when the target status is Archived.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dropping a task on the Archived column moves it to archive/tasks
- [x] #2 After hiding archived, the column and task are gone
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
changeStatus now routes a drop on the Archived column to archiveTask (real move to archive/tasks) instead of writing status:Archived in place, so it disappears when archived is hidden.
<!-- SECTION:FINAL_SUMMARY:END -->
