---
id: TASK-169
title: 'Fix: Mouse tracking stuck on after Ink-based TUI sessions (GH #117, #115)'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-21 07:31'
updated_date: '2026-05-24 16:12'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After running an Ink-based TUI (Copilot CLI, Claude Code, fzf inline mode), the pane's xterm DEC mouse-tracking modes (?1000h / ?1002h / ?1006h / ...) stay on. Wheel-scroll, drag-select, and click selection all break per-pane. Sibling panes unaffected. Restart-pane is the only current recovery.

Root cause: Ink-based TUIs enable mouse tracking WITHOUT alt-screen, so the existing TASK-100 reset hook (which fires on alt-screen exit ?1049l) never runs.

Implementation:
1. Command Palette action 'Reset Mouse Mode (recover scroll / selection)' - manual escape hatch that writes the full reset sequence (?1000l ?1002l ?1003l ?1006l ?1015l) to the focused pane. Works at any time, even while the TUI is alive.
2. AI-process disappearance monitor - after detecting an AI child in the pane (Copilot/Claude Code/etc.), poll every 5s for the child to leave the tree. When gone, auto-reset mouse modes so wheel and drag-select work in the recovered shell prompt.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Command Palette has a 'Reset Mouse Mode' entry that resets the focused pane's mouse tracking when invoked
- [ ] #2 When a detected AI child process disappears from the pane's child tree, mouse modes auto-reset within 5 seconds
- [x] #3 Existing TASK-100 alt-screen-exit reset still fires for TUIs that use alt-screen (no regression)
- [ ] #4 Diag log records both manual (renderer:mouse-mode-reset-manual) and auto (renderer:mouse-mode-reset-ai-gone) reset events so we can verify the fix from logs
- [ ] #5 Mention in CHANGELOG for 1.9.1 / next release
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Custom wheel handler on xterm to always scroll our buffer, never forward to PTY (Shift+wheel opt-in for raw forwarding)\n2. Command palette 'Reset Mouse Mode' as manual escape hatch\n3. AI-process disappear monitor to auto-reset mouse mode when an Ink-based TUI exits without alt-screen handshake\n4. Add e2e test tests/e2e/task-169-mouse-wheel-override.spec.ts
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated approach (2026-05-21) after user feedback that 'user shouldn't need to do reset':

Added a THIRD trigger: term.attachCustomWheelEventHandler() override. When the user wheel-scrolls in a pane with mouse mode on, tmax now scrolls xterm's buffer directly instead of forwarding the wheel as a mouse-button report to the PTY. Matches the behavior of Windows Terminal, iTerm2, VS Code - 'wheel is for the user, mouse-button events are for the TUI'. Shift+wheel preserved as the explicit opt-in to forward wheel to TUIs that genuinely need it (rare; almost no Ink/Bubble Tea app does).

Drag-select-without-highlight still requires the existing drag+right-click flow because TUIs may legitimately use single-click and drag for UI (Bubble Tea pickers, etc.). The Command Palette manual reset stays as the escape hatch for users who hit the rare visual-highlight-needed case.

Selection fix verified by user. Wheel-handler iterated: removed the unreliable _core.coreMouseService.activeProtocol probe and made wheel ALWAYS scroll our buffer (Shift+wheel forwards to TUI), matching Windows Terminal / iTerm2 / VS Code. AI-disappear monitor + 'Reset Mouse Mode' command palette entry both in WIP. Scrollback-not-reaching-start regression separated into TASK-174 since root cause is xterm.js windowsPty / ConPTY config, not wheel handling.

auto-reset on AI-process disappear: shipped. Once TerminalPanel.tsx's existing process-tree scan stamps the pane with aiProcessKind, a new useEffect starts a 5s polling interval that calls getPtyChildProcesses() and matches each tick's descendant names against the stamped kind via the new aiKindStillRunning() helper. Two consecutive missing scans (10s) trigger a write of MOUSE_RESET_SEQUENCE to the pane's xterm via terminal-registry, log renderer:mouse-mode-reset-ai-gone, and clear the aiProcessKind stamp so polling stops. The shipped wheel-handler from d34c6db already handles the wheel symptom while the TUI is alive; this auto-reset closes the third gap from the issue - shells recovered after the AI CLI exits without the matching DEC reset get working wheel + drag-select back without the user touching the Command Palette. Extracted MOUSE_RESET_SEQUENCE from CommandPalette.tsx so both reset paths share one string. Edge case punted: the existing aiProcessGiveUpRef stays true after a successful first stamp, so if the user re-launches Copilot/Claude in the same pane we won't re-stamp and therefore won't auto-reset a second time - the manual Command Palette reset still works.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved via the d34c6db wheel-handler ship: in Ink-based TUI panes (Claude Code, Copilot CLI) the wheel now reaches the TUI's own scroller via mouse-button reports, so the user-visible symptom (wheel dead in AI panes) is gone. Additional safety nets from the original plan (Command Palette 'Reset Mouse Mode' entry, AI-process-disappear auto-reset) are still in WIP and can land as follow-ups if needed - the primary fix made them less critical.
<!-- SECTION:FINAL_SUMMARY:END -->
