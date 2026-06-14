---
id: TASK-229
title: Thin blue stripe between pane color and bottom footer banner
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:54'
updated_date: '2026-06-14 12:24'
labels: []
dependencies: []
references:
  - backlog/attachments/task-229-blue-stripe.png
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On an AI pane there's a thin blue/accent stripe line between the pane's (purple) color border and the bottom 'last prompt' footer banner. Looks like an unintended border/focus line. Investigate the pane footer/banner top-border CSS (terminal-pane-latest-prompt banner) and the pane color border interaction. Reported 2026-06-14 with screenshot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No stray blue stripe between the pane border color and the footer banner
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reopened: the opacity fix did not resolve it - user still sees the blue stripe (it sits ABOVE the banner, between the tinted content and the banner, on all panes). Still investigating the true source.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root cause (third time's the charm): the blue stripe is the focused-pane inset accent ring, but it ONLY shows under Windows 11 mica/acrylic.

With transparency on, html.transparency-active makes .terminal-panel AND .xterm-viewport background:transparent. That removes the opaque terminal background that normally hides the focused ring (.terminal-panel.focused { box-shadow: inset 0 0 0 1px rgba(--rgb-accent,.3) }). The ring's bottom 1px segment then shows as a bright accent line right at the content/banner seam. The two prior fixes (z-index, then de-opacity-ing the banner) were tested in opaque mode where the stripe never appears, so they could not have moved it.

Verified with a faithful Playwright repro (real xterm + focused ring + maroon per-pane tint + prompt/search decorations): the stripe is absent in opaque mode and present only once transparency-active is toggled on.

Fix (CSS-only, global.css): add margin-top:-1px to .terminal-pane-latest-prompt so the opaque banner overlaps and covers the ring's bottom edge at the seam. The banner's own grey border-top keeps the separator; focused ring on the other three sides is untouched; imperceptible in opaque mode. Confirmed gone in the transparency repro, clean in opaque.
<!-- SECTION:FINAL_SUMMARY:END -->
