---
id: TASK-194
title: >-
  PR #133 prompt composer: Ctrl+Alt+P conflicts with Windows; needs a free
  default
status: Done
assignee: []
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 09:00'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The merged prompt-composer PR binds Ctrl+Alt+P, which is reserved by Windows (People app) for some users. Pick a free default (e.g. Ctrl+Alt+O) and/or rely on the rebinding UX. This is a change the PR needs before merging upstream.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prompt composer default shortcut does not collide with a common OS shortcut
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved: changed the prompt-composer default from Ctrl+Alt+P (reserved by Windows People) to Ctrl+Alt+C across useKeybindings, CommandPalette, ShortcutsHelp, and the pane menu label.
<!-- SECTION:FINAL_SUMMARY:END -->
