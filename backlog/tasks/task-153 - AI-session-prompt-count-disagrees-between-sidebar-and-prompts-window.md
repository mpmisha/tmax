---
id: TASK-153
title: AI session prompt count disagrees between sidebar and prompts window
status: Done
assignee: []
created_date: '2026-06-06 17:58'
updated_date: '2026-06-07 09:20'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For some sessions the AI Sessions sidebar shows a much higher prompt count than the prompts window / transcript for the same session (observed 2026-06-06: sidebar 22, prompts window 3). Root cause: two different data sources. The sidebar 'prompts' count is COUNT(*) of the turns table in Copilot's SQLite DB (copilot-session-db.ts queryTurnStats, surfaced as messageCount), while the prompts window reads user.message events from the session's events.jsonl (extractCopilotPrompts). They agree for normal sessions but diverge for resumed/continued sessions (cop --resume / --continue), where the new session's events.jsonl holds only the new turns but the turns DB carries inherited history. Same data-divergence family as TASK-152. Decide on a single source of truth (or relabel the sidebar count) so the number a user sees matches the prompts they can actually open.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sidebar prompt count and the prompts window agree for the same session, including resumed/continued sessions
- [ ] #2 Count reflects what the user can actually view, or is clearly labeled if it intentionally includes inherited history
- [ ] #3 No measurable sidebar slowdown (don't regress the SQLite fast path by parsing every events.jsonl)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Closed at user direction. Diagnosed: sidebar count = turns-DB COUNT(*); prompts window = events.jsonl user.message count; they diverge on resumed/continued sessions. No code fix shipped.
<!-- SECTION:FINAL_SUMMARY:END -->
