---
id: TASK-172
title: 'Fix: Ctrl+Shift+W closes only focused pane when multiple panes are selected'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-21 17:25'
updated_date: '2026-05-22 15:35'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the user multi-selects panes (Ctrl-click in the tab bar or pane area) and presses Ctrl+Shift+W, only the focused pane closes - the other selected panes stay open. Expected: close all selected panes, mirroring the Close behavior in the tab context menu (TabContextMenu.tsx:443-451 already does this correctly). Bug surfaced 2026-05-21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ctrl+Shift+W with multi-selection closes every selected pane plus the focused pane (union)
- [x] #2 Ctrl+Shift+W with no selection closes just the focused pane (current behavior)
- [x] #3 Selection is cleared after the multi-close completes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mirror TabContextMenu close logic in useKeybindings.ts closeTerminal case\n2. Compute ids = union(selectedTerminalIds, focusedId)\n3. Clear selection then sequentially close each\n4. Verify with typecheck
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed useKeybindings.ts closeTerminal case to mirror TabContextMenu's multi-select close behavior. When selectedTerminalIds is non-empty, closes the union of selected+focused panes; otherwise closes just the focused pane (unchanged behavior when no selection). Selection is cleared before the async close loop so the UI doesn't show stale selection state mid-close.
<!-- SECTION:FINAL_SUMMARY:END -->
