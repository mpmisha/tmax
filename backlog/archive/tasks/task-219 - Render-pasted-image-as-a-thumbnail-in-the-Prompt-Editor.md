---
id: TASK-219
title: Render pasted image as a thumbnail in the Prompt Editor
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 10:18'
updated_date: '2026-06-14 10:30'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pasting an image into the Prompt Editor inserts the raw absolute temp path as plain text, which is ugly (a textarea can't show inline images). Add a thumbnail/attachment strip below the textarea that renders pasted images, while still passing the path(s) to the AI CLI on submit. Reported 2026-06-14 with screenshot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pasted images show as thumbnails below the editor
- [x] #2 Submitting still sends the image path(s) to the terminal
- [x] #3 Removing a thumbnail removes its path from the submission
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pasted images now render as a thumbnail strip below the Prompt Editor textarea instead of dumping the raw temp path into the text. Per-terminal attachments are kept in component state ({path, dataUrl}, resolved via imageReadAsDataUrl); on Submit the image paths are appended space-separated to the payload so AI CLIs still receive them, and attachments clear after send. Each thumbnail has a remove (x) button that drops its path from the submission. Added .prompt-composer-attachments styles to global.css.
<!-- SECTION:FINAL_SUMMARY:END -->
