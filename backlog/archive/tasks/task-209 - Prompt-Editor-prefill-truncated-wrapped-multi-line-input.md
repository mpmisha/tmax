---
id: TASK-209
title: Prompt Editor prefill truncated wrapped/multi-line input
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:03'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Opening the Prompt Editor prefilled from the pane's current input line but only captured the single caret row, so long input that soft-wrapped across visual rows was truncated. getCurrentInputLine now walks xterm isWrapped continuation rows to reconstruct the full logical line. Known limitation: genuine multi-line input with explicit newlines inside an AI-CLI box still cannot be reliably reconstructed (those rows are not isWrapped).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Soft-wrapped long input is captured in full
- [ ] #2 Caret position within the wrapped line does not truncate the prefill
<!-- AC:END -->
