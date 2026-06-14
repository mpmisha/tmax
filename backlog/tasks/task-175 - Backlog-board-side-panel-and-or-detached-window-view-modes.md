---
id: TASK-175
title: 'Backlog board: side-panel and/or detached-window view modes'
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 16:40'
updated_date: '2026-06-13 17:20'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-167. Let the Backlog board be viewed without covering the panes: as a docked side panel beside the terminal grid and/or popped out into its own detached OS window, so the user can work in panes while watching the board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The board can be shown in a mode that does not cover the terminal panes (side panel and/or detached window)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a docked side-panel view mode so the board can be shown beside the terminal grid (panes shrink) instead of as a full-window overlay. Toggle via the header dock/expand button; mode + panel width persist in tmax-config (backlogDisplayMode, backlogPanelWidth). Resizable via a drag handle on the panel edge. BacklogBoard renders the overlay via a body portal and the panel inline in .main-area. Detached-window mode was not built (side panel chosen). Covered by e2e.

Update: the board now DEFAULTS to the side-panel mode (was overlay), per user request - users expand to full window from the header.
<!-- SECTION:FINAL_SUMMARY:END -->
