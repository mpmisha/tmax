---
id: TASK-184
title: >-
  Forward xterm onBinary to PTY (fixes scroll/selection in alt-screen TUIs after
  split)
status: Done
assignee:
  - '@copilot-cli'
created_date: '2026-05-29 10:30'
updated_date: '2026-05-29 12:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root cause via live CDP probe: TUIs that enable mouse tracking with DEFAULT (legacy x10) mouse encoding (no SGR mode 1006) get their reports routed by xterm.js through coreService.triggerBinaryEvent (term.onBinary), NOT triggerDataEvent (term.onData). tmax only has onData, so DEFAULT-encoded mouse reports (wheel, click, drag) are silently dropped. Manifests as: wheel does not scroll Copilot CLI in alt-screen, and after split the recreated xterm ends up with DEFAULT encoding and wheel stops. Fix: add term.onBinary that forwards to writePty matching onData (incl broadcast). Also forward scrollbar drag as wheel mouse-report so alt-screen TUIs scroll their internal buffer when user drags the gutter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 term.onBinary handler in TerminalPanel.tsx forwards bytes to writePty with broadcast handling
- [ ] #2 Wheel in Copilot CLI pane scrolls its internal buffer, both before and after split
- [ ] #3 Scrollbar drag in alt-screen TUI panes forwards as wheel events to PTY
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed alt-screen scrollbar drag: added altScrollDragActive flag that defers scrollTop recentering until mouseup. Previously the handler recentered on every scroll event, which yanked the thumb back under the cursor mid-drag and made the scrollbar feel frozen. Now during a drag the scroll listener only fires wheel reports to the TUI; the recenter happens once on mouseup so the next drag has full range. Also raised spacer multiplier to 20x clientHeight so a single drag has plenty of travel. Verified via CDP: handler runs, scrollTop programmatically bumped settles back to center as expected.
<!-- SECTION:NOTES:END -->
