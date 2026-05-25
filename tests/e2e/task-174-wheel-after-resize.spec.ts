// TASK-174 regression guard.
//
// When an Ink-based TUI (Copilot CLI / Claude Code / fzf inline) enables xterm
// mouse tracking AND the pane has been resized recently (terminal fit, focus-mode
// toggle, side-panel open, window resize), xterm's internal
// `_ignoreNextScrollEvent` flag is set during `_innerRefresh` so that the
// programmatic `viewport.scrollTop = ydisp * rowHeight` it issues doesn't
// double-fire its own scroll handler. The flag stays set until the next
// scroll event consumes it.
//
// The previous wheel-interception fix manipulated `.xterm-viewport.scrollTop`
// directly. When that manual write happened while `_ignoreNextScrollEvent`
// was still set, xterm's scroll handler saw the flag, cleared it, and fired
// an `onRequestScrollLines({amount: 0})` - so ydisp DID NOT MOVE. The canvas
// stayed at the same row even though scrollTop visibly slid, which the user
// experiences as "the wheel does nothing" plus a phantom scrollbar drift.
//
// Fix: route the wheel through `term.scrollLines()` (xterm's public API) so
// ydisp is updated by the buffer service directly, and xterm's own
// _innerRefresh syncs viewport.scrollTop on the next frame. No collision
// with _ignoreNextScrollEvent.
import { test, expect, Page } from '@playwright/test';
import { launchTmax } from './fixtures/launch';

async function writeToTerminal(window: Page, text: string): Promise<void> {
  await window.evaluate((t: string) => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    entry?.terminal.write(t);
  }, text);
}

async function getViewportY(window: Page): Promise<number> {
  return window.evaluate(() => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    return entry?.terminal?.buffer?.active?.viewportY ?? 0;
  });
}

async function getTerminalCenter(window: Page): Promise<{ x: number; y: number }> {
  return window.evaluate(() => {
    const screen = document.querySelector('.terminal-panel .xterm-screen') as HTMLElement;
    const rect = screen.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

test.describe('TASK-174: wheel still works after a resize while mouse tracking is on', () => {
  test('wheel scrolls the buffer even after a resize+mouse-tracking-on combo', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(600);
      await window.click('.terminal-panel .xterm-screen');

      // Fill enough scrollback that there's plenty of room to scroll up.
      let body = '';
      for (let i = 0; i < 1000; i++) body += `cli-line-${i}\r\n`;
      await writeToTerminal(window, body);
      await window.waitForTimeout(300);

      // Enable mouse tracking the way Ink TUIs do (no alt-screen).
      await writeToTerminal(window, '\x1b[?1000h\x1b[?1002h\x1b[?1006h');
      await window.waitForTimeout(200);

      // Trigger a resize. This causes xterm's _innerRefresh to set
      // _ignoreNextScrollEvent=true after its programmatic scrollTop sync,
      // which is the precondition for the bug.
      await window.setViewportSize({ width: 1100, height: 700 });
      await window.waitForTimeout(500);

      const before = await getViewportY(window);
      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -500);
      await window.waitForTimeout(300);
      const after = await getViewportY(window);

      // The previous scrollTop-based handler would leave viewportY unchanged
      // here because the manual scrollTop write was swallowed by
      // _ignoreNextScrollEvent. With the scrollLines() routing it moves.
      expect(after, `viewportY before=${before} after=${after} - wheel should have scrolled even after resize`).toBeLessThan(before);
    } finally {
      await close();
    }
  });
});
