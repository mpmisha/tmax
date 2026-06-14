---
id: TASK-222
title: Collapse the Backlog side panel to the window edge
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:31'
updated_date: '2026-06-14 11:10'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In docked side-panel mode, add a collapse control that tucks the whole Backlog panel against the window edge (left/right per panelSide), mirroring the projects-sidebar collapse handle inside the backlog. A thin tab/handle on the edge re-expands it. Persist collapsed state. Screenshots 2026-06-14 show the desired edge handle.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Backlog side panel can collapse to the window edge
- [x] #2 A handle on the edge re-expands it
- [x] #3 Collapsed state persists across reopen
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Docked Backlog panel can collapse to a thin edge strip (26px) with a vertical 'Backlog' label + arrow; clicking it re-expands. Collapse button added to the header (panel mode); state persists via config.backlogPanelCollapsed. Strip honors panelSide (left/right).
<!-- SECTION:FINAL_SUMMARY:END -->
