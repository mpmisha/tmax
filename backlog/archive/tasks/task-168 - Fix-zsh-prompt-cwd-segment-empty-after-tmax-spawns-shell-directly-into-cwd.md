---
id: TASK-168
title: 'Fix: zsh prompt cwd segment empty after tmax spawns shell directly into cwd'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-21 07:00'
updated_date: '2026-05-24 16:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When tmax spawns a zsh shell with a target cwd, prompt themes that populate their cwd segment from a chpwd hook (oh-my-zsh, p10k variants, etc.) show an empty cwd segment until the user manually cd's. Reported on macOS by Eden Toledano. Confirmed by another user that some prompt themes work fine (e.g. ones using %~ which is lazy-evaluated) - this only affects themes that use chpwd_functions / chpwd to populate their state.

Fix: extended the zsh integration snippet in pty-manager.ts so the injected precmd fires chpwd and chpwd_functions entries exactly once on the first prompt. Guard variable _TMAX_CHPWD_FIRED prevents double-trigger on subsequent prompts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 zsh prompt themes that use chpwd hooks render their cwd segment on the first prompt when tmax spawns a shell directly into a folder
- [x] #2 Themes that use %~ or other lazy patterns continue to work unchanged
- [x] #3 Subsequent prompts after the first don't re-fire chpwd, so themes don't see double-trigger artifacts
- [x] #4 No regression on bash, pwsh, or cmd shell integration
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the zsh precmd injection in pty-manager.ts to fire chpwd + chpwd_functions on first prompt\n2. Guard with _TMAX_CHPWD_FIRED so it only runs once per session
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix landed in pty-manager.ts: the __tmax_precmd snippet now also calls chpwd and walks chpwd_functions on the first prompt, gated by _TMAX_CHPWD_FIRED. Many zsh themes (oh-my-zsh, p10k) populate their cwd segment from chpwd; without an actual cd happening on spawn, the segment was empty. In WIP, awaiting user macOS verification.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed in pty-manager.ts: extended the zsh __tmax_precmd snippet to fire chpwd plus every chpwd_functions entry exactly once on the first prompt, guarded by _TMAX_CHPWD_FIRED. Themes that populate their cwd segment from chpwd (oh-my-zsh, p10k variants) now render the segment on the first prompt when tmax spawns the shell directly into a folder. Themes using %~ or other lazy patterns are unaffected. Guard prevents re-firing on subsequent prompts. bash/pwsh/cmd branches untouched - no cross-shell regression.
<!-- SECTION:FINAL_SUMMARY:END -->
