---
id: TASK-177
title: Backlog project swatch reads as offline status (red dot)
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
Follow-up to TASK-167. The per-project identity color is rendered as a round dot, which users read as a health/online LED (red = offline), but the board has no online/offline concept. Change the swatch to a non-LED shape (rounded square color tag) so it reads as an identity color.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Project color swatch no longer looks like a status indicator dot
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the per-project identity color swatch from a round dot to a rounded square (border-radius 3px) so it no longer reads as an online/offline status LED. CSS-only (.backlog-proj-dot).
<!-- SECTION:FINAL_SUMMARY:END -->
