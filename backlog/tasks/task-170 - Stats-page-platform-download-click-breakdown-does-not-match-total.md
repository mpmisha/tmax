---
id: TASK-170
title: 'Stats page: platform download-click breakdown does not match total'
status: To Do
assignee: []
created_date: '2026-06-13 14:26'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Spotted on the stats page (GoatCounter section). 'Download clicks by platform' sums to Windows 304 + macOS 103 + Linux 7 = 414, but the 'Download Clicks (all platforms)' card shows 384. The per-platform breakdown exceeds the total by 30, the opposite of the documented expectation (the code comment notes old clicks before the per-platform-event fix should be MISSING from the breakdown, i.e. breakdown < total). Also UNIQUE VISITORS shows a hard 0 from GoatCounter, which cascades CLICK-THROUGH RATE to n/a - worth confirming GoatCounter is still reporting. Separate from the install-count fix in TASK-169; this is the GoatCounter/landing-page click-event path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Per-platform click breakdown reconciles with the total download-clicks figure (or the discrepancy is understood and documented)
- [ ] #2 Confirm whether GoatCounter unique-visitors=0 is a reporting outage or expected
<!-- AC:END -->
