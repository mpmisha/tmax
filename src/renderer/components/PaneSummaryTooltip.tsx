// PaneSummaryTooltip — terminal-keyed pane-summary tooltip.
//
// Thin wrapper over HoverTooltip that reads pane-summary state for a
// specific terminalId and produces state-aware body text. Used on tabs
// and pane headers, where each pane maps 1:1 to a terminalId.

import React from 'react';
import HoverTooltip from './HoverTooltip';
import { useTerminalStore } from '../state/terminal-store';
import type { TerminalId } from '../state/types';
import type { PaneSummary } from '../../shared/pane-summary-types';
import { MutedBody, renderSummaryStatus } from './summary-tooltip-body';

interface PaneSummaryTooltipProps {
  terminalId: TerminalId;
  children: React.ReactElement;
  /** Disable hover behaviour (e.g. while renaming). */
  disabled?: boolean;
}

const PaneSummaryTooltip: React.FC<PaneSummaryTooltipProps> = ({ terminalId, children, disabled }) => {
  const summary = useTerminalStore((s) => s.paneSummaries[terminalId]);
  const aiSessionId = useTerminalStore((s) => s.terminals.get(terminalId)?.aiSessionId);
  const requestPaneSummary = useTerminalStore((s) => s.requestPaneSummary);

  const onShow = () => {
    // If we have an AI session but no summary yet, kick off a request.
    // The auto-trigger hook normally handles this — but if the user
    // hovers earlier than the 5-min delay, honor their intent.
    if (aiSessionId && (!summary || summary.status === 'idle')) {
      requestPaneSummary(terminalId);
    }
  };

  const renderBody = () => renderPaneBody(aiSessionId, summary);

  return (
    <HoverTooltip disabled={disabled} renderBody={renderBody} onShow={onShow}>
      {children}
    </HoverTooltip>
  );
};

function renderPaneBody(
  aiSessionId: string | undefined,
  summary: PaneSummary | undefined,
): React.ReactNode | null {
  // No AI session linked → suppress the tooltip entirely so plain
  // terminals don't get a useless hover.
  if (!aiSessionId) return null;

  // Pane tooltips surface stale text during refresh so the user is
  // never left staring at a "Generating…" message when there's an old
  // result available.
  const statusBody = renderSummaryStatus(summary, { showStaleText: true });
  if (statusBody !== undefined) return statusBody;

  // Idle / no summary yet.
  return <MutedBody>Summary will appear once the session has a few prompts.</MutedBody>;
}

export default PaneSummaryTooltip;
