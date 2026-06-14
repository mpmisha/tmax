---
id: TASK-218
title: Match Backlog window header icons to the preview panel style
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:18'
updated_date: '2026-06-14 10:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Backlog header icons were inconsistent with the file-preview panel; the show-archived 🗄 was a color emoji that rendered as a broken box on Windows. Replaced it with a clean inline-SVG archive icon (currentColor, monochrome) and switched the move-side glyph to ◀/▶ to match the preview toolbar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Show-archived uses a crisp monochrome icon, not a broken emoji
- [x] #2 Move-side arrows match the preview panel
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced broken 🗄 emoji with an inline-SVG archive icon; move-side now uses ◀/▶ to match the preview toolbar.

Extended: converted the whole Backlog header to inline Feather-style SVG icons (refresh, archive, move-side arrows, expand/dock, close) instead of font glyphs, with a spin animation on refresh while loading.
<!-- SECTION:FINAL_SUMMARY:END -->
