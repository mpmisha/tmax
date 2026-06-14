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

  // Pasted images are kept per-terminal as {path, dataUrl} pairs so the open
  // editor can render thumbnails while still passing the raw file path(s) to
  // the AI CLI on submit. Keyed by terminalId so switching panes (and the
  // store-backed draft) doesn't bleed attachments across composers.
  type Attachment = { path: string; dataUrl: string | null };
  const [attachmentsByTerminal, setAttachmentsByTerminal] = useState<
    Record<string, Attachment[]>
  >({});
  const attachments = terminalId ? attachmentsByTerminal[terminalId] ?? [] : [];

  const addAttachment = useCallback(
    (id: string, path: string) => {
      setAttachmentsByTerminal((prev) => {
        const list = prev[id] ?? [];
        if (list.some((a) => a.path === path)) return prev;
        return { ...prev, [id]: [...list, { path, dataUrl: null }] };
      });
      // Resolve the thumbnail data URL asynchronously; the path is already
      // tracked above so submit works even if the preview never loads.
      window.terminalAPI
        .imageReadAsDataUrl(path)
        .then((url) => {
          if (!url) return;
          setAttachmentsByTerminal((prev) => {
            const list = prev[id];
            if (!list) return prev;
            return {
              ...prev,
              [id]: list.map((a) => (a.path === path ? { ...a, dataUrl: url } : a)),
            };
          });
        })
        .catch(() => {
          /* preview unavailable; path still submits */
        });
    },
    []
  );

  const removeAttachment = useCallback((id: string, path: string) => {
    setAttachmentsByTerminal((prev) => {
      const list = prev[id];
      if (!list) return prev;
      return { ...prev, [id]: list.filter((a) => a.path !== path) };
    });
  }, []);

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
    if (!terminalId) return;
    // Append attached image paths (space-separated) so AI CLIs that accept
    // image-path arguments still receive them even though the textarea only
    // shows the typed prompt. Thumbnails replace the inline path text.
    const paths = attachments.map((a) => a.path);
    const combined = [draft, ...paths].filter(Boolean).join(' ');
    if (!combined) return;
    // Reuse the shared paste helper so we get bracketed-paste wrapping
    // and CRLF→LF normalization for free (matters when users paste
    // Windows-CRLF content into the composer).
    const payload = prepareClipboardPaste(combined, true);
    try {
      window.terminalAPI.writePty(terminalId, payload);
      // Sent prompts shouldn't linger in the composer - clear the draft and
      // attachments so reopening for the same pane starts fresh.
      setDraft(terminalId, '');
      setAttachmentsByTerminal((prev) => ({ ...prev, [terminalId]: [] }));
      setSubmitted(true);
      setTimeout(() => {
        close();
      }, 250);
    } catch {
      /* terminal may have closed under us */
    }
  }, [terminalId, draft, attachments, close, setDraft]);

  // Paste an image (mirrors how a terminal pane handles image paste): save the
  // clipboard image to a temp file and register it as an attachment so it shows
  // as a thumbnail strip below the editor. The raw path is no longer dumped
  // into the textarea - it's appended to the payload on submit instead, so AI
  // CLIs that accept image paths still get a usable reference.
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const apiBridge = window.terminalAPI;
    // Only intercept when there's an image and no plain text (else paste text).
    if (!apiBridge.clipboardHasImage() || apiBridge.clipboardRead()) return;
    e.preventDefault();
    if (!terminalId) return;
    apiBridge.clipboardSaveImage().then((filePath) => {
      if (!filePath) return;
      addAttachment(terminalId, filePath);
    }).catch(() => { /* save failed */ });
  }, [terminalId, addAttachment]);

  if (!terminalId) return null;

  const hasText = draft.length > 0;
  const canSubmit = hasText || attachments.length > 0;

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
          placeholder="Write your prompt here. Newlines, paste, and long text all work. Paste an image to attach it as a thumbnail. Use Copy or Submit when you're ready."
          spellCheck={false}
        />
        {attachments.length > 0 && (
          <div className="prompt-composer-attachments" aria-label="Attached images">
            {attachments.map((a) => (
              <div className="prompt-composer-attachment" key={a.path} title={a.path}>
                {a.dataUrl ? (
                  <img
                    className="prompt-composer-attachment-thumb"
                    src={a.dataUrl}
                    alt="Pasted image"
                  />
                ) : (
                  <div className="prompt-composer-attachment-thumb prompt-composer-attachment-placeholder">
                    🖼️
                  </div>
                )}
                <button
                  className="prompt-composer-attachment-remove"
                  onClick={() => removeAttachment(terminalId, a.path)}
                  aria-label="Remove attachment"
                  title="Remove attachment"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
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
            disabled={!canSubmit}
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
