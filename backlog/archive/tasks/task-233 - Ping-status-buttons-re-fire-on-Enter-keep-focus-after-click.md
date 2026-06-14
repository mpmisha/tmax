---
id: TASK-233
title: Ping/status buttons re-fire on Enter (keep focus after click)
status: Archived
assignee:
  - '@claude-agent'
created_date: '2026-06-14 11:06'
updated_date: '2026-06-14 14:57'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After clicking a per-pane AI action button (🔔 status ping or 📋 backlog-update), the button kept keyboard focus, so pressing Enter to submit in the terminal re-activated the focused button and re-sent its text (doubling it). Fix: both onClick handlers now synchronously blur the button and return focus to the pane terminal (store setFocus + xterm focus) before sending, so Enter goes to the terminal. Reported 2026-06-14; shipped with TASK-224.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking a ping button then pressing Enter submits in the terminal, not re-clicking the button
- [ ] #2 Text is sent once, not duplicated
<!-- AC:END -->
