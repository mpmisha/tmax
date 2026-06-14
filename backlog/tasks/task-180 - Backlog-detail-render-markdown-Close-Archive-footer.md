---
id: TASK-180
title: 'Backlog detail: render markdown + Close/Archive footer'
status: Done
assignee: []
created_date: '2026-06-14 06:18'
updated_date: '2026-06-14 06:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detail body now renders markdown via marked+DOMPurify (was raw text). Footer split into a primary Close and a secondary Archive so users don't click Archive expecting it to close.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Body renders as markdown
- [x] #2 Footer has distinct Close and Archive
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
marked+DOMPurify render; .backlog-detail-md styles; footer = Close (primary) + Archive (secondary).
<!-- SECTION:FINAL_SUMMARY:END -->
