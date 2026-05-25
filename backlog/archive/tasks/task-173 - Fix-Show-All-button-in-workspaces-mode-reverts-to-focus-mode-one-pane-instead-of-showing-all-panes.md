---
id: TASK-173
title: >-
  Fix: 'Show All' button in workspaces mode reverts to focus mode (one pane)
  instead of showing all panes
status: Done
assignee:
  - '@claude'
created_date: '2026-05-21 17:30'
updated_date: '2026-05-22 15:35'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When 'Show Selected' filter is active in workspaces mode and the user clicks 'Show All', they expect to see every pane in the workspace tiled in a grid. Instead, the layout drops back to focus mode (single pane visible). Bug surfaced 2026-05-21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking 'Show All' from a 'Show Selected' grid switches to a grid containing every pane in the workspace, not focus mode
- [x] #2 There is a separate way to return to focus/tabs view (existing 'Switch to tabs' button or equivalent)
- [x] #3 Behavior is consistent with the button label - 'Show All' shows all panes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rewire showAllPanes() in terminal-store.ts so it builds a grid of ALL panes in the workspace instead of reverting to focus mode\n2. Preserve preGridRoot so 'Switch to tabs' still exits the grid back to focus\n3. Fall back to old restore-focus behavior if the workspace only has 1 pane\n4. Clear selectedTerminalIds on widen so the multi-selected indicators don't linger
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Toggle-state bug follow-up (2026-05-22)

User reported: after Show Selected -> Show All -> re-select panes, the toolbar wrongly says "Show All" even though all panes are visible. Root cause: my widened-grid path left preGridRoot set (correct, needed for "Switch to tabs"), so the old `isFilterActive = grid && preGridRoot && selectionCount>=2` check false-positived once the user re-selected.

Fix:
- terminal-store.ts showAllPanes: stop clearing selectedTerminalIds on widen so toggle stays usable.
- WorkspaceTabBar.tsx: replace isFilterActive with a STRICT-SUBSET check (gridTabCount > 0 && gridTabCount < workspacePaneCount). When all panes are in the grid the toolbar now shows "Show Selected (N)" instead of "Show All".
- WorkspaceTabBar.tsx: widen the wrapper visibility from `selectionCount>=2` to `selectionCount>=2 || isFilterActive` so a user who clears selection mid-filter still has a way to exit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewired showAllPanes() in terminal-store.ts to build a grid of every tiled pane in the active workspace, matching the button label. preGridRoot is preserved so the existing 'Switch to tabs' button still returns to focus mode. When the workspace only has one pane (degenerate case), the function falls back to restoring focus mode the old way. selectedTerminalIds is cleared on the widen so per-pane selected indicators don't linger past the transition.
<!-- SECTION:FINAL_SUMMARY:END -->
