---
id: TASK-176
title: Backlog board fills the whole window (remove blank margins/gap)
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 16:42'
updated_date: '2026-06-13 17:08'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-167. In overlay mode the board is a centered 94vw/92vh window leaving dark margins, and the fixed-width kanban columns leave a blank strip after the last column. Make the overlay fill the full window and let columns stretch to fill the width.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Overlay board fills the entire window with no surrounding blank margin
- [x] #2 Kanban columns stretch to fill the available width with no empty strip after the last column
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Overlay board now fills the whole window (100vw/100vh, no centered margin) and kanban columns stretch (flex:1, min-width 300px) so there's no blank strip after the last column. CSS-only.
<!-- SECTION:FINAL_SUMMARY:END -->
