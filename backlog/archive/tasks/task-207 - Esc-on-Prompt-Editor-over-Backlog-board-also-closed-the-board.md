---
id: TASK-207
title: Esc on Prompt Editor over Backlog board also closed the board
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:02'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
With the Backlog board open and the Prompt Editor layered on top, pressing Esc to dismiss the editor also closed the whole board. Cause: the board's Esc handler runs on document in capture phase, firing before the editor's window bubble-phase handler. Fix: the board now bails on Esc when promptComposerRequest is set, so the topmost overlay owns Esc. Regression test added (launch-based, task-172-175 spec).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Esc with both open closes only the Prompt Editor
- [ ] #2 Board stays open underneath
<!-- AC:END -->
