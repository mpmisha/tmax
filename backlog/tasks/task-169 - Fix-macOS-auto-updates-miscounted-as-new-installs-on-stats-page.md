---
id: TASK-169
title: Fix macOS auto-updates miscounted as new installs on stats page
status: Done
assignee: []
created_date: '2026-06-13 14:25'
updated_date: '2026-06-13 14:26'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The stats page (docs/stats-*.html) classified macOS Squirrel.Mac update payloads (tmax-darwin-<arch>-<ver>.zip) as new installs. IS_UPDATE only stripped Windows .nupkg, so every macOS auto-update (11,433 fetches vs only 586 real .dmg installs) inflated TOTAL USERS and the 'new installs by version' chart, turning it into a wall of green and undercounting AUTO-UPDATES. Fixed IS_UPDATE to also match darwin .zip. TOTAL USERS 17,359 -> 2,878; AUTO-UPDATES 2,922 -> 14,236; installs-by-OS now Windows 2,099 / macOS 586 / Linux 193, matching the download-click ratio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 macOS darwin update zips are excluded from new-install counts on the stats page
- [x] #2 Windows portable (win32 .zip) and Linux .zip remain counted as installs
- [x] #3 TOTAL USERS, AUTO-UPDATES, new-installs chart and platform timeline all reflect the corrected classification
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root cause: IS_UPDATE in docs/stats-*.html only matched Windows .nupkg, so macOS Squirrel.Mac update payloads (tmax-darwin-*.zip) were counted as new installs. Every macOS auto-update re-downloads that zip, so 11,433 update fetches (vs 586 real .dmg installs) flooded the new-installs-by-version chart with green and inflated TOTAL USERS.

Fix: extended IS_UPDATE to also match /darwin.*\.zip$/i. One line, corrects all four computed surfaces (TOTAL USERS, AUTO-UPDATES card, new-installs chart, platform-stacked timeline) since they share the predicate. Windows portable (win32) and Linux zips stay counted - those platforms don't auto-update via zip.

Verified against latest download-history.json snapshot: TOTAL USERS 17,359 -> 2,878, AUTO-UPDATES 2,922 -> 14,236, installs-by-OS Windows 2,099 / macOS 586 / Linux 193 (now matches the ~3:1 Windows:macOS landing-page download-click ratio).
<!-- SECTION:FINAL_SUMMARY:END -->
