import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTerminalStore } from '../state/terminal-store';

interface Msg { role: 'user' | 'assistant'; text: string; time: number }

function fmtDay(ts: number): string {
  if (!ts) return 'Unknown date';
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}
function fmtTime(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Right-docked, read-only chat transcript for an AI session, with a timestamp
 * per message (issue #124 / TASK-146). Claude Code persists assistant replies
 * so it shows both sides; Copilot only persists the user side, so it shows
 * your prompts. Opened from the AI pane's title-bar button.
 */
const TranscriptPanel: React.FC = () => {
  const session = useTerminalStore((s) => s.transcriptSession);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const close = () => useTerminalStore.setState({ transcriptSession: null });

  useEffect(() => {
    if (!session) return;
    setMsgs(null);
    let cancelled = false;
    (window.terminalAPI as any).getSessionTimeline(session.provider, session.sessionId)
      .then((rows: Msg[]) => {
        if (cancelled) return;
        setMsgs(Array.isArray(rows) ? rows : []);
        requestAnimationFrame(() => {
          if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        });
      })
      .catch(() => { if (!cancelled) setMsgs([]); });
    return () => { cancelled = true; };
  }, [session?.sessionId, session?.provider]);

  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [session]);

  const groups = useMemo(() => {
    const out: { day: string; items: Msg[] }[] = [];
    for (const m of msgs ?? []) {
      const day = fmtDay(m.time);
      let g = out[out.length - 1];
      if (!g || g.day !== day) { g = { day, items: [] }; out.push(g); }
      g.items.push(m);
    }
    return out;
  }, [msgs]);

  if (!session) return null;

  const userOnly = session.provider === 'copilot';

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <div className="transcript-titles">
          <span className="transcript-title">{session.title || 'Session'}</span>
          <span className="transcript-sub">
            {session.provider === 'claude-code' ? 'Claude Code' : 'Copilot'}
            {msgs ? ` · ${msgs.length} message${msgs.length === 1 ? '' : 's'}` : ''}
            {userOnly ? ' · your prompts' : ''}
          </span>
        </div>
        <button className="transcript-close" onClick={close} title="Close (Esc)" aria-label="Close">&#10005;</button>
      </div>
      <div className="transcript-body" ref={bodyRef}>
        {msgs === null && <div className="transcript-empty">Loading transcript…</div>}
        {msgs !== null && msgs.length === 0 && (
          <div className="transcript-empty">No messages found for this session.</div>
        )}
        {groups.map((g) => (
          <div className="transcript-group" key={g.day}>
            <div className="transcript-day">{g.day}</div>
            {g.items.map((m, i) => (
              <div className={`transcript-msg ${m.role}`} key={i}>
                <div className="transcript-bubble">{m.text}</div>
                <div className="transcript-time">{fmtTime(m.time)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptPanel;
