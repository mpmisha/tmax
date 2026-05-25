---
id: TASK-180
title: 'Fix: wheel works in Claude Code / Copilot CLI panes'
status: Done
assignee: []
created_date: '2026-05-24 16:00'
updated_date: '2026-05-24 16:12'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mouse wheel was not scrolling Claude Code / Copilot CLI panes. Root-caused and fixed in d34c6db; shipped to origin/main.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Wheel scrolls Claude Code panes
- [x] #2 Wheel scrolls Copilot CLI panes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shipped in d34c6db. Ink-based TUI panes (Claude Code, Copilot CLI) own the viewport (baseY===0 with mouseTrackingMode), so the prior wheel-suppression made wheel feel dead. Fix: when the TUI owns the viewport, let xterm forward the wheel as a mouse-button report; the TUI's own scroller (Claude/Copilot Ink stack maps codes 64/65 to wheelup/wheeldown) handles it. Normal shells unaffected.
<!-- SECTION:FINAL_SUMMARY:END -->
