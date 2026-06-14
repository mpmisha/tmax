---
id: TASK-200
title: 'Prompt composer: prefill from the pane''s current input line'
status: Done
assignee: []
created_date: '2026-06-14 09:15'
updated_date: '2026-06-14 09:15'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When opening the composer, seed it with text already typed at the pane's prompt/input box (e.g. Copilot input 'aaa'), so the user can continue composing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Opening the composer prefills the draft with the current input line (shell prompt or AI-CLI box), unless a draft already exists
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added getCurrentInputLine to terminal-registry (reads the xterm cursor row, strips box-drawing chars + leading shell prompt); openPromptComposer seeds the draft with it when none exists.
<!-- SECTION:FINAL_SUMMARY:END -->
