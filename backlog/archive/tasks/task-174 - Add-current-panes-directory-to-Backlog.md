---
id: TASK-174
title: Add current pane's directory to Backlog
status: Done
assignee:
  - '@inrotem'
created_date: '2026-06-13 16:40'
updated_date: '2026-06-13 17:09'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-167. Add a one-click action to add the focused terminal pane's working directory as a Backlog project (validating it contains a backlog/ folder), so the user doesn't have to type the path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An 'Add current directory' action adds the focused pane's cwd as a project when it contains a backlog/ folder, with a clear message when it does not
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added '+ Add current directory' in the project sidebar: grabs the focused terminal pane's cwd, validates it has a backlog/ folder, and adds it as a project (clear error otherwise). Saves typing the path.
<!-- SECTION:FINAL_SUMMARY:END -->
