---
id: TASK-183
title: Project right-click menu + custom color in Backlog
status: Done
assignee: []
created_date: '2026-06-14 06:18'
updated_date: '2026-06-14 06:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Right-clicking a project opens a menu (filter, set color, move, reveal, remove). Set color picks from a curated palette; the swatch/identity color (sidebar + cards + detail) uses it. The auto palette excludes status-signal red/green so swatches don't read as offline/online.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Right-click project shows an options menu
- [x] #2 Set color applies a custom color across sidebar and cards
- [x] #3 Auto colors avoid red/green status signals
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ProjectContextMenu (portal); per-project color persisted in config; colorFor resolves custom-or-hashed; SWATCH_COLORS palette has no red/green.
<!-- SECTION:FINAL_SUMMARY:END -->
