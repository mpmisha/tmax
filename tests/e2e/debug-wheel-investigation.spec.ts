/**
 * Debug investigation for wheel-scroll regression.
 *
 * Drives the packaged tmax build through all six scenarios from the task spec
 * and dumps full state (mouseTrackingMode, viewportY, baseY, scrollTop,
 * scrollHeight, buffer.length, bufferType) so we can see exactly which path
 * the wheel handler takes and where it fails.
 */
import { test, expect, Page } from '@playwright/test';
import { launchTmax } from './fixtures/launch';

interface BufferSnapshot {
  bufferType: 'normal' | 'alternate';
  viewportY: number;
  baseY: number;
  bufferLength: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  mouseTrackingMode: string | undefined;
}

async function snapshot(window: Page): Promise<BufferSnapshot> {
  return window.evaluate(() => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    const term = entry?.terminal;
    const buf = term?.buffer?.active;
    const viewport = document.querySelector(`[data-terminal-id="${id}"] .xterm-viewport`) as HTMLElement
      || document.querySelector('.terminal-panel .xterm-viewport') as HTMLElement;
    return {
      bufferType: term?.buffer?.active === term?.buffer?.alternate ? 'alternate' : 'normal',
      viewportY: buf?.viewportY ?? -1,
      baseY: buf?.baseY ?? -1,
      bufferLength: buf?.length ?? -1,
      scrollTop: viewport?.scrollTop ?? -1,
      scrollHeight: viewport?.scrollHeight ?? -1,
      clientHeight: viewport?.clientHeight ?? -1,
      mouseTrackingMode: term?.modes?.mouseTrackingMode,
    };
  });
}

async function writeToTerminal(window: Page, text: string): Promise<void> {
  await window.evaluate((t: string) => {
    const id = (window as any).__terminalStore.getState().focusedTerminalId;
    const entry = (window as any).__getTerminalEntry(id);
    entry?.terminal.write(t);
  }, text);
}

