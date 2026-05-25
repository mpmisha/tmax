---
id: TASK-175
title: 'Fix: multi-line copy collapses to one line when source has container indent'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-22 15:30'
updated_date: '2026-05-22 15:34'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Copying a multi-line block from a tmax pane (e.g. a Claude Code chat response rendered with a 2-space indent around each line) pastes as a single concatenated line instead of N lines. Root cause: smartUnwrapCopy heuristic treats any 1-2 space leading indent as a wrap continuation and merges into the previous line - so an N-line code block all sharing the same container indent collapses to one giant line. Reported 2026-05-22.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Copying a 10-line code block from a chat-rendered TUI preserves all newlines
- [x] #2 Existing wrap-merge behavior still works for 1-space continuation paragraphs from Copilot CLI
- [x] #3 Add a test case in tests/e2e/smart-unwrap-on-copy.spec.ts that locks this in
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update smart-unwrap.ts: only merge into a previous line that starts at column 0 (real wrap pattern). When both lines are indented they're parallel content, not a wrap.\n2. Verify existing tests in smart-unwrap-on-copy.spec.ts still pass.\n3. Add a new test case for the container-indent scenario.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Heuristic was too aggressive: any 1-2 space indent triggered merge regardless of prev-line state, so an N-line indented block collapsed into a single line because each subsequent line merged into the (already-merged) prev line. New rule: prev line must start with a non-whitespace char (column 0) for the merge to fire. Preserves all existing TASK-52 paragraph-wrap behavior since real CLI wrap continuations always wrap against unindented base lines.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
User verified multi-line copy works after the smart-unwrap heuristic was tightened to only merge into unindented base lines.
<!-- SECTION:FINAL_SUMMARY:END -->
