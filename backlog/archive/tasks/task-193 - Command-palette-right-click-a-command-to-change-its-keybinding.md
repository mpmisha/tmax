---
id: TASK-193
title: 'Command palette: right-click a command to change its keybinding'
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 11:10'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let users rebind a command's shortcut directly from the command palette via right-click -> Change shortcut -> record keys. Surfaces shortcuts and makes conflicts (e.g. Ctrl+Alt+P) user-fixable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Right-clicking a palette command offers Change shortcut; recording a combo updates and persists the binding
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reworked the rebind UX per feedback: right-click now opens a small menu (Reassign shortcut / Reset to default) instead of jumping straight into capture, and applying a new combo shows a confirm dialog that WARNS when the combo is already bound to another command (prevents silently stealing e.g. Ctrl+Shift+P from the palette).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added right-click-to-rebind to the command palette.

Changes (src/renderer/components/CommandPalette.tsx):
- New PALETTE_ID_TO_ACTION map + actionForCommandId() resolves a palette command id to its bindable keybinding action (handles ids that differ from action names, e.g. backlog->openBacklog, jumpToTerminal->switchTerminalList, splitRight->splitHorizontal). Commands with no bindable action get no rebind option.
- onContextMenu on each palette row opens an inline recording state; the next key combo is captured (Esc cancels) and persisted to config.keybindings via store.updateConfig, mirroring the Settings > Keybindings rebind logic.
- Cross-platform: capture uses isMac ? metaKey : ctrlKey; display uses formatKeyForPlatform().
- Palette rows now display the live effective shortcut (config override merged over DEFAULT_BINDINGS) instead of the static baked-in label, so a rebind shows immediately.
- Added .palette-shortcut.recording style in global.css (reuses the pulse animation).

Typecheck: no new errors in the edited files.
<!-- SECTION:FINAL_SUMMARY:END -->
