---
id: TASK-195
title: 'Prompt composer: consider enabling on all panes, not only AI sessions'
status: Done
assignee: []
created_date: '2026-06-14 08:38'
updated_date: '2026-06-14 09:07'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #133 gates the prompt composer (menu item + Ctrl+Alt+P) to panes with an aiSessionId. Decide whether to also offer it on plain shell panes - users may want to draft multi-line input anywhere.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Decision recorded; if yes, composer is reachable from non-AI panes too
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Decision: enable on all panes. Ungated the prompt composer (pane menu item + Ctrl+Alt+C keybinding) from aiSessionId - it's useful for drafting multi-line input on any pane and was hidden on Copilot panes without a linked session.
<!-- SECTION:FINAL_SUMMARY:END -->
