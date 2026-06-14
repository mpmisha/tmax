---
id: TASK-206
title: Self-healing task ID allocation (prevent duplicate IDs)
status: Done
assignee:
  - '@myself'
created_date: '2026-06-14 09:56'
updated_date: '2026-06-14 09:57'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backlog CLI tracks next_id in config.yml, which drifted and reused TASK-202 during this session (manual renumber needed). Users without the CLI rely on tmax's native writer. Hardened createTask: scans every subdir (tasks/completed/drafts/archive) for used ids, picks a guaranteed-free number, and writes with exclusive 'wx' flag so it never overwrites an existing file; retries with the next free id on EEXIST races.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 createTask never reuses an id present in any backlog subdir including archive
- [x] #2 Concurrent/colliding creates retry and resolve to distinct ids
- [x] #3 Write uses exclusive flag so an existing file is never clobbered
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened native createTask against duplicate ids. usedIds() scans tasks/completed/drafts/archive; nextId() picks a guaranteed-free number; write uses exclusive 'wx' flag and retries with the next free id on EEXIST. Root cause was the backlog CLI's stored next_id counter drifting (reused TASK-202) - our native writer scans disk instead. Verified by tests/e2e/task-186 (archived ids never reused; 6/6 pass).
<!-- SECTION:FINAL_SUMMARY:END -->
