// Shared body primitives for pane-summary tooltips.
//
// PaneSummaryTooltip and SessionTitleTooltip both have to render the
// same set of states (ready / pending / unavailable / error) with the
// same CSS classes. They differ only in (a) preconditions before any
// status is consulted (e.g. "no AI session" or "Claude not supported")
// and (b) whether to surface stale text while a refresh is in flight.
//
// `renderSummaryStatus` covers the shared states; the wrappers handle
// their own preconditions and the "no summary yet" fallback.

import React from 'react';
import type { PaneSummary } from '../../shared/pane-summary-types';

export const MutedBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pane-summary-tooltip-body pane-summary-tooltip-muted">{children}</div>
);

export const ReadyBody: React.FC<{ text: string; meta?: React.ReactNode }> = ({ text, meta }) => (
  <div className="pane-summary-tooltip-body">
    <div className="pane-summary-tooltip-text">{text}</div>
    {meta}
  </div>
);

export interface SummaryStatusOptions {
  /** When true, surface stale `summary.text` during pending/error refresh
   *  states with a small meta line ("Refreshing…" / "Last refresh failed.").
   *  When false, always show the muted status message regardless of any
   *  stale text. */
  showStaleText: boolean;
}

/**
 * Render the body for the standard summary states.
 * Returns `undefined` when no opinion exists (idle, no summary, or
 * pending/error without text in non-stale mode) — the caller decides
 * what to show in those gaps.
 */
export function renderSummaryStatus(
  summary: PaneSummary | undefined,
  opts: SummaryStatusOptions,
): React.ReactNode | undefined {
  if (!summary) return undefined;

  if (summary.status === 'ready' && summary.text) {
    return <ReadyBody text={summary.text} />;
  }

  if (summary.status === 'unavailable') {
    return (
      <MutedBody>
        Summary not available: {summary.lastError ?? 'provider unavailable'}.
      </MutedBody>
    );
  }

  if (summary.status === 'pending') {
    if (opts.showStaleText && summary.text) {
      return (
        <ReadyBody
          text={summary.text}
          meta={<div className="pane-summary-tooltip-meta">Refreshing…</div>}
        />
      );
    }
    return <MutedBody>Generating summary…</MutedBody>;
  }

  if (summary.status === 'error') {
    if (opts.showStaleText && summary.text) {
      return (
        <ReadyBody
          text={summary.text}
          meta={<div className="pane-summary-tooltip-meta">Last refresh failed.</div>}
        />
      );
    }
    return (
      <MutedBody>
        Couldn't generate summary{summary.lastError ? `: ${summary.lastError}` : ''}.
      </MutedBody>
    );
  }

  // 'idle' or any other status — caller decides.
  return undefined;
}
