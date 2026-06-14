---
id: TASK-232
title: 'Un-archive: moving an archived task to a status restores it'
status: Archived
assignee:
  - '@myself'
created_date: '2026-06-14 11:54'
updated_date: '2026-06-14 14:58'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Archived tasks shown via show-archived could not be moved to another status - editTask only located files in tasks/completed, so status changes on an archived task failed. Now editTask locates tasks anywhere (incl. archive) and, when an archived task is given a real non-Archived status (drag to a column or Move-to menu), moves the file back to backlog/tasks/ as part of the edit, restoring it to the active board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dragging an archived task to a column un-archives it and sets that status
- [ ] #2 Move-to menu on an archived task restores it
<!-- AC:END -->
