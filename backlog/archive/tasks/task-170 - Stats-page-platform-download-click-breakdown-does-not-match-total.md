---
id: TASK-170
title: 'Stats page: platform download-click breakdown does not match total'
status: Done
assignee: []
created_date: '2026-06-13 14:26'
updated_date: '2026-06-13 16:46'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Spotted on the stats page (GoatCounter section). 'Download clicks by platform' sums to Windows 304 + macOS 103 + Linux 7 = 414, but the 'Download Clicks (all platforms)' card shows 384. The per-platform breakdown exceeds the total by 30, the opposite of the documented expectation (the code comment notes old clicks before the per-platform-event fix should be MISSING from the breakdown, i.e. breakdown < total). Also UNIQUE VISITORS shows a hard 0 from GoatCounter, which cascades CLICK-THROUGH RATE to n/a - worth confirming GoatCounter is still reporting. Separate from the install-count fix in TASK-169; this is the GoatCounter/landing-page click-event path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Per-platform click breakdown reconciles with the total download-clicks figure (or the discrepancy is understood and documented)
- [x] #2 Confirm whether GoatCounter unique-visitors=0 is a reporting outage or expected
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Both GoatCounter anomalies on the stats page were real bugs, now fixed in docs/stats-*.html.

Unique Visitors '0': the GoatCounter /counter/TOTAL.json endpoint returns counts as strings with a space thousands-separator for values >= 1000 (e.g. {"count_unique":"2 278"}). Number("2 278") is NaN, coerced to 0. Sub-1000 counters (dl=384, per-platform) had no separator so they parsed fine - which is why only this tile broke. Fixed the parser to strip all non-numeric chars; real value is 2,278.

Breakdown (414) > total (384): the headline used the standalone 'dl' aggregate event, which is fired by a delegated listener added AFTER the per-platform events already existed, so it undercounts history. Changed the headline 'Download Clicks' to be the SUM of the per-platform breakdown, so total and cards reconcile by construction (414=414) and use the longer history. CTR now computes (414/2278 = 18.2%) instead of n/a.
<!-- SECTION:FINAL_SUMMARY:END -->
