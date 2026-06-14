/**
 * Global registry for xterm Terminal instances and their SearchAddons.
 * Used by components (e.g. PromptsDialog) that need to search/scroll
 * a terminal without holding a direct ref.
 */
import type { Terminal } from '@xterm/xterm';
import type { SearchAddon } from '@xterm/addon-search';

interface TerminalEntry {
  terminal: Terminal;
  searchAddon: SearchAddon;
  // Test-only hook for flipping bracketed-paste state without round-tripping
  // through the PTY data listener. Production code never calls this.
  setBracketedPasteForTest?: (value: boolean) => void;
}

const registry = new Map<string, TerminalEntry>();

export function registerTerminal(
  id: string,
  terminal: Terminal,
  searchAddon: SearchAddon,
  setBracketedPasteForTest?: (value: boolean) => void,
): void {
  registry.set(id, { terminal, searchAddon, setBracketedPasteForTest });
}

export function unregisterTerminal(id: string): void {
  registry.delete(id);
}

export function getTerminalEntry(id: string): TerminalEntry | undefined {
  return registry.get(id);
}

export function getAllTerminals(): Terminal[] {
  return Array.from(registry.values()).map((e) => e.terminal);
}

/**
 * Best-effort read of the text the user has typed on the current input line,
 * used to seed the prompt composer. Reads the cursor row up to the caret and
 * strips terminal chrome: box-drawing chars (AI-CLI input boxes) and a leading
 * shell prompt (PowerShell / cmd / generic `>`/`❯`). Heuristic - returns '' if
 * nothing meaningful is found.
 */
export function getCurrentInputLine(id: string): string {
  const entry = registry.get(id);
  if (!entry) return '';
  const buf = entry.terminal.buffer.active;
  const line = buf.getLine(buf.baseY + buf.cursorY);
  if (!line) return '';
  // Full cursor row (trimmed right), not just up to the caret - the caret may
  // sit mid-line. (Multi-line input in an AI-CLI box can't be reliably read.)
  let text = line.translateToString(true);
  // Box-drawing / block chars -> spaces (Copilot/Claude input boxes).
  text = text.replace(/[─-▟]/g, ' ').trimStart();
  // Strip a leading shell prompt, if present.
  text = text
    .replace(/^PS [^>]*>\s*/, '')
    .replace(/^[A-Za-z]:\\[^>]*>\s*/, '')
    .replace(/^[>❯➜»]\s*/, '');
  return text.trim();
}
