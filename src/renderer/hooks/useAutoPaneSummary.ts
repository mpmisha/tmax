// useAutoPaneSummary — Task pane-summary (T3)
//
// Per-pane scheduler that fires the auto-summary at the right time:
//
//   1. The pane must be linked to a Copilot AI session.
//   2. At least `delayMs` (default 5 min) must have passed since the
//      pane was created OR since the session became active.
//   3. The session must have ≥3 user prompts (otherwise the summary
//      would be uselessly generic).
//   4. We re-fire whenever messageCount jumps by ≥5 since the last
//      successful summary, with a cooldown to avoid churn during a
//      rapid burst of prompts.
//
// We deliberately DO NOT auto-fire on hover. Hover triggers a render of
// the existing summary or — if none exists — kicks off a request via
// the same hook's `request()` action when status === 'idle'. That's
// owned by the tooltip component, not this hook.
//
// One useAutoPaneSummary hook instance lives at the App level and
// watches the entire store. We keep last-fired bookkeeping in a ref
// so it doesn't trigger re-renders.

import { useEffect, useRef } from 'react';
import { useTerminalStore } from '../state/terminal-store';
import { DEFAULT_PANE_SUMMARY_CONFIG } from '../../shared/pane-summary-types';
import type { TerminalId } from '../state/types';

const MIN_PROMPTS_FOR_FIRST_SUMMARY = 3;
const MESSAGE_DELTA_FOR_REFRESH = 5;
/** Don't re-fire more than once per cooldown window per pane, even on a
 *  big messageCount jump. */
const REFRESH_COOLDOWN_MS = 90 * 1000;
/** How often the scheduler tick runs. */
const TICK_INTERVAL_MS = 30 * 1000;

interface PerPaneBookkeeping {
  /** ms since epoch when we last fired a request (success OR fail). */
  lastFiredAt: number;
  /** messageCount the last successful summary was generated against. */
  lastSummarisedMessageCount: number;
}

export function useAutoPaneSummary(): void {
  const bookkeeping = useRef(new Map<TerminalId, PerPaneBookkeeping>());

  useEffect(() => {
    const evaluate = () => {
      const state = useTerminalStore.getState();
      const config = state.config?.paneSummary ?? DEFAULT_PANE_SUMMARY_CONFIG;
      if (!config.enabled) return;

      const now = Date.now();
      const delayMs = config.delayMs ?? DEFAULT_PANE_SUMMARY_CONFIG.delayMs;

      for (const [terminalId, terminal] of state.terminals) {
        if (!terminal.aiSessionId) continue;

        // Look up the linked AI session (v1 = copilot only).
        const session = state.copilotSessions.find((s) => s.id === terminal.aiSessionId);
        if (!session) continue;

        // Need a sense of "session age" — use createdAt if present,
        // otherwise lastActivityTime minus delayMs (gives us the first
        // possible auto-fire as soon as we discover an old session).
        const sessionAge = session.createdAt ? now - session.createdAt : Number.POSITIVE_INFINITY;
        if (sessionAge < delayMs) continue;

        if (session.messageCount < MIN_PROMPTS_FOR_FIRST_SUMMARY) continue;

        const existing = state.paneSummaries[terminalId];
        const book = bookkeeping.current.get(terminalId);

        // First-ever summary for this pane.
        if (!existing || existing.status === 'idle') {
          if (book && now - book.lastFiredAt < REFRESH_COOLDOWN_MS) continue;
          bookkeeping.current.set(terminalId, {
            lastFiredAt: now,
            lastSummarisedMessageCount: book?.lastSummarisedMessageCount ?? 0,
          });
          state.requestPaneSummary(terminalId);
          continue;
        }

        // Already pending — leave it alone.
        if (existing.status === 'pending') continue;

        // Permanent state for this provider — never retry, BUT only when
        // the unavailable marker is for this pane's *current* session.
        // If the pane was re-linked to a different session, the stale
        // unavailable summary should not block a fresh attempt.
        if (existing.status === 'unavailable' && existing.sessionId === session.id) continue;
        if (existing.status === 'unavailable') {
          // Stale unavailable from a prior session — clear and try fresh.
          state.clearPaneSummary(terminalId);
        }

        // Successful previous summary — refresh on big growth.
        if (existing.status === 'ready') {
          const lastCount = book?.lastSummarisedMessageCount ?? 0;
          const growth = session.messageCount - lastCount;
          if (growth >= MESSAGE_DELTA_FOR_REFRESH
              && (!book || now - book.lastFiredAt >= REFRESH_COOLDOWN_MS)) {
            bookkeeping.current.set(terminalId, {
              lastFiredAt: now,
              lastSummarisedMessageCount: session.messageCount,
            });
            state.requestPaneSummary(terminalId);
          }
          continue;
        }

        // status === 'error' — retry after one cooldown, not on every tick.
        if (existing.status === 'error') {
          if (book && now - book.lastFiredAt < REFRESH_COOLDOWN_MS) continue;
          bookkeeping.current.set(terminalId, {
            lastFiredAt: now,
            lastSummarisedMessageCount: book?.lastSummarisedMessageCount ?? 0,
          });
          state.requestPaneSummary(terminalId);
        }
      }
    };

    // Run once shortly after mount so newly-created panes don't wait
    // a full tick interval.
    const initial = setTimeout(evaluate, 5_000);
    const tick = setInterval(evaluate, TICK_INTERVAL_MS);

    // When a summary lands, update the bookkeeping snapshot so the
    // delta check works correctly next tick.
    const unsub = useTerminalStore.subscribe((state, prev) => {
      if (state.paneSummaries === prev.paneSummaries) return;
      for (const [terminalId, summary] of Object.entries(state.paneSummaries)) {
        if (summary.status !== 'ready') continue;
        const linked = state.terminals.get(terminalId);
        if (!linked || !linked.aiSessionId) continue;
        const session = state.copilotSessions.find((s) => s.id === linked.aiSessionId);
        if (!session) continue;
        const existing = bookkeeping.current.get(terminalId) ?? {
          lastFiredAt: 0,
          lastSummarisedMessageCount: 0,
        };
        existing.lastSummarisedMessageCount = session.messageCount;
        bookkeeping.current.set(terminalId, existing);
      }
    });

    // Drop bookkeeping entries for closed panes.
    const cleanupUnsub = useTerminalStore.subscribe((state, prev) => {
      if (state.terminals === prev.terminals) return;
      for (const id of bookkeeping.current.keys()) {
        if (!state.terminals.has(id)) bookkeeping.current.delete(id);
      }
    });

    return () => {
      clearTimeout(initial);
      clearInterval(tick);
      unsub();
      cleanupUnsub();
    };
  }, []);
}
