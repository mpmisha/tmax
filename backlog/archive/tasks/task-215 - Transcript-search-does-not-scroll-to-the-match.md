---
id: TASK-215
title: Transcript search does not scroll to the match
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 10:13'
updated_date: '2026-06-14 10:27'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Searching in the transcript panel highlights/finds a match but the view does not scroll to bring it into view. Reported 2026-06-14 with screenshot. Need to scrollIntoView the active match when navigating search results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Finding a match scrolls the transcript so the match is visible
- [x] #2 Next/prev match navigation keeps the active match in view
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Transcript search now scrolls reliably to the active match: replaced scrollIntoView (which could scroll the wrong ancestor) with deterministic container-relative centering of the hit in transcript-body, and added a searchActiveRef so the 2s live poll's auto-scroll-to-bottom no longer yanks the view off the match while searching.
<!-- SECTION:FINAL_SUMMARY:END -->
