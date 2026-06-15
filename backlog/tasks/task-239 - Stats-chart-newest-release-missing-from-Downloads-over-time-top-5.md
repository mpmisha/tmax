---
id: TASK-239
title: 'Stats chart: newest release missing from ''Downloads over time'' top-5'
status: Done
assignee: []
created_date: '2026-06-15 06:43'
updated_date: '2026-06-15 06:43'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the stats page, the latest release (v1.11.0) was absent from the 'Downloads over time' chart legend despite having the most downloads. Root cause: in cumulative mode the top-5 ranking used activity = last.count - points[0].count (first IN-WINDOW sample). A release born inside the visible window has its first sample already at its plateau (it spikes to its full count between two snapshots), so last - first is ~0 and it loses every top-5 slot. Fix computes the baseline from full unbucketed/unzoomed history: if a key has no snapshot before the window AND debuted after sampling began, its baseline is 0 (whole in-window count is real activity); otherwise it falls back to the pre-window count (or first in-window value for ancient pre-sampling releases). Verified by replaying live download-history.json over the screenshot's zoom window: old top-5 reproduced the bug exactly, new ranking puts v1.11.0 at #4. File: docs/stats-5d5f6800d035.html.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A release that debuts inside the visible/zoomed window is ranked by its full in-window install count, not last-minus-first
- [x] #2 Pre-existing releases still ranked by in-window drift (no regression to favor-oldest)
- [x] #3 Full (unzoomed) view unaffected for releases present at first snapshot
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the top-5 ranking baseline in docs/stats-5d5f6800d035.html so a release born inside the visible window is scored by its full in-window install count instead of last-minus-first (~0).

Changes:
- Build a full, unbucketed, unzoomed per-key series (fullSeries) alongside the windowed series.
- baselineFor(key, points): use the key's cumulative count at the last snapshot before the window opened; if none and the key debuted after sampling began, baseline = 0; else fall back to first in-window value (preserves original behaviour for ancient pre-sampling releases).
- activity() now takes (key, points) and subtracts the computed baseline.

Verification:
- Replayed live download-history.json over the screenshot's zoom window (06/05->06/15). Old ranking reproduced the bug exactly (top-5: v1.10.0, v1.10.1, v1.9.3, v1.9.1, v1.9.2 - matches the screenshot legend); new ranking promotes v1.11.0 from rank #21 to #4.

Note: v1.11.0's headline 1,146 downloads is dominated by the macOS portable .zip (815) and .nupkg fetches, which the chart excludes by design as auto-updates (task-169). Its real in-window install count is 33; the fix only corrects ranking, not the exclusion.
<!-- SECTION:FINAL_SUMMARY:END -->
