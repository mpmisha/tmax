---
id: TASK-231
title: Task detail scrolls as one column (middle content no longer clipped)
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 11:54'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The task detail modal is a fixed-height (86vh) flex column with overflow:hidden and no scrolling region, so a tall task (long body + attached agent output) clipped the middle content. Wrapped the sections between the header and footer in a scrollable container (.backlog-detail-scroll, flex:1, overflow-y:auto) so header/footer stay pinned and everything in between scrolls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Long task detail content scrolls instead of clipping
- [ ] #2 Header and footer stay pinned
<!-- AC:END -->
