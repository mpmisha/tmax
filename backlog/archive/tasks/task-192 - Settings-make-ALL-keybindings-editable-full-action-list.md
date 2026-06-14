---
id: TASK-192
title: 'Settings: make ALL keybindings editable (full action list)'
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 09:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Settings > Keybindings tab only lists config.keybindings (~36 default entries), but there are ~68 bound actions in useKeybindings DEFAULT_BINDINGS. The rest (incl. new ones like openBacklog, promptComposer) aren't shown/rebindable in the UI - only via the keybindings.json file. Show all actions with friendly labels so any shortcut can be changed in Settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every bound action appears in Settings > Keybindings with a friendly label and is rebindable
- [x] #2 Search finds all actions; unbound actions can be assigned a key
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Exported DEFAULT_BINDINGS; rewrote KeybindingsSettings to list every action (merged defaults + config) with its effective key, rebindable by action. Unbound actions are assignable; Esc cancels recording.
<!-- SECTION:FINAL_SUMMARY:END -->
