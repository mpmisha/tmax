---
id: TASK-235
title: 'Polish from diff review: palette conflict label, dead code, ping debounce'
status: Done
assignee: []
created_date: '2026-06-14 12:03'
updated_date: '2026-06-14 12:26'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the session bug-review subagent: (1) palette rebind conflict dialog showed raw action name commandPalette - added ACTION_LABELS friendly map; (2) removed dead IMG_EXT_RE constant in BacklogBoard; (3) gave the backlog-update ping its own debounce ref so it and the status ping don't block each other.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Conflict dialog shows friendly command names
- [x] #2 Dead code removed
- [x] #3 Ping buttons have independent debounce
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Palette conflict dialog uses friendly ACTION_LABELS; removed dead IMG_EXT_RE; backlog-update ping has its own backlogPingInFlightRef.
<!-- SECTION:FINAL_SUMMARY:END -->
