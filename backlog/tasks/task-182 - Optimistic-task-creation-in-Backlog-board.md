---
id: TASK-182
title: Optimistic task creation in Backlog board
status: Done
assignee: []
created_date: '2026-06-14 06:18'
updated_date: '2026-06-14 06:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creating a task via Add task showed nothing until the CLI write + rescan finished (seconds). Now a placeholder card appears instantly and is replaced on refresh.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New task appears immediately as a pending card
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Optimistic placeholder card (saving…), replaced by real task on refresh; removed on failure.
<!-- SECTION:FINAL_SUMMARY:END -->
