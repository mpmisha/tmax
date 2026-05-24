// HoverTooltip — shared infrastructure for pane-summary tooltips
//
// Handles the parts that are identical across every summary tooltip:
//   - 500ms hover-intent delay
//   - portal render anchored under the wrapped element
//   - viewport-clamped centred positioning
//   - timer cleanup on unmount / leave
//   - display:contents wrapper that walks into firstElementChild so
//     flex layouts (tabs!) keep their original sizing and the
//     getBoundingClientRect() call returns a real rect.
//
// Each caller (PaneSummaryTooltip, SessionTitleTooltip) supplies:
//   - renderBody(): the state-specific tooltip content (return null to suppress)
//   - onShow():     fired once the tooltip becomes visible (e.g. to kick off a
//                   summary request)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';

const HOVER_DELAY_MS = 500;
const TOOLTIP_OFFSET_Y = 8;
const TOOLTIP_MAX_WIDTH = 360;

export interface HoverTooltipProps {
  children: React.ReactElement;
  disabled?: boolean;
  /** Render the tooltip body. Return null to hide the tooltip entirely. */
  renderBody: () => React.ReactNode | null;
  /** Called once when the tooltip becomes visible (after the hover delay). */
  onShow?: () => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
}

function positionFor(target: HTMLElement): { x: number; y: number } {
  // Wrapper uses display:contents and has no box of its own. Walk into
  // the first child for a real rect; fall back to the wrapper if needed.
  const childEl = (target.firstElementChild as HTMLElement | null) ?? target;
  let rect = childEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    rect = target.getBoundingClientRect();
  }
  const x = Math.max(
    8,
    Math.min(
      window.innerWidth - TOOLTIP_MAX_WIDTH - 8,
      rect.left + rect.width / 2 - TOOLTIP_MAX_WIDTH / 2,
    ),
  );
  const y = rect.bottom + TOOLTIP_OFFSET_Y;
  return { x, y };
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({ children, disabled, renderBody, onShow }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    const target = e.currentTarget as HTMLElement;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const { x, y } = positionFor(target);
      setTooltip({ visible: true, x, y });
      onShow?.();
    }, HOVER_DELAY_MS);
  }, [disabled, onShow]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTooltip({ visible: false, x: 0, y: 0 });
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const body = tooltip.visible ? renderBody() : null;

  return (
    <>
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'contents' }}
      >
        {children}
      </span>
      {tooltip.visible && body !== null && ReactDOM.createPortal(
        <div
          className="pane-summary-tooltip"
          role="tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            maxWidth: TOOLTIP_MAX_WIDTH,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          {body}
        </div>,
        document.body,
      )}
    </>
  );
};

export default HoverTooltip;
