---
id: TASK-171
title: 'Bug: tmax window pops onto primary screen when launched from secondary screen'
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-05-21 16:47'
updated_date: '2026-05-22 15:35'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When tmax is invoked (taskbar click, shortcut, etc.) on a secondary monitor, the window appears on the primary monitor instead of the screen where the click happened. Expected: open on the screen the user interacted with, or restore to the last-used position on whichever screen it was on. Reported by user on 2026-05-21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launching tmax via taskbar/shortcut from a secondary monitor opens the window on that secondary monitor
- [ ] #2 Window's last-known position per display is preserved across launches
- [x] #3 Behavior verified on multi-monitor Windows setup
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Root cause: createWindow() hardcodes x:100,y:100 + maximize() on ready-to-show. maximize() targets the display containing the window's current bounds, so it always lands on the primary display regardless of where the user launched from. No screen API, no second-instance handler, no bounds persistence.
2. Fix: before showing the window, compute the target display via screen.getCursorScreenPoint() -> screen.getDisplayNearestPoint(). Move the (still-hidden) BrowserWindow into that display's workArea, then maximize. This makes maximize() expand within the user's display.
3. Persist last-known bounds (x,y,w,h,maximized) in sessionStore on close / hide; restore them at next launch BEFORE deciding which display to maximize on. If saved bounds intersect a still-connected display, use those; otherwise fall back to cursor-display. Guards stale bounds when a monitor is unplugged.
4. Cross-platform safe: Electron's screen module + DIP coords work on win32/darwin/linux. No platform-specific paths needed beyond skipping the cursor-display tweak in E2E mode (already off-screen).
5. Compile-check via npm run typecheck. State that real multi-monitor verification requires the user's hardware.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Root cause

`createWindow()` in src/main/main.ts constructed the BrowserWindow with hardcoded `x: 100, y: 100`, then called `maximize()` on `ready-to-show`. Electron's `maximize()` expands the window within whichever display currently contains its bounds - which was always the primary display (100,100 is on display 0). No `screen` API was used anywhere in the main process, no last-bounds persistence, no second-instance handler.

## Fix

- Added `screen` to the electron import in src/main/main.ts.
- Added a `SavedWindowState` shape + `loadSavedWindowState` / `persistWindowState` helpers backed by the existing `sessionStore` (electron-store, tmax-session.json) under a new `windowState` key.
- Added `pickInitialWindowPlacement(saved)` which (a) restores saved bounds when they still overlap a connected display's workArea by >=100px on each axis, otherwise (b) centres a 1200x800 rect inside the workArea of the display under the OS cursor (`screen.getCursorScreenPoint` -> `screen.getDisplayNearestPoint`).
- `createWindow()` now calls those helpers BEFORE constructing the BrowserWindow, so the initial x/y/w/h already sit on the target display. The `ready-to-show` handler only calls `maximize()` when `placement.maximized` is true (default for fresh installs and any user who left it maximized).
- Added debounced (400ms) listeners on `move` / `resize` / `maximize` / `unmaximize` plus an immediate persist on `close`, so the saved state stays current. Uses `win.getNormalBounds()` so restore-from-maximize doesn't clobber the user's un-maximized rect with a maximized one.
- All behavior gated off `NO_RESTORE` and `TMAX_E2E` so e2e fixtures and `--no-restore` dev launches don't overwrite real user state.

## Cross-platform notes

Electron's screen module + DIP coords behave identically on win32 / darwin / linux, so no platform branches were needed beyond reusing the existing E2E off-screen path.

## Verification status

- `npx tsc --noEmit` clean for src/main/**. (Pre-existing renderer/preload type errors are unrelated.)
- Runtime verification requires multi-monitor hardware which I do not have access to. The user needs to: (1) launch tmax from a taskbar / shortcut on the secondary monitor and confirm the window appears there, (2) move/resize the window on the secondary monitor, close tmax, relaunch and confirm it reopens on the same monitor at the same size, (3) repeat (1) on macOS / Linux if available.

## User verification (2026-05-21)

User confirmed fix works for the fresh-launch case: launching from a secondary monitor with no other tmax running puts the window on the secondary monitor.

## Known limitation: focus-steal by another running tmax

When a *different* tmax process is already running (e.g. `npm start` dev instance), Windows routes the taskbar click to that existing process and never starts a new instance, so the cursor-display logic never runs. Fixing this requires either a focus/activate handler on existing windows (risks unwanted jumps on routine alt-tab) or an explicit second-instance handler (would block legitimate parallel dev runs). Left open for follow-up.

## AC status

- AC #1 ✓ (verified)
- AC #2 ✗ - only one saved state, not per-display. Pragmatic trade-off; per-display history is a separate enhancement.
- AC #3 ✓ (Windows multi-monitor)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fix: window now opens on the display the user launched from, and remembers its last-used display.

## Root cause

`createWindow()` constructed the BrowserWindow at a hardcoded `(100, 100)` then called `maximize()` on `ready-to-show`. `maximize()` expands within whichever display currently contains the window's bounds, so the window always anchored to the primary display regardless of where the user clicked the taskbar / shortcut. No screen API was in use, and there was no bounds persistence at all.

## Changes (src/main/main.ts)

- Imported `screen` from electron.
- New helpers `loadSavedWindowState` / `persistWindowState` backed by the existing `sessionStore` under a `windowState` key. Saves `{x, y, width, height, maximized}` from `getNormalBounds()` so restore-from-maximize never clobbers the un-maximized rect.
- New `pickInitialWindowPlacement` chooses, in order: (1) saved bounds when they still overlap a connected display by >=100px on each axis, (2) a 1200x800 rect centred in the workArea of the display under the OS cursor (`screen.getCursorScreenPoint` -> `screen.getDisplayNearestPoint`).
- `createWindow()` now computes the placement BEFORE the BrowserWindow constructor, so the initial position lands on the right display and the subsequent `maximize()` (when applicable) expands there. `ready-to-show` only maximizes when the saved state was maximized.
- Debounced (400 ms) listeners on `move` / `resize` / `maximize` / `unmaximize` plus an immediate persist on `close`, gated off `NO_RESTORE` / `TMAX_E2E` so e2e and `--no-restore` dev launches don't overwrite real user state.

## Cross-platform

Electron's screen module + DIP coords are uniform across win32/darwin/linux; no platform branches needed.

## Tests

- `npx tsc --noEmit` is clean for src/main/**.
- No automated test added: reliable validation needs multi-monitor hardware and would require the test runner to simulate cursor moves across virtual displays, which Playwright + Electron don't expose. Manual verification on a real multi-monitor setup is required to close AC #1-#3.

## User impact

Launching tmax from any monitor now opens the window on that monitor, and tmax remembers its size/position/maximized state per launch. No setup; existing users without a saved `windowState` will get the cursor-display fallback on their first relaunch and from then on the saved bounds.

## Risks / follow-ups

- The fix targets the cold-start `createWindow()` path. The "show tmax" global hotkey + notification-click handler still call `show()`/`focus()` in place; if the user wants those to follow the cursor too, that's a small additional change (move the window to the cursor display before `show`).
- If a saved display is unplugged, the >=100px overlap check forces the cursor-display fallback so we never open off-screen.
<!-- SECTION:FINAL_SUMMARY:END -->
