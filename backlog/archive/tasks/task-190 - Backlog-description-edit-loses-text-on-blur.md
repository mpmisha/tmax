---
id: TASK-190
title: Backlog description edit loses text on blur
status: Done
assignee: []
created_date: '2026-06-14 08:18'
updated_date: '2026-06-14 08:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Typing in the task description then clicking elsewhere made the text briefly disappear: on blur the view flipped to the read state showing the still-empty file value before the async save+reload completed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Editing the description and clicking away keeps the text visible (optimistic), persists natively, and reverts only on write failure
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the description canonical value a state (descValue) updated optimistically on save instead of deriving it from the file each render. Blur now shows the typed text immediately; the native write persists in the background and only reverts on failure.
<!-- SECTION:FINAL_SUMMARY:END -->
