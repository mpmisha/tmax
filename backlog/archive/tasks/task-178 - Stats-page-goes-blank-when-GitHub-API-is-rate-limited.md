---
id: TASK-178
title: Stats page goes blank when GitHub API is rate-limited
status: Done
assignee: []
created_date: '2026-06-13 16:46'
updated_date: '2026-06-13 16:47'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reported live: the stats page top section (TOTAL USERS / AUTO-UPDATES / RELEASES cards and the 'new installs by version' chart) intermittently rendered as '-' with an empty chart, while the GoatCounter section still worked. Root cause: load() fetched api.github.com/repos/InbarR/tmax/releases live and unauthenticated (60 req/hour PER IP, trivially exhausted behind a shared corporate NAT). On a 403 the response is an error object, not an array; load() had no try/catch, so iterating it threw and left the cards blank and renderChart uncalled. Fix: fetchReleases() now falls back to the committed docs/download-history.json snapshot (refreshed every 6h by the Track Downloads workflow) when the API is unavailable, and the date-dependent rendering degrades gracefully since snapshots carry no publish dates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Summary cards and install chart render even when the GitHub API returns non-array / 403
- [x] #2 Fallback uses the latest download-history.json snapshot
- [x] #3 Missing publish dates degrade gracefully (no 'Invalid Date' / bogus 'days ago')
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the stats page (docs/stats-*.html) going blank under GitHub API rate limiting.

Root cause: load() called the unauthenticated GitHub API (60 req/hr per IP - exhausted behind a shared corporate NAT) with no error handling. A 403 returns a non-array, so iterating it threw, leaving cards as '-' and the chart empty. The GoatCounter section was unaffected (separate fetches), which is why only the top half broke.

Fix: added fetchReleases() which tries the live API first, then falls back to the committed docs/download-history.json snapshot (the Track Downloads workflow refreshes it every 6h) so the page never goes empty. Snapshots have no publish dates, so released published_at is null; relativeDate() and the chart's date sub-label now skip gracefully instead of rendering 'Invalid Date' or a bogus 'days ago'. Verified the fallback yields TOTAL USERS 2,937 / AUTO-UPDATES 17,449 / 39 releases from the current snapshot.
<!-- SECTION:FINAL_SUMMARY:END -->
