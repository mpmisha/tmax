---
id: TASK-204
title: Add task opens the task detail so a description can be added
status: Done
assignee: []
created_date: '2026-06-14 09:45'
updated_date: '2026-06-14 09:45'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When creating a task via '+ Add task', after typing the title it should open the new task's detail window so the user can immediately add a description / acceptance criteria - rather than only creating a title-only card.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Creating a task via + Add task opens its detail window for adding a description
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
createTaskOptimistic now re-scans after create and opens the new task's detail (setSelected) so the description/AC can be added right away. Flow: + Add task -> type title -> Enter -> task created + detail opens.
<!-- SECTION:FINAL_SUMMARY:END -->
