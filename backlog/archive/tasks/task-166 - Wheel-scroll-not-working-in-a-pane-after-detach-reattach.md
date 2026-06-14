---
id: TASK-166
title: Wheel scroll not working in a pane after detach + reattach
status: Done
assignee: []
created_date: '2026-06-13 13:39'
updated_date: '2026-06-13 13:58'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report (2026-06-13): after detaching a copilot pane and reattaching it, wheel scroll no longer works in that pane. Same family as the TASK-164 selection bug: the reattached pane is on the ALTERNATE screen buffer with mouse tracking on (verified for selection via diag), so the wheel is forwarded to the app / does not scroll. The custom wheel handler (TerminalPanel attachCustomWheelEventHandler) forwards to the app when mouseTrackingMode!='none' && baseY===0; on the alt buffer with no scrollback the wheel goes to copilot which may not scroll. Likely needs AI-pane-aware handling or a mouse/alt-screen state resync on reattach. Reproduce by instrumenting the wheel path with diag logs like TASK-164.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After detach+reattach of a copilot/claude pane, wheel scroll works in that pane
- [ ] #2 Reproduced and covered by a test
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved by removing the Detach-to-window option (commit 0bd8113) rather than fixing the scroll. Root cause was understood (reattached pane is on the alternate buffer with mouse tracking; xterm drops the forwarded wheel report after the remount - tmax forwards correctly, verified via diag, but no pty:write follows), but after repeated attempts a reliable fix wasn't worth the bug surface for a secondary feature. The detach subsystem + Reattach path remain intact if re-enabled later.
<!-- SECTION:FINAL_SUMMARY:END -->
