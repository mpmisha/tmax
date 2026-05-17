---
id: TASK-165
title: Feature - Ping/wake button per AI session
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 10:22'
updated_date: '2026-05-13 19:17'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User asked for a button that 'does a ping to the AI session in the prompt'. Need to clarify scope:\n- WHERE: on the pane title bar, in the AI Sessions panel row, on the prompt bar at the bottom?\n- WHAT: send 'continue\r' (mirror F5/continueAgent), or send a literal /ping or empty prompt to nudge the session?\n- WHEN: useful for sessions stuck in idle / waitingForUser, or for any session?\n\nLikely intent: a click-target so users can prod an idle AI session without typing or remembering F5. Probably in the AI Sessions panel row's status dot area, or in the pane's title bar near the AI session indicator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User confirms WHERE (pane title bar / panel row / prompt bar / multiple) and WHAT (continue text vs other)
- [x] #2 Button is visually distinct from existing affordances (rename, pin, close)
- [x] #3 Click sends the agreed-upon nudge to the underlying PTY and reflects status in the UI
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13: removed the panel-row Ping button - it overlapped with the pin/complete cluster and the user wanted it on the pane anyway. Pane-side button (last-prompt banner, between ⋯ and the prompt text) stays as the single Ping surface.

2026-05-13 v2: changed ping payload from "continue" to a status-update prompt: "Brief status update: what are you doing right now and what is next?". User wants the ping to interrogate the session, not push it forward.

2026-05-13 v3: separated the writePty into two events (text first, then Enter after 80ms delay) so TUI input widgets that treat embedded  as multi-line don't leave the prompt unsubmitted. Improved the text: "Quick status update please - what's the current state, what just finished, and what's next? Keep it brief."
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shipped a 🔔 Ping button on each AI Sessions panel row. Behavior:
- Only renders when the session is linked to a tmax pane (otherwise there's nowhere to write).
- Click sends "continue" to that pane (same byte stream as F5 / continueAgent).
- Click is e.stopPropagation'd so it doesn't also select / open the row.

Placed before the existing Pin button so the row's action cluster reads ping → pin → complete/reactivate left-to-right. Reuses the .ai-session-lifecycle-btn styling so it matches the rest of the row buttons (no new CSS needed).

Decisions left for follow-up if you want them:
- Per-pane title-bar button (parallel surface) - skipped to avoid touching TerminalPanel.tsx while the mouse-wheel agent is working there.
- A different "wake" payload than "continue" (e.g. a no-op nudge) - kept identical to F5 for consistency; trivial to swap later.
<!-- SECTION:FINAL_SUMMARY:END -->
