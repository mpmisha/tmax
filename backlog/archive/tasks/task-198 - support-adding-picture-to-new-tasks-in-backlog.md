---
id: TASK-198
title: support adding picture to new tasks in backlog
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-14 11:43'
updated_date: '2026-06-14 09:06'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Main BACKLOG_SAVE_IMAGE IPC saves the clipboard image to backlog/.attachments and returns a markdown-relative path.
2. Preload + api: backlogSaveImage(projectPath).
3. Description editor onPaste: if the clipboard holds an image, save it and insert a markdown image link at the caret.
4. Detail read view: resolve relative image srcs to data URIs via imageReadAsDataUrl so they render.
5. Constrain image size in the detail body.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Paste an image into a task description -> BACKLOG_SAVE_IMAGE saves it to backlog/.attachments + inserts a markdown ref; detail view resolves relative img srcs to data URIs so they render.
<!-- SECTION:FINAL_SUMMARY:END -->

<!-- SECTION:DESCRIPTION:END -->
