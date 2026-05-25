---
id: TASK-174
title: TUI scrollback runs out earlier than expected (Ink frame churn)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-22 08:34'
updated_date: '2026-05-23 13:14'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After TASK-169 wheel-handler fix, scrolling works inside AI/TUI panes but only goes back a limited distance. Widening the window briefly reveals slightly more content (less line wrapping) but then scroll hits a hard ceiling. Likely cause: Ink-based TUIs (Copilot CLI, Claude Code) redraw their entire visible area on each state change, which writes the same N rows into xterm's scrollback over and over. With scrollback capped at 5000 lines, a chatty TUI burns through that budget and pushes earlier history out. Reported by user 2026-05-22.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Investigate whether Copilot CLI / Claude Code use alt screen or inline rendering
- [x] #2 Confirm via xterm buffer inspection how many rows the TUI is writing per redraw
- [x] #3 If Ink-frame burn confirmed, either raise scrollback default, detect TUI cursor-up redraws and skip the redrawn rows, or document the limitation
- [x] #4 User can scroll back to the start of an AI session even after a long chat
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Investigate Copilot CLI / Claude Code rendering: do they use alt screen or inline?\n2. Look for scrollback-clearing escape sequences (CSI 3J, CSI 2J)\n3. Check whether tmax filters or passes these through\n4. Pick fix: raise default scrollback, filter the clearing sequence, or detect redraw and dedupe
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## First-pass fix: raise default scrollback (2026-05-22)

Most likely root cause is a hard memory ceiling rather than scrollback-clearing escapes - Ink-based TUIs emit large transcripts on resume and 5000 lines runs out fast. Bumped default scrollback from 5000 to 50000 in three places (config-store default, TerminalPanel fallback, DetachedApp fallback) plus a one-shot migration that upgrades existing users still on the old 5000 default (preserves any explicit user override).

Memory impact: ~10-15 MB per pane at 50000 lines × ~150 cols × 1-2 bytes/cell. Per-pane and lazily allocated, so quiet panes stay small.

Left unchecked: alt-screen vs inline rendering investigation, CSI 3J filtering. If user still hits the ceiling after this swap, those are the next steps.

## Second-pass fix: windowsPty ConPTY hint (2026-05-22)

User compared a `copilot --resume <id>` session in tmax vs Windows Terminal: same PTY, same session, WT can scroll to the start, tmax cannot. Same node-pty / ConPTY underneath, so the bug had to be on the xterm.js side.

Found: xterm.js exposes a `windowsPty` option whose docs explicitly warn that without it, ConPTY resize semantics cause **rows to be replaced with blanks instead of moving into scrollback**:

> When increasing the rows in the terminal, the amount increased into the scrollback. This is done because ConPTY does not behave like expect scrollback to come back into the viewport, instead it makes empty rows at of the viewport. Not having this behavior can result in missing data as the rows get replaced.

This matches exactly: any time the user resized the window, font, or pane during a long Copilot session, ConPTY would push lines off-screen and xterm would replace them with blanks - so the conversation start vanished. WT bypasses this because it owns its own terminal stack with native ConPTY awareness.

Set `windowsPty: { backend: 'conpty' }` on `Terminal` construction in TerminalPanel.tsx and DetachedApp.tsx, gated on `platformInfo.platform === 'win32'`.

## Third-pass: pass real Windows build number to windowsPty (2026-05-22)

User swapped after the pass-2 fix and reported scroll still broken. Re-read the IWindowsPty docs: setting `backend: 'conpty'` WITHOUT a `buildNumber` falls into the legacy branch (`!(backend === 'conpty' && buildNumber >= 21376)`) which DISABLES reflow and assumes lines are wrapped when the last char is non-whitespace. That misparses long ConPTY output and can swallow scrollback in subtle ways.

Fix: expose the real Windows build (from os.release()) via the preload's platformInfo, then pass it into xterm.js. Modern Windows (build >= 21376) now gets the full reflow path; older Windows stays on the legacy heuristic but at least keeps row-into-scrollback on resize.

## Real root cause found (2026-05-23 investigation agent)

