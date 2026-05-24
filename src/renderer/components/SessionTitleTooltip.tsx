// SessionTitleTooltip — session-keyed pane-summary tooltip.
//
// Used in the CopilotPanel sidebar, where the anchor is a session
// (not a terminal). When at least one terminal is linked to the
// session we drive the summary request via that terminalId (cache is
// session-keyed internally so any linked terminal works). When no
// terminal is linked we still show any cached result and otherwise
// nudge the user to open the session in a tab.

import React from 'react';
import HoverTooltip from './HoverTooltip';
import { useTerminalStore } from '../state/terminal-store';
import type { PaneSummary } from '../../shared/pane-summary-types';
import { MutedBody, renderSummaryStatus } from './summary-tooltip-body';

interface Props {
  sessionId: string;
  provider: 'copilot' | 'claude-code';
  /** Session message count — gates the "needs a few prompts" hint. */
  messageCount: number;
  children: React.ReactElement;
  disabled?: boolean;
}

const SessionTitleTooltip: React.FC<Props> = ({ sessionId, provider, messageCount, children, disabled }) => {
  const linkedTerminalId = useTerminalStore((s) => {
    for (const [tid, t] of s.terminals) {
      if (t.aiSessionId === sessionId) return tid;
    }
    return null;
  });

  const summary: PaneSummary | undefined = useTerminalStore((s) => {
    if (linkedTerminalId) {
      const fromLinked = s.paneSummaries[linkedTerminalId];
      if (fromLinked) return fromLinked;
    }
    // Defensive scan: a terminal may have closed but the result is still
    // cached against its old id.
    for (const ps of Object.values(s.paneSummaries)) {
      if (ps.sessionId === sessionId && ps.status === 'ready') return ps;
    }
    return undefined;
  });

  const requestPaneSummary = useTerminalStore((s) => s.requestPaneSummary);

  const onShow = () => {
    if (linkedTerminalId && (!summary || summary.status === 'idle')) {
      requestPaneSummary(linkedTerminalId);
    }
  };

  const renderBody = () => renderSessionBody(provider, messageCount, linkedTerminalId !== null, summary);

  return (
    <HoverTooltip disabled={disabled} renderBody={renderBody} onShow={onShow}>
      {children}
    </HoverTooltip>
  );
};

function renderSessionBody(
  provider: 'copilot' | 'claude-code',
  messageCount: number,
  hasLinkedTerminal: boolean,
  summary: PaneSummary | undefined,
): React.ReactNode | null {
  // v1 — only Copilot is wired into the summarizer.
  if (provider !== 'copilot') {
    return <MutedBody>AI summary is available for Copilot sessions only (v1).</MutedBody>;
  }

  // Sidebar tooltips do not surface stale text — when a refresh is in
  // flight we want a clean "Generating…" message rather than text that
  // may no longer reflect the session.
  const statusBody = renderSummaryStatus(summary, { showStaleText: false });
  if (statusBody !== undefined) return statusBody;

  if (!hasLinkedTerminal) {
    return <MutedBody>Open this session in a tab to generate an AI summary.</MutedBody>;
  }
  if (messageCount < 3) {
    return <MutedBody>Summary will appear once the session has a few prompts.</MutedBody>;
  }
  return <MutedBody>Generating summary…</MutedBody>;
}

export default SessionTitleTooltip;
