import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTerminalStore } from '../state/terminal-store';
import { prepareClipboardPaste } from '../utils/paste';

/**
 * Notepad-style scratchpad for composing long, multi-line prompts before
 * pasting them into the terminal. Opened from the per-pane context menu
 * (TerminalPanel → "📝 Prompt Editor").
 *
 * Why this exists: editing multi-line text directly in a terminal is
 * awkward - newlines and paste are fiddly, and a stray Enter submits a
 * half-written message. The composer is a plain <textarea> with three
 * actions in the footer:
 *   - Copy:   write the draft to the system clipboard.
 *   - Submit: bracketed-paste the draft into the focused terminal. We do
 *             NOT also press Enter - the user reviews in the terminal and
 *             hits Enter themselves. This is intentional: it avoids
 *             accidental submission of half-thought-out prompts, and
 *             Ink-based AI CLIs (Copilot CLI, Claude Code) handle a
 *             programmatic \r after bracketed paste inconsistently.
 *   - Close:  dismiss without sending (also bound to Esc and backdrop click).
 *
 * Drafts are kept per-terminal in the store for the current session so
 * closing and reopening the dialog doesn't lose work; they're dropped
 * when the owning pane is closed.
 */
const PromptComposer: React.FC = () => {
  const terminalId = useTerminalStore((s) => s.promptComposerRequest);
  const draft = useTerminalStore((s) =>
    terminalId ? s.composerDrafts[terminalId] ?? '' : ''
  );
  const setDraft = useTerminalStore((s) => s.setPromptComposerDraft);
  const close = useTerminalStore((s) => s.closePromptComposer);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Autofocus + Esc-to-close while the dialog is mounted. Reset transient
  // button feedback whenever a fresh composer instance opens.
  useEffect(() => {
    if (!terminalId) return;
    setCopied(false);
    setSubmitted(false);
    const t = setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        // Park the caret at the end so reopening with an existing draft
        // doesn't trap the user typing in the middle.
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [terminalId, close]);

  const onCopy = useCallback(() => {
    if (!draft) return;
    try {
      window.terminalAPI.clipboardWrite(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard surface failure is non-fatal */
    }
  }, [draft]);

  const onSubmit = useCallback(() => {
    if (!terminalId || !draft) return;
    // Reuse the shared paste helper so we get bracketed-paste wrapping
    // and CRLF→LF normalization for free (matters when users paste
    // Windows-CRLF content into the composer).
    const payload = prepareClipboardPaste(draft, true);
    try {
      window.terminalAPI.writePty(terminalId, payload);
      // Sent prompts shouldn't linger in the composer - clear the draft
      // so reopening for the same pane starts fresh.
      setDraft(terminalId, '');
      setSubmitted(true);
      setTimeout(() => {
        close();
      }, 250);
    } catch {
      /* terminal may have closed under us */
    }
  }, [terminalId, draft, close, setDraft]);

  // Paste an image as a file path (mirrors how a terminal pane handles image
  // paste): save the clipboard image to a temp file and insert its path at the
  // caret, so AI CLIs that accept image paths get a usable reference.
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const apiBridge = window.terminalAPI;
    // Only intercept when there's an image and no plain text (else paste text).
    if (!apiBridge.clipboardHasImage() || apiBridge.clipboardRead()) return;
    e.preventDefault();
    if (!terminalId) return;
    apiBridge.clipboardSaveImage().then((filePath) => {
      if (!filePath) return;
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = draft.slice(0, start) + filePath + draft.slice(end);
        setDraft(terminalId, next);
        requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = start + filePath.length; } catch { /* ignore */ } });
      } else {
        setDraft(terminalId, draft + filePath);
      }
    }).catch(() => { /* save failed */ });
  }, [terminalId, draft, setDraft]);

  if (!terminalId) return null;

  const hasText = draft.length > 0;

  return (
    <div className="palette-backdrop" onClick={close} style={{ paddingTop: 60 }}>
      <div
        className="prompt-composer-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Prompt Editor"
      >
        <div className="prompt-composer-header">
          <span className="prompt-composer-title">📝 Prompt Editor</span>
          <button
            className="prompt-composer-close-x"
            onClick={close}
            aria-label="Close"
            title="Close (Esc)"
          >
            &times;
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="prompt-composer-textarea"
          value={draft}
          onChange={(e) => setDraft(terminalId, e.target.value)}
          onPaste={onPaste}
          placeholder="Write your prompt here. Newlines, paste, and long text all work. Paste an image to insert its path. Use Copy or Submit when you're ready."
          spellCheck={false}
        />
        <div className="prompt-composer-footer">
          <button
            className="prompt-composer-btn"
            onClick={onCopy}
            disabled={!hasText}
            title="Copy the text to the clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            className="prompt-composer-btn prompt-composer-btn-primary"
            onClick={onSubmit}
            disabled={!hasText}
            title="Paste into the terminal (you press Enter to send)"
          >
            {submitted ? '✓ Sent' : '➤ Submit'}
          </button>
          <button
            className="prompt-composer-btn"
            onClick={close}
            title="Close without sending (Esc)"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptComposer;