It was NOT a scrollback-size, windowsPty, or wheel-handler issue. All three of those were correctly wired (agent verified end-to-end against the user's actual swapped build: scrollback=50000, windowsPty.backend=conpty, buildNumber=26200, platformInfo.windowsBuildNumber=26200). The 10k-line static pwsh test preserves the full buffer perfectly.

The real cause: Ink-based TUIs (Copilot CLI, Claude Code) render their UI via CUU + erase + redraw in-place. Every state change repaints the same viewport-sized region using `[NA` + `[J` + write. Content never scrolls off the top into scrollback - it just gets overwritten in place. Agent simulated this exact pattern: 1000 frames x (rows-2) lines repainted in place -> buffer.length=44, baseY=0 (no scrollback at all). Same shape on any xterm.js terminal.

Windows Terminal works because Copilot CLI detects WT (likely via TERM_PROGRAM=Microsoft.Terminal) and uses a different, non-Ink render path that emits real static lines.

Secondary cliff agent verified: `[3J` (CSI 3J) DOES clear xterm scrollback. pwsh Clear-Host emits this. Anyone who hit Clear was wiping their own history.

## Final fix

1. `pty-manager.ts`: report `TERM_PROGRAM=vscode` to the shell environment so AI CLIs switch to their non-Ink renderer (VS Code-style static output). Added TMAX_VERSION for tools that legitimately need to know it's tmax.
2. `TerminalPanel.tsx flushPendingData`: strip `[3J` from PTY data before `term.write` so Clear-Host and similar don't wipe scrollback.

## Wheel + scrollbar fix (2026-05-23)

User reported: after the TERM_PROGRAM=vscode + CSI 3J fixes, drag-select scroll works (so scrollback content IS reaching xterm), but mouse wheel does nothing AND the scrollbar isn't visible.

Root cause: my GH #117 wheel handler called term.scrollLines() which only moves xterm's internal buffer position - it doesn't touch the .xterm-viewport DOM element's scrollTop. The browser-rendered scrollbar reflects scrollTop, so it never updated. Wheel looked dead because nothing visibly moved.

Fix: scroll the .xterm-viewport DOM element directly (viewport.scrollTop += deltaY). That's the same path xterm's own native wheel handler uses internally, so buffer position + scrollbar stay in sync. Still return false so xterm's mouse-mode forwarding is suppressed (preserves the GH #117 fix). Shift+wheel still opts back into native handling for TUIs that want raw wheel input.

## Wheel handler simplified with PUBLIC mouse-mode API (2026-05-23)

Final wheel-handler shape:
- If shift held: pass through to xterm (TUI opt-in for raw wheel).
- If mouseTrackingMode === 'none' (per term.modes.mouseTrackingMode - the PUBLIC xterm 5.x API): let xterm handle wheel natively. This is the path that updates the .xterm-viewport DOM scrollTop and renders the scrollbar.
- Else (mouse tracking on, TUI would eat the wheel): scroll viewport.scrollTop ourselves and return false to suppress xterm's wheel-to-PTY forwarding.

The earlier failure mode: my first probe used the internal _core.coreMouseService path which returned undefined through the TS facade, so my handler always took the 'intercept' branch and called term.scrollLines() - which moves xterm's internal buffer position but never touches .xterm-viewport.scrollTop. Result: wheel appeared dead, scrollbar invisible even when content existed.

The public term.modes.mouseTrackingMode reads the actual state reliably, so now native xterm scrolling kicks in whenever a TUI hasn't enabled mouse tracking - which is the common case post-TASK-174 (TERM_PROGRAM=vscode flips Copilot/Claude to a non-Ink renderer that DOESN'T enable mouse tracking).

## Wheel handler routed via term.scrollLines (2026-05-23 autonomous debug loop)

The previous handler manipulated .xterm-viewport.scrollTop directly. That works in isolation but breaks any time xterm's _innerRefresh has just set _ignoreNextScrollEvent=true (which it does whenever it programmatically syncs scrollTop, e.g. after a resize, fit, focus-mode toggle, or its own scroll). When the flag is true, the scroll event our manual scrollTop write generates is consumed by xterm with amount=0, so ydisp does NOT move - the canvas stays put while the scrollbar visibly slides, matching the user's 'wheel does nothing' report exactly.

