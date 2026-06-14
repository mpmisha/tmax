---
id: TASK-214
title: 'Prompt Editor: capture multi-line AI-CLI input, not just caret row'
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:12'
updated_date: '2026-06-14 10:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Opening the Prompt Editor over a Copilot/Claude box with multiple typed lines (aaa then vvv) only prefilled the caret's line. getCurrentInputLine now walks up from the caret over contiguous content rows (stopping at the box border/blank/shell prompt), joining soft-wrapped rows in place and explicit newlines with line breaks, and dedents box padding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Multi-line input in an AI-CLI box is captured in full
- [x] #2 Soft-wrapped long lines are also captured
- [x] #3 Box border padding is stripped from the prefill
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
getCurrentInputLine reconstructs the whole input block: walks up from the caret over contiguous content rows (stopping at box border/blank/shell prompt), joins soft-wrapped rows in place and explicit newlines with breaks, dedents box padding.
<!-- SECTION:FINAL_SUMMARY:END -->
