// TASK-169 / GH #117: when a TUI (Ink-based: Copilot CLI, Claude Code, fzf
// inline) enables xterm mouse tracking, xterm normally encodes wheel events
// as mouse-button reports and forwards them to the PTY. Ink-based TUIs
// don't actually USE wheel events, so the result is a pane where wheel
// does nothing. tmax now overrides this via attachCustomWheelEventHandler:
// when mouse mode is on, scroll xterm's buffer directly instead of
// forwarding. Shift+wheel is the explicit opt-in to forward to the TUI.
import { test, expect, Page } from '@playwright/test';
import { launchTmax } from './fixtures/launch';

async function writeToTerminal(window: Page, text: string): Promise<void> {
  await window.evaluate((t: string) => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    entry?.terminal.write(t);
  }, text);
}

async function getActiveMouseProtocol(window: Page): Promise<string> {
  return window.evaluate(() => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    const proto = (entry?.terminal as any)?._core?.coreMouseService?.activeProtocol;
    return proto || 'NONE';
  });
}

async function getViewportY(window: Page): Promise<number> {
  return window.evaluate(() => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    return entry?.terminal?.buffer?.active?.viewportY ?? 0;
  });
}

async function fillScrollback(window: Page, lines: number): Promise<void> {
  // Generate `lines` lines of distinguishable content so the buffer has
  // material to scroll through. Written in one batch so xterm's incremental
  // batching doesn't lose intermediate state.
  let body = '';
  for (let i = 0; i < lines; i++) body += `line-${i}\r\n`;
  await writeToTerminal(window, body);
  await window.waitForTimeout(200);
}

async function getTerminalCenter(window: Page): Promise<{ x: number; y: number }> {
  return window.evaluate(() => {
    const screen = document.querySelector('.terminal-panel .xterm-screen') as HTMLElement;
    const rect = screen.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

test.describe('TASK-169: wheel override when mouse tracking is on', () => {
  test('wheel scrolls xterm buffer even when mouse mode is on (no manual reset needed)', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(500);
      await window.click('.terminal-panel .xterm-screen');

      // Build up scrollback so wheel-up has somewhere to go.
      await fillScrollback(window, 200);

      // Turn on mouse tracking the way an Ink-based TUI would (no alt-screen).
      await writeToTerminal(window, '\x1b[?1000h\x1b[?1006h');
      await window.waitForTimeout(150);
      expect(await getActiveMouseProtocol(window), 'mouse mode should be on for the test').not.toBe('NONE');

      const before = await getViewportY(window);
      // Pan the wheel UP (negative deltaY = scroll up = see earlier rows).
      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -300);
      await window.waitForTimeout(200);

      const after = await getViewportY(window);
      // viewportY should decrease (scrolled up to earlier rows). If xterm
      // had forwarded the wheel to the PTY instead, viewportY wouldn't move.
      expect(after, `viewportY before=${before} after=${after} - wheel should have scrolled`).toBeLessThan(before);
    } finally {
      await close();
    }
  });

  test('Shift+wheel forwards to TUI (no buffer scroll) when mouse mode is on', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(500);
      await window.click('.terminal-panel .xterm-screen');

      await fillScrollback(window, 200);
      await writeToTerminal(window, '\x1b[?1000h\x1b[?1006h');
      await window.waitForTimeout(150);

      const before = await getViewportY(window);
      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.keyboard.down('Shift');
      await window.mouse.wheel(0, -300);
      await window.keyboard.up('Shift');
      await window.waitForTimeout(200);

      const after = await getViewportY(window);
      // Shift+wheel is the opt-in to forward to the TUI - xterm should NOT
      // have scrolled the buffer. viewportY unchanged.
      expect(after, `Shift+wheel should not scroll the buffer (before=${before} after=${after})`).toBe(before);
    } finally {
      await close();
    }
  });

  test('wheel still scrolls normally when mouse mode is off (regression guard)', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(500);
      await window.click('.terminal-panel .xterm-screen');

      await fillScrollback(window, 200);
      expect(await getActiveMouseProtocol(window)).toBe('NONE');

      const before = await getViewportY(window);
      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -300);
      await window.waitForTimeout(200);

      const after = await getViewportY(window);
      expect(after, 'wheel should scroll the buffer when mouse mode is off').toBeLessThan(before);
    } finally {
      await close();
    }
  });
});

test.describe('TASK-169: Command Palette manual reset', () => {
  test('"Reset Mouse Mode" command turns off active mouse tracking', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(500);
      await window.click('.terminal-panel .xterm-screen');

      // Turn on mouse tracking (Ink-style, no alt-screen).
      await writeToTerminal(window, '\x1b[?1000h\x1b[?1006h');
      await window.waitForTimeout(150);
      expect(await getActiveMouseProtocol(window)).not.toBe('NONE');

      // Open Command Palette and run "Reset Mouse Mode".
      await window.keyboard.press('Control+Shift+P');
      await window.waitForTimeout(200);
      await window.keyboard.type('reset mouse');
      await window.waitForTimeout(150);
      await window.keyboard.press('Enter');
      await window.waitForTimeout(250);

      // Modes should be off now.
      expect(await getActiveMouseProtocol(window)).toBe('NONE');
    } finally {
      await close();
    }
  });
});
