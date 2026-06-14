---
id: TASK-197
title: Surface the global show/hide tmax keyboard shortcut to users
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 10:33'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most users won't discover the keyboard shortcut to summon/show tmax. Find a way to surface it (first-run hint, status-bar tip, settings, tray tooltip, etc.).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New users are made aware of the show/hide tmax shortcut through at least one discoverable surface
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Surfaced the global show/hide-tmax hotkey in the Keyboard Shortcuts help dialog.

The global OS-level hotkey is config.showWindowHotkey (default CommandOrControl+Shift+Space), registered via globalShortcut in src/main/main.ts. It was already editable in Settings > Terminal > System but undocumented in the shortcuts list, so users couldnt discover it.

Changes (src/renderer/components/ShortcutsHelp.tsx):
- New "Global (works anywhere)" section reads the configured showWindowHotkey from the store (falls back to the default) and renders it read-only, with a pointer to change it in Settings > Terminal > System.
- Added a displayAccelerator() helper to format the Electron accelerator string (CommandOrControl/Alt/Shift) for display, cross-platform (Cmd/Win/Ctrl, mac glyphs via isMac).

No main-process changes; the hotkey registration was left untouched. Typecheck: no new errors.
<!-- SECTION:FINAL_SUMMARY:END -->
