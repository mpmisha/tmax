---
id: TASK-166
title: 'Bug: maximized floating pane overlaps AI Sessions panel when AI panel opens'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-18 13:10'
updated_date: '2026-05-22 15:35'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User-reported visual bug where the AI Sessions panel renders over the terminal content instead of pushing it aside. Terminal text shows across the full window width including over the panel area (see clipboard-2026-05-18T13-07-22 / clipboard-2026-05-18T13-07-46 screenshots in user's clipboard temp dir).

Initial hypothesis: focus mode + .tiling-leaf position:absolute resolves against an unexpected ancestor when the window is narrow, so the focused pane paints across the full window width. Need confirmation of:
- Was the user in focus mode (Ctrl+Shift+F) or grid mode when this happened?
- What was the window size? Both screenshots look narrow (~600px wide and ~200px wide respectively).
- Does toggling focus mode off recover the layout?

Affects: 1.9.0 (and likely earlier).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reproduce on a narrow window with the AI Sessions panel open
- [ ] #2 Identify whether the bug is focus-mode-specific or also affects grid mode
- [ ] #3 Terminal pane never overlaps with side panels regardless of window width
- [ ] #4 Add an e2e regression spec that resizes the window narrow with the AI panel open and asserts no overlap
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Does NOT reproduce on InbarR's machine (2026-05-18). Environment/state-specific. Need from reporter before deeper investigation:
- tmax version (check status bar)
- OS + display scaling (Windows display settings %)
- Multi-monitor setup? Which monitor was the window on?
- Window state when bug appeared: focus mode (Ctrl+Shift+F)? workspace tab mode? floating panes?
- Was the AI panel resized to a custom width before this happened?
- Repro steps if they can find them - does it happen on fresh launch, or only after a specific sequence?

Plausible env-specific causes:
- High-DPI display + an absolute-positioned ancestor losing its containing block at certain pixel ratios
- Window state restored to a narrow size where MIN_WIDTH (180) + terminal min-width overflows the viewport
- Theme-specific CSS where a transparent backdrop reveals an overlapping element that's normally hidden
- Browser zoom inside the Electron BrowserWindow (Ctrl+ / Ctrl-) shrinking the layout-area below what the saved panel width allows

Confirmed via reporter screenshots + InbarR's reference shot: reporter is in FLOAT mode with the terminal pane maximized (FLOAT pill visible, status bar shows '1 terminal (0 tiled, 1 floating)'). The floating panel was maximized before the AI Sessions panel was opened, so its bounds (x:0, width:window.innerWidth) still claim the full window. When the AI panel opens and pushes layout-area to start at x=180 from window-left, the floating pane keeps its old width and visually overlaps the AI panel column.

Fix candidates:
1. When the AI Sessions panel (or any side panel) opens, re-fit any maximized floating panels so width=new layout-area width.
2. When a maximized floating panel is rendered, compute width = layout-area.clientWidth at paint time, not from saved bounds.
3. Auto-collapse maximize state when a side panel opens (treat maximize as 'cover the layout area at this moment').
4. Clip the floating panel's apparent x to >=0 of layout-area (it would already be clipped via overflow:hidden on .layout-area, so the visual overlap means either the panel renders fixed or the clipping is bypassed - worth verifying in DevTools).

Reproduced on InbarR's machine (2026-05-18). Repro state: floating terminal pane (maximized or wide) + AI Sessions panel opened. Floating pane title bar shows above where the AI panel's search box would normally be, and the floating pane content extends LEFT under the AI Sessions column.

Key observation: overflow:hidden on .layout-area is NOT clipping the floating panel as expected. Either .floating-layer uses position:fixed somewhere, or a transform/will-change on an ancestor creates a new containing block that bypasses the clip. Worth opening DevTools and inspecting the computed style + offsetParent of .floating-panel in this state to confirm.

Likely simplest fix: change .floating-layer position from absolute to relative within layout-area (so it can't escape), OR add overflow:hidden to .floating-layer itself if the leak is at that level.

Applied defensive fix (2026-05-18):
- src/renderer/styles/global.css: .floating-layer now has overflow:hidden (clips child floating panels to its bounds regardless of stacking-context quirks).
- src/renderer/styles/global.css: .floating-panel now has max-width:100% / max-height:100% (caps the panel to the floating-layer size even when saved bounds are stale).

Awaiting user verification via npm start.
<!-- SECTION:NOTES:END -->
