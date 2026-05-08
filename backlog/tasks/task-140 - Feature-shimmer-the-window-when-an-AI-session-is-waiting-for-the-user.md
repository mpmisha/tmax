---
id: TASK-140
title: 'Feature: shimmer the window when an AI session is waiting for the user'
status: To Do
assignee: []
created_date: '2026-05-08 08:40'
labels:
  - enhancement
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Requested in https://github.com/InbarR/tmax/issues/98 by @ofek01001. When a Claude Code or Copilot session is paused waiting for user input/approval, the user wants a subtle visual cue on the tmax window itself (shimmer / pulse / glow) so they notice from another monitor without having to alt-tab. Native AI session notifications (toast) already exist; this is a complementary in-window cue for users who silence notifications.\n\nDesign considerations: must be subtle (not flashy), respect prefers-reduced-motion, and turn off automatically once the session is no longer waiting (status changes back to active or idle).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When any AI session in any visible workspace transitions to 'waiting for user', the window shows a subtle shimmer / pulse on the title bar or border
- [ ] #2 Shimmer stops automatically when the session is no longer waiting
- [ ] #3 Setting toggle to disable the shimmer for users who prefer notifications only
- [ ] #4 Respects prefers-reduced-motion (no animation)
- [ ] #5 Does not interfere with focus / typing / other window state
<!-- AC:END -->
