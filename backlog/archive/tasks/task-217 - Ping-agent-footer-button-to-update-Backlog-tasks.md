---
id: TASK-217
title: Ping-agent footer button to update Backlog tasks
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:18'
updated_date: '2026-06-14 11:10'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Added a 'Ping tasks' button in the bottom status bar next to Backlog. When an AI pane (Claude Code/Copilot) is focused, it sends a canned instruction to the agent asking it to reconcile Backlog.md - set status, check completed ACs, add final summaries. Reuses the F5 continue-send mechanism (writePty msg+CR). Disabled when the focused pane isn't an AI session.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Button appears in the status bar next to Backlog
- [x] #2 Sends an update-tasks instruction to the focused AI agent
- [x] #3 Disabled when no AI pane is focused
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Gated the per-pane ping: it now only sends when the pane cwd is inside a project on the Backlog board; otherwise it toasts "add it to the Backlog board first" instead of asking an agent to update a non-existent backlog.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added 'Ping tasks' status-bar button; sends a canned reconcile-Backlog instruction to the focused AI agent via writePty(msg+CR). Disabled off an AI pane.

Moved per user feedback: the ping is now PER-PANE (a 📋 button next to each AI pane's 🔔 status-ping and 💬 transcript buttons), not a single global status-bar button. Removed the global StatusBar button. Sends the reconcile-Backlog instruction to that specific pane via the same bracketed-paste + dual-Enter mechanism as the status ping.
<!-- SECTION:FINAL_SUMMARY:END -->