async function getTerminalCenter(window: Page): Promise<{ x: number; y: number }> {
  return window.evaluate(() => {
    const screen = document.querySelector('.terminal-panel .xterm-screen') as HTMLElement;
    const rect = screen.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

test.describe('Wheel investigation - all six scenarios', () => {
  test.setTimeout(180_000);

  test('Scenario 1: plain pane short output (wheel no-op)', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      await writeToTerminal(window, 'line1\r\nline2\r\nline3\r\nline4\r\nline5\r\n');
      await window.waitForTimeout(300);

      const before = await snapshot(window);
      console.log('S1 before:', JSON.stringify(before));
      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -500);
      await window.waitForTimeout(300);
      const after = await snapshot(window);
      console.log('S1 after:', JSON.stringify(after));

      // mouseTrackingMode must be 'none', no real scroll possible
      expect(after.mouseTrackingMode).toBe('none');
    } finally {
      await close();
    }
  });

  test('Scenario 2: plain pane 2000 lines, wheel up should scroll', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      let body = '';
      for (let i = 0; i < 2000; i++) body += `line ${i}\r\n`;
      await writeToTerminal(window, body);
      await window.waitForTimeout(500);

      const before = await snapshot(window);
      console.log('S2 before wheel:', JSON.stringify(before));

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -800);
      await window.waitForTimeout(400);

      const after = await snapshot(window);
      console.log('S2 after wheel:', JSON.stringify(after));

      // Mouse tracking is off, xterm native path should work
      expect(after.mouseTrackingMode).toBe('none');
      expect(after.viewportY, 'plain pane wheel up should scroll buffer up').toBeLessThan(before.viewportY);
    } finally {
      await close();
    }
  });

  test('Scenario 2b: plain pane 2000 lines, wheel up AFTER resize', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      let body = '';
      for (let i = 0; i < 2000; i++) body += `line ${i}\r\n`;
      await writeToTerminal(window, body);
      await window.waitForTimeout(500);

      // Resize the window to trigger _innerRefresh / fit-addon refit
      await window.setViewportSize({ width: 1100, height: 700 });
      await window.waitForTimeout(500);

      const before = await snapshot(window);
      console.log('S2b before wheel:', JSON.stringify(before));

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -800);
      await window.waitForTimeout(400);

      const after = await snapshot(window);
      console.log('S2b after wheel:', JSON.stringify(after));

      expect(after.mouseTrackingMode).toBe('none');
      expect(after.viewportY, 'plain pane wheel up after resize should scroll').toBeLessThan(before.viewportY);
    } finally {
      await close();
    }
  });

  test('Scenario 3: mouse tracking on, 2000 lines, wheel up', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      let body = '';
      for (let i = 0; i < 2000; i++) body += `line ${i}\r\n`;
      await writeToTerminal(window, body);
      await window.waitForTimeout(500);

      await writeToTerminal(window, '\x1b[?1000h\x1b[?1002h\x1b[?1006h');
      await window.waitForTimeout(300);

      const before = await snapshot(window);
      console.log('S3 before wheel:', JSON.stringify(before));
      expect(before.mouseTrackingMode).not.toBe('none');

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -800);
      await window.waitForTimeout(400);

      const after = await snapshot(window);
      console.log('S3 after wheel:', JSON.stringify(after));
      expect(after.viewportY, 'mouse-tracking-on wheel should scroll buffer').toBeLessThan(before.viewportY);
    } finally {
      await close();
    }
  });

  test('Scenario 4: mouse tracking on + resize, then wheel', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      let body = '';
      for (let i = 0; i < 2000; i++) body += `line ${i}\r\n`;
      await writeToTerminal(window, body);
      await window.waitForTimeout(500);

      await writeToTerminal(window, '\x1b[?1000h\x1b[?1002h\x1b[?1006h');
      await window.waitForTimeout(300);

      await window.setViewportSize({ width: 1100, height: 700 });
      await window.waitForTimeout(500);

      const before = await snapshot(window);
      console.log('S4 before wheel:', JSON.stringify(before));

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -800);
      await window.waitForTimeout(400);

      const after = await snapshot(window);
      console.log('S4 after wheel:', JSON.stringify(after));
      expect(after.viewportY, 'mouse-tracking + resize + wheel').toBeLessThan(before.viewportY);
    } finally {
      await close();
    }
  });

  test('Scenario 5: alt screen, wheel is no-op or pass-through', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);
      await window.click('.terminal-panel .xterm-screen');

      // Enter alt-screen, write some lines
      await writeToTerminal(window, '\x1b[?1049h');
      await window.waitForTimeout(200);
      await writeToTerminal(window, 'alt-line-a\r\nalt-line-b\r\nalt-line-c\r\n');
      await window.waitForTimeout(300);

      const before = await snapshot(window);
      console.log('S5 before wheel:', JSON.stringify(before));

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      // Wheel up - alt-screen has no scrollback so viewportY should stay at 0
      await window.mouse.wheel(0, -500);
      await window.waitForTimeout(300);

      const after = await snapshot(window);
      console.log('S5 after wheel:', JSON.stringify(after));

      expect(after.bufferType).toBe('alternate');
      // No crash, no infinite loops - just verify we got here
    } finally {
      await close();
    }
  });

  test('Scenario 6: real pwsh long output via PTY (user real case)', async () => {
    const { window, close } = await launchTmax();
    try {
      await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
      await window.waitForTimeout(800);

      // Click into the terminal and type a real command
      await window.click('.terminal-panel .xterm-screen');
      await window.waitForTimeout(500);

      // Send real input via the pty (not term.write). Press chars one by one.
      const cmd = '1..2000 | %{ "real line $_" }';
      await window.keyboard.type(cmd, { delay: 5 });
      await window.keyboard.press('Enter');

      // Wait for output to flush in - up to 5s
      await window.waitForTimeout(5000);

      const before = await snapshot(window);
      console.log('S6 before wheel:', JSON.stringify(before));

      const center = await getTerminalCenter(window);
      await window.mouse.move(center.x, center.y);
      await window.mouse.wheel(0, -800);
      await window.waitForTimeout(500);

      const after = await snapshot(window);
      console.log('S6 after wheel:', JSON.stringify(after));

      // The user case: real pwsh output, wheel up should scroll
      expect(after.viewportY, 'real pwsh output wheel up should scroll').toBeLessThan(before.viewportY);
    } finally {
      await close();
    }
  });
});
