---
id: TASK-224
title: Clicking an image path link in the terminal to preview is flaky
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-06-14 10:34'
updated_date: '2026-06-14 11:05'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an AI CLI prints a clickable image file path (xterm link provider underlines it), clicking it to open the preview only works intermittently - the user must click several times. Likely imprecise link hit-range detection or the click being swallowed by mouse-selection/tracking handling in the terminal link activate path. Investigate the link provider registration and activate callback in TerminalPanel.tsx (registerLinkProvider / file-path link matcher) and the preview open trigger. Reported 2026-06-14 with screenshot (path link 'aaaa C:\Users\...\clipboard-...png').
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking an image/file path link opens the preview on the first click reliably
- [x] #2 Link hit-range matches the visible underlined text
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed flaky image-path link clicks in TerminalPanel.tsx. Root cause: xterm's link activation is hover-state dependent - in AI CLI panes (Copilot/Claude) mouse tracking forwards the click to the pty and the linkifier's _currentLink goes stale when the pane redraws under a stationary cursor, so plain clicks often did not reach activate(). The link range math itself was already correct (verified 1-based inclusive columns cover exactly the matched path). Fix: the image-path provider now records its computed link ranges per absolute buffer row in a ref (keyed to match pixelToCell), and the existing capture-phase left-mouseup handler activates the preview directly on a genuine non-drag click - independent of xterm's hover state. A shared openPreview() self-dedupes (400ms) so the direct path and xterm's own activate() never double-open. Row hits are cleared each time provideLinks recomputes that row and capped to avoid growth. Tooltip changed from 'Ctrl+Click' to 'Click'. Cross-platform: pure column/pixel math, no OS-specific code.
<!-- SECTION:FINAL_SUMMARY:END -->
