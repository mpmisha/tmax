---
id: TASK-167
title: >-
  Fix: Default Start Folder doesn't expand ~ on Mac/Linux, makes the setting
  look broken
status: Done
assignee:
  - '@claude'
created_date: '2026-05-20 10:58'
updated_date: '2026-05-24 16:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reporter on macOS set Default Start Folder to '/repos' (or '~/repos') and tmax silently falls back to homedir because existsSync() doesn't expand a leading tilde and there's no '/repos' at filesystem root. Confirmed by a second user. Reporter is firefighting a sev2 and gave InbarR the full-path workaround (/Users/<user>/repos) in the meantime.

Fixed in this commit by expanding leading ~ in pty-manager.ts cwd validation, plus updating the Settings placeholder to suggest ~/repos on non-Windows and clarifying in the description that ~ is expanded.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Default Start Folder accepts ~ or ~/subpath and resolves to the user's home folder on Mac and Linux
- [x] #2 Settings placeholder is platform-aware: shows ~/repos on Mac/Linux, C:\Projects on Windows
- [x] #3 Backslash-style tilde paths (~\repos) also work on Windows for parity
- [x] #4 Falls back to homedir() if the expanded path still doesn't exist (no regression in current fallback behavior)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Expand a leading ~ in PtyManager.create() opts.cwd before existsSync check\n2. Update Settings.tsx Default Start Folder placeholder to platform-aware example\n3. Tighten the description text to mention ~ expansion
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix landed in pty-manager.ts create(): ~ / ~/ / ~\ get expanded to homedir before the existsSync check. Also updated Settings.tsx placeholder + description to mention ~ expansion. Still in WIP - bundled with the wider 2026-05-21 swap batch.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed in pty-manager.ts: a leading ~, ~/, or ~\ in opts.cwd is now expanded to homedir() before the existsSync check, so users can type ~/repos in Settings → Default Start Folder on Mac/Linux without having to spell out the full home path. Existing homedir() fallback for missing paths preserved (no regression). Settings.tsx placeholder is now platform-aware (~/repos on Mac/Linux, C:\Projects on Windows) and the description mentions ~ expansion.
<!-- SECTION:FINAL_SUMMARY:END -->
