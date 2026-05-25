---
id: TASK-180
title: >-
  Fix stuck dnd-kit drag state breaks pointer input on previous pane after
  opening new tab (GH #115)
status: In Progress
assignee:
  - '@claude-agent'
created_date: '2026-05-24 17:56'
updated_date: '2026-05-24 17:57'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
macOS users on v1.9.0 report that opening a new tab/workspace breaks mouse-wheel scroll and drag-text-selection on the previously-active pane while keyboard input keeps working. Root cause is that the dnd-kit drag-state flag (isDragging) can get stuck true when a drag is interrupted by a workspace switch, leaving PaneDropZones mounted with pointer-events: auto on top of every pane and swallowing wheel + mousedown events. App restart is the only recovery; Cmd+Ctrl+R does not help because the overlay sits outside the xterm container.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Global pointercancel + window blur + visibilitychange listeners force dnd-kit drag flag back to false on any interruption
- [ ] #2 PaneDropZones layer is inert (pointer-events: none) unless a drag is actually active, so a stuck React flag cannot lock pane input
- [ ] #3 onMouseDownCapture stopPropagation never fires on .xterm-screen or .xterm-viewport so selection-start mousedown always reaches xterm
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a defensive layer in PaneDropZones: container stays mounted with data-dragging attr; pointer-events on zones flips via CSS only when data-dragging=true.\n2. Wire a global drag-state reset effect in App.tsx (or near DndContext): pointercancel + dragend + window.blur + visibilitychange listeners that call setDragging(false) so a stuck flag cannot persist across a workspace switch / window blur.\n3. Narrow onMouseDownCapture stopPropagation in TerminalPanel so it never fires on .xterm-screen / .xterm-viewport (already excludes some but verify includes selection-target).\n4. Verify wheel listener cleanup pattern in TerminalPanel uses captured element ref (already in place from #48 fix).\n5. Typecheck. Commit single coherent fix.
<!-- SECTION:PLAN:END -->
