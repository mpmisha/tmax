---
id: TASK-228
title: 'Add task: draft dialog, create only on Save'
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:52'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
+ Add task created the task immediately (placeholder New task), polluting the board even if cancelled. Now it opens a New Task dialog with Title (required) + Description (image paste supported); the task is written only on Save. Cancel/Esc/backdrop discards with nothing created. Footer is Cancel + Save (not Close).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 + Add task opens a dialog; nothing is created until Save
- [ ] #2 Save button labeled Save (not Close); Cancel discards
- [ ] #3 Title required; description optional with image paste
<!-- AC:END -->
