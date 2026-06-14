---
id: TASK-150
title: >-
  Fix memory leaks: bound notification Maps, session caches, detached listeners
  (GH #129)
status: Done
assignee: []
created_date: '2026-06-05 10:05'
updated_date: '2026-06-05 10:11'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #129 (m-tantan, verified): module-level structures grow unbounded over long sessions -> freeze/OOM. (1) copilot-notification.ts lastNotified/lastStatus Maps only cleared on quit. (2) copilot/claude session-monitor cachedCandidates never capped. (3) recentBodyKeys filtered only on call, no hard cap. (4) detached-window listeners may leak on pop-out/close. Add TTL/size caps + ensure listener cleanup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 lastNotified/lastStatus are bounded (age or size eviction); entries for removed sessions are dropped
- [x] #2 cachedCandidates is capped or periodically invalidated
- [x] #3 recentBodyKeys has a hard size cap
- [x] #4 detached-window listeners are removed on window close
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bounded the long-running caches from GH #129. (1) copilot-notification lastNotified/lastStatus: FIFO size cap (500) + forgetNotificationState() wired to onSessionRemoved for Copilot + Claude Code. (2) cachedCandidates capped at 1000 (most-recent) in both monitors, at the disk-scan build and runtime unshift. (3) recentBodyKeys hard-capped (>100 -> last 50). (4) Detached-window listeners: confirmed NOT a leak - they live on the per-window object, removed from the map + GC'd on 'closed'. Shipped in c8f751a.
<!-- SECTION:FINAL_SUMMARY:END -->
