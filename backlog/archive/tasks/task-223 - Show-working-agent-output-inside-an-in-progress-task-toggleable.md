---
id: TASK-223
title: Show working agent output inside an in-progress task (toggleable)
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:31'
updated_date: '2026-06-14 15:33'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Idea (2026-06-14): when a task is being worked by an AI agent, show that agent's live output at the bottom of the task detail, toggleable. Feasibility: displaying output is easy (reuse getSessionTimeline / live terminal buffer); the hard part is linking a task to a specific running session. Recommended MVP: explicit 'Attach to focused agent' action on a task -> store task<->sessionId link -> detail shows that session's live tail, toggleable. Auto-detection (by cwd + prompts mentioning task id) is a fragile stretch goal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A task can be attached to a focused AI agent session
- [x] #2 The task detail shows that session's live output, toggleable
- [x] #3 Output updates live while the agent works
- [ ] #4 Auto-detection considered separately (stretch)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Store task<->agent link in config.backlogTaskAgents (key projectPath::id -> {sessionId, provider}).
2. TaskDetail: Attach to focused agent / Detach controls; reads focused pane aiSessionId+provider via findSessionById.
3. AgentOutputPanel component: polls getSessionTimeline(provider, sessionId) every 2s, shows recent live tail, auto-scrolls.
4. Toggle to show/hide the output section; persists attach across reopen.
5. Auto-detection left as stretch (AC#4).
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the attach-to-agent MVP. A task detail now has an "Agent" section: "Attach to focused agent" links the task to the currently-focused AI pane (stores {sessionId, provider} in config.backlogTaskAgents under projectPath::id, so it persists). Once attached, an AgentOutputPanel polls getSessionTimeline every 2s and shows the live tail of that session (last ~12 messages, auto-scrolled), with Show/Hide output and Detach controls. Auto-detection (AC#4) intentionally left as a stretch goal.
<!-- SECTION:FINAL_SUMMARY:END -->
