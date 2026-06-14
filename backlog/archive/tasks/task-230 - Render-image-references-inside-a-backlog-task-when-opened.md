---
id: TASK-230
title: Render image references inside a backlog task when opened
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 10:54'
updated_date: '2026-06-14 11:06'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a task description references an image (e.g. a pasted image path or markdown image), opening the task should render/attach the image inline rather than showing a raw path. Extend the task-detail description/body image resolution to resolve and display referenced images. Reported 2026-06-14.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Image references in a task description render as images in the detail view
- [x] #2 Both markdown image syntax and bare image paths resolve
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Follow-up: unresolvable image paths (e.g. example/placeholder paths in prose like an agent summary) now fall back to showing the path as plain text instead of a broken-image icon.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Render image refs inline in backlog task detail. wrapBareImagePaths() pre-processes description and body markdown to turn lines that are a bare image path (e.g. C:\Users\me\clipboard-x.png or backlog/attachments/foo.png) into ![image](path) before marked runs, so they produce <img> tags; lines with existing markdown/HTML/URL syntax are left alone. The <img>-walking effect resolver now normalizes backslashes, detects absolute Unix/Windows-drive/UNC paths (passed through), resolves relative paths against the project backlog/<sub> folder, and decodeURI()s the src (guarded). DOMPurify still sanitizes output; existing CSS caps img size. Files: src/renderer/components/BacklogBoard.tsx.
<!-- SECTION:FINAL_SUMMARY:END -->
