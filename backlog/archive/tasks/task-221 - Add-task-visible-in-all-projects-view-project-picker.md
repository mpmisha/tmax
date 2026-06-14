---
id: TASK-221
title: + Add task visible in all-projects view (project picker)
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:27'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
+ Add task only rendered when a single project was filtered, so the default all-projects view (what new users land on with multiple projects) showed no add option - confusing. Now the button always shows when projects exist: it creates directly when the target is unambiguous (filter set, or only one project), otherwise opens a small project picker to choose where the task lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 + Add task shows in the all-projects view
- [ ] #2 With one project or an active filter it creates directly
- [ ] #3 With multiple projects it offers a project picker
<!-- AC:END -->
