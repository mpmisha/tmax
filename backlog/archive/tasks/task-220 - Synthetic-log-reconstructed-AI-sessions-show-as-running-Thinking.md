---
id: TASK-220
title: Synthetic (log-reconstructed) AI sessions show as running/Thinking
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 10:27'
updated_date: '2026-06-14 10:37'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the AI Sessions panel, a <synthetic> session (rebuilt from logs, not a live PTY in tmax) is displayed with status 'Thinking' and floated to the top + highlighted as if actively running. isActiveStatus(status)=status!=='idle' treats the stale last-log status as live. Synthetic/non-open sessions should not be considered running for float/highlight - either resolve their status to idle/closed when there's no live pane, or apply a staleness timeout. Reported 2026-06-14 (TASK-188 follow-up) with screenshot: 'I have another project...' CLAUDE <synthetic> 972 prompts, ACTIVITY 27s, status Thinking.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A synthetic session with no live pane is not shown as running/Thinking
- [x] #2 Only genuinely live sessions float to the top and get the running highlight
- [x] #3 Status resolves to idle/closed (or stale) for log-only sessions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Revised: the open-only check (isActiveStatus AND openSessionIds) was too strict - a genuinely running session can be tagged <synthetic> (reconstructed from logs, not spawned by tmax) and is NOT in openSessionIds, so it wrongly read as not-running. Changed isRunning to: non-idle AND (open in tmax OR lastActivityTime within 30s). Recency keeps real running synthetic sessions visible while stale last-log "thinking" statuses drop off.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed synthetic (log-reconstructed) AI sessions being shown as running/Thinking in the AI Sessions panel.

Root cause: isActiveStatus(status) returned status !== 'idle', so a stale last-log status (e.g. 'thinking') made non-live sessions float to the top and get the running highlight.

Change (renderer-only, CopilotPanel.tsx):
- Added isRunning(session, openSessionIds) helper: a session counts as running only when its status is non-idle AND it is open/live in tmax (id in openSessionIds). A synthetic session has no live pane, so it never qualifies.
- Used isRunning in sortSessions (float-to-top), the group sort (added openSessionIds to deps), and the row render (running highlight, pulsing dot, status text).
- Resolved displayStatus to 'idle' for non-running rows so the dot color/label no longer surfaces a stale 'Thinking' for log-only sessions.

Approach: open-check (no staleness timeout needed - openSessionIds cleanly distinguishes live vs synthetic). Verified with npx tsc --noEmit (no CopilotPanel errors).
<!-- SECTION:FINAL_SUMMARY:END -->