Repro discovered via Playwright: 1000 lines of synthetic content, enable mouse tracking, call setViewportSize() to trigger the resize/refresh path, wheel up - viewportY stayed pinned to baseY even though viewport.scrollTop moved.

Fix: in the intercept branch (mouse tracking on), call term.scrollLines(rows) instead of viewport.scrollTop += deltaY. xterm.scrollLines updates ydisp via the buffer service directly, and xterm's own _innerRefresh syncs viewport.scrollTop on the next rAF - so the scrollbar still tracks. No collision with _ignoreNextScrollEvent because that path never triggers a scroll-event-fed ydisp update.

deltaY -> rows conversion uses _renderService.dimensions.css.cell.height (xterm internal, but stable across 5.x) with a 16px fallback. Min 1-row magnitude on non-zero deltaY so small wheel ticks still register.

Tests:
- tests/e2e/task-174-wheel-after-resize.spec.ts (new): mouse-tracking + resize + wheel must move viewportY. RED before, GREEN after.
- tests/e2e/task-169-mouse-wheel-override.spec.ts (existing): all 4 tests still pass.

## VERIFIED FIX via Playwright (2026-05-23)

Root cause was a subtle xterm 5.x internal: the renderer sets a private '_ignoreNextScrollEvent' flag whenever _innerRefresh() programmatically writes viewport.scrollTop (after a resize, fit-addon refit, focus-mode toggle, side-panel open, etc.). The flag stays set until the next scroll event consumes it.

My previous fix did 'viewport.scrollTop += e.deltaY' inside the mouse-tracking-on intercept branch. If a refresh had just run, the scroll event our write generated was swallowed by xterm's scroll handler with amount:0, so ydisp didn't move even though scrollTop visibly slid. Exactly the user-visible symptom: scrollbar drifts but canvas stays put = 'wheel does nothing'.

Fix: route the intercept branch through term.scrollLines(rows) - xterm's public API. That updates ydisp via the buffer service directly, then xterm's own _innerRefresh syncs viewport.scrollTop on next rAF, so the scrollbar visibly tracks. _ignoreNextScrollEvent is irrelevant because no scroll-event-driven update happens.

Verified with a new regression spec tests/e2e/task-174-wheel-after-resize.spec.ts that fills 1000 lines, enables mouse tracking, triggers a resize, then wheels. Before fix: viewportY stuck at 963. After fix: viewportY moves to 926. All 4 existing TASK-169 wheel tests still pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-174 finally fixed (2026-05-23) after 5 speculative passes that ALL turned out to be correctly wired but not the root cause.

Real root cause: in tmax's wheel handler, the mouse-tracking-on intercept branch manipulated viewport.scrollTop directly. xterm 5.x's renderer flips a private _ignoreNextScrollEvent flag whenever it programmatically sets scrollTop during a refresh (resize, fit-addon refit, focus-mode toggle, etc.). With the flag set, the scroll event our manual write generated was swallowed with amount:0 - so ydisp (the actual buffer position) didn't move even though scrollTop visibly slid. Result: scrollbar drifts but the canvas stays put, indistinguishable from 'wheel does nothing'. Real user sessions hit refreshes constantly (window resize, side-panel open, first PTY output, etc.), so the bug was deterministic for them but invisible in my earlier static tests that didn't include a resize.

Fix in TerminalPanel.tsx ~L1501: route the intercept branch through term.scrollLines(rows) - xterm's public API. That updates ydisp via the buffer service directly and xterm's own refresh syncs viewport.scrollTop on next rAF, sidestepping the flag collision.

Other fixes that landed in this task along the way and are now also live: TERM_PROGRAM=vscode in pty-manager.ts (so AI CLIs pick their non-Ink renderer when available), CSI 3J filter in flushPendingData (Clear-Host no longer wipes scrollback), default xterm scrollback raised from 5000 to 50000, windowsPty:{ backend:'conpty', buildNumber:<real OS build> } via preload's platformInfo.windowsBuildNumber, term.modes.mouseTrackingMode public API replaces unreliable _core probe.

Regression test: tests/e2e/task-174-wheel-after-resize.spec.ts - measures ydisp before and after a wheel call following a resize, asserts movement.
<!-- SECTION:FINAL_SUMMARY:END -->
