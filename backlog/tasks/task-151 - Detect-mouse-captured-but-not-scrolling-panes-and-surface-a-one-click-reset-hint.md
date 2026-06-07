---
id: TASK-151
title: >-
  Detect mouse-captured-but-not-scrolling panes and surface a one-click reset
  hint
status: Done
assignee:
  - '@claude'
created_date: '2026-06-05 11:14'
updated_date: '2026-06-07 09:15'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a TUI (e.g. GitHub Copilot's dashboard view) turns on xterm mouse tracking but ignores wheel reports, the pane looks broken: the wheel does nothing and drag-select shows no highlight. A live event trace confirmed tmax forwards every wheel and drag to the app correctly - the app simply does not react - so users have no signal about what happened or how to recover. Add detection plus an actionable hint so users are guided to the fix instead of perceiving a dead pane.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a pane has mouse tracking on with no xterm scrollback (baseY 0) and the user wheels several notches while the rendered viewport stays unchanged, a hint toast appears for that pane
- [x] #2 The hint toast includes a Reset mouse mode action button that runs the mouse-reset on that specific pane, restoring wheel scroll and native selection
- [x] #3 The hint also tells the user they can hold Shift to drag-select while an app has the mouse captured
- [x] #4 The hint never fires when the app actually scrolls (viewport content changes) and is throttled to at most once per pane per cooldown
- [x] #5 Toast model supports an optional action (label + onClick) without changing behavior of existing message-only toasts
- [x] #6 Behavior is cross-platform (Windows/macOS/Linux) and covered by an e2e test that simulates a non-scrolling mouse-tracking TUI
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Toast model: extend toastNotifications item + addToast to accept an optional action { label, onClick } and an optional dedupeKey (for per-pane throttle). Render the action button in Toast.tsx; keep existing message-only calls working. Bump auto-dismiss for actionable toasts (e.g. 10s).\n2. Per-pane mouse-reset helper: factor the MOUSE_RESET_SEQUENCE write (used by Command Palette + AI-exit poll) so the toast action can reset a specific terminalId.\n3. Detection in TerminalPanel wheel handler: in the forward-to-PTY branch (mouseTracking on AND baseY 0), track a wheel burst - on first notch snapshot a cheap viewport hash (first/last N visible rows), count notches, and ~300ms after the burst settles compare the hash. If notches >= THRESHOLD (5) and hash unchanged, fire the hint once per pane (cooldown ~45s).\n4. Hint copy: '<App> captured the mouse - the wheel will not scroll here.' + [Reset mouse mode] action + 'hold Shift to drag-select' tip. Use detected pane title/AI kind for <App> when available.\n5. Guard rails: never fire when viewport changes (app scrolled), when shift held, or when mouse tracking off. Clear burst state on blur/dispose.\n6. Test: e2e that splits a pane, enables mouse tracking with no scrollback, simulates an app that ignores wheel (no redraw), wheels N times, asserts the actionable toast appears; and a negative test where the app DOES redraw (no toast).\n7. Manual verify in real Copilot pane; confirm reset button restores scroll + selection.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVERTED / removed. The auto-detect-and-notify approach is fundamentally unsound: "wheel forwarded but viewport unchanged" cannot be distinguished from "scroll works but at the boundary / content fits on screen", so it false-fires on working panes. Worse, the offered "Reset mouse mode" action is destructive: for any TUI that scrolls via mouse reports (most of them), disabling mouse tracking removes scroll rather than recovering it. Confirmed in the field - a working pane got a false hint, and clicking Reset broke its scroll. All code backed out (toast action model, wheel-burst detector, e2e spec). Non-destructive escape hatches remain: Command Palette "Reset Mouse Mode" and Shift+drag to force native selection.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated and intentionally reverted - not shipping. Auto-detecting "mouse captured but not scrolling" is unsound: "wheel forwarded but viewport unchanged" is indistinguishable from a working pane at a scroll boundary or content that fits on screen, so it false-fires on healthy panes; and the offered Reset action is destructive (disabling mouse tracking removes scroll for the many TUIs that scroll via mouse reports). All code backed out. Non-destructive escape hatches remain: Command Palette "Reset Mouse Mode" and Shift+drag for native selection.
<!-- SECTION:FINAL_SUMMARY:END -->
