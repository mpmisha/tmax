---
id: TASK-201
title: 'Prompt composer: paste an image (insert file path)'
status: Done
assignee: []
created_date: '2026-06-14 09:23'
updated_date: '2026-06-14 09:23'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow pasting an image into the prompt composer; saves it to a temp file and inserts the path at the caret, mirroring how a terminal pane handles image paste - so AI CLIs that accept image paths get a usable reference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pasting an image into the composer inserts a usable file path; text paste is unaffected
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added onPaste to the composer textarea: if the clipboard has an image (and no text), clipboardSaveImage saves it and the temp path is inserted at the caret - same pattern as TerminalPanel's image paste.
<!-- SECTION:FINAL_SUMMARY:END -->
