---
id: TASK-146
title: 'Tab bar: floating indicator on tabs whose pane is floating'
status: Done
assignee:
  - '@inrotem'
created_date: '2026-05-09 16:30'
updated_date: '2026-05-09 16:40'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a terminal is in 'floating' mode, the tab in the bar should visually indicate that. Right now there's no per-tab cue, so users have to mentally track which tabs are floating vs tiled. Add a small icon or accent so floating panes are obvious at a glance from the tab bar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tabs whose terminal mode is 'floating' show a visible indicator (icon, dot, or accent) in the tab bar
- [x] #2 The indicator updates live when a pane is moved to/from floating
- [x] #3 Indicator works in both flat tab mode and workspace tab mode
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small SVG floating indicator (corner-arrow style) next to title in TabBar.tsx Tab subcomponent, only when terminal.mode === 'floating'.\n2. Add the same indicator to WorkspaceTabBar.tsx workspace chip when ANY terminal in that workspace has mode === 'floating' (subscribe via terminals selector).\n3. Add CSS styles (.tab-floating-indicator and .workspace-tab-floating-indicator) in global.css near the .tab block.\n4. Tooltip 'Floating pane' (or 'Workspace contains a floating pane' for workspace bar).\n5. Verify no NEW type errors with npx tsc --noEmit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation summary:

- Added tab-floating-indicator (corner-arrow SVG, 10px) to TabBar.tsx rendered when terminal.mode === "floating". Sits between .tab-title and the close button, dim by default, brightens on hover/active.
- Added workspace-tab-floating-indicator to WorkspaceTabBar.tsx. WorkspaceTabBar now subscribes to terminals and computes a floatingByWorkspace Set (memoized on terminals/workspaces/activeWorkspaceId); workspace chips with at least one floating pane in their grid show the indicator. Tooltip "Floating pane".
- Live-update is automatic: indicator is derived from store state both components already subscribe to, so it reacts to moveToFloat/moveToTiling toggles without extra wiring.
- Verified npx tsc --noEmit introduces no new errors (all reported errors pre-date this change).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a small floating-pane indicator in both tab bar variants so users can spot floating panes at a glance.

Changes:
- src/renderer/components/TabBar.tsx: Tab subcomponent now renders a 10px corner-arrow SVG (".tab-floating-indicator") when its terminal.mode === "floating". Tooltip "Floating pane".
- src/renderer/components/WorkspaceTabBar.tsx: WorkspaceTabBar subscribes to terminals and builds a memoized Set of workspace ids with at least one floating pane, passing hasFloatingPane down so each workspace chip can render a matching ".workspace-tab-floating-indicator". Tooltip "Floating pane".
- src/renderer/styles/global.css: Added .tab-floating-indicator and .workspace-tab-floating-indicator rules near the existing .tab / .workspace-tab blocks - dim secondary color by default, accent in focus-border color on hover/active, no layout disruption.

User impact:
- Tabs whose pane is floating now visibly indicate it (corner-arrow icon).
- Indicator updates live when the user toggles a pane to/from float (uses the existing store subscription).
- Works in both flat tab mode and workspace tab mode.

Verification:
- npx tsc --noEmit reports only pre-existing errors; no new diagnostics in the touched files.
<!-- SECTION:FINAL_SUMMARY:END -->
