---
id: TASK-179
title: 'Backlog side panel: dock right, side toggle, resizable+collapsible sidebar'
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 17:14'
updated_date: '2026-06-13 17:20'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-175. The docked Backlog panel should default to the right side with a header toggle to move it left/right. The internal project-sidebar / board splitter should be draggable to resize and collapsible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Docked panel defaults to the right side and can be toggled between left and right; side persists
- [x] #2 Outer panel resize handle sits on the inner edge for the current side and resizes the panel
- [x] #3 The project-sidebar/board splitter is draggable to resize the sidebar width
- [x] #4 The project sidebar can be collapsed and re-expanded via a control on the splitter
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The docked Backlog panel now defaults to the RIGHT side and the board opens as a side panel by default (expandable to full window from the header). Header gains a side-toggle (left/right, like other dockable UI); side + mode + widths persist in tmax-config.

- Side switching uses CSS `order` on the .main-area flex row, so the panel flips left/right without moving in the DOM. The outer resize handle moves to the panel inner edge per side and resizes correctly in both directions.
- The project-sidebar / board divider is a draggable splitter (resize 140-420px) with a collapse chevron to hide/show the project sidebar.
- Default backlogDisplayMode changed overlay -> panel.

Files: BacklogBoard.tsx (side toggle, SidebarSplitter, side-aware PanelResizeHandle, sidebar wrap + collapse state), backlog-board.css (order-based sides, splitter/collapse styles), config-store.ts + state/types.ts (backlogPanelSide). Covered by e2e task-172-175 (panel default, side-right, collapse/expand).
<!-- SECTION:FINAL_SUMMARY:END -->
