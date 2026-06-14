---
id: TASK-168
title: Live Agents panel in tmax Backlog view
status: To Do
assignee: []
created_date: '2026-06-13 14:01'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-167. backlog-hub had a Live Agents view that reads ~/.claude/projects and ~/.copilot/session-state transcripts to show running Claude Code / Copilot CLI sessions (last user message, current tool, awaiting-input). tmax already hosts agents in panes so this is partly redundant, but a cross-project at-a-glance agent status list inside the new Backlog view could still be useful. Decide whether to port it after the kanban board ships.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision recorded on whether tmax needs a separate Live Agents list given it already hosts agent panes
- [ ] #2 If built: lists active Claude/Copilot sessions across projects with last activity and awaiting-input status, themed into the Backlog view
<!-- AC:END -->
