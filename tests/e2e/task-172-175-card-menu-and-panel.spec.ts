import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { launchTmax } from './fixtures/launch';

// TASK-172 (card context menu) + TASK-175 (docked side-panel mode).

function seedProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tmax-menu-proj-'));
  const tasksDir = join(dir, 'backlog', 'tasks');
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(
    join(tasksDir, 'task-1 - Hello.md'),
    ['---', 'id: TASK-1', "title: 'Hello'", 'status: To Do', '---', '', '## Description', '', 'x', ''].join('\n'),
    'utf-8',
  );
  return dir;
}

test('card right-click menu and side-panel mode', async () => {
  const projectDir = seedProject();
  const { window, close } = await launchTmax({
    preSeed: (userDataDir) => {
      writeFileSync(
        join(userDataDir, 'tmax-config.json'),
        JSON.stringify({ backlogDisplayMode: 'overlay', backlogProjects: [{ name: 'proj', path: projectDir.replace(/\\/g, '/') }] }),
        'utf-8',
      );
    },
  });
  try {
    await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
    await window.evaluate(() => (window as any).__terminalStore.getState().toggleBacklog());
    await expect(window.locator('.backlog-window')).toBeVisible({ timeout: 5_000 });

    const card = window.locator('.backlog-card', { hasText: 'Hello' });
    await expect(card).toBeVisible({ timeout: 5_000 });

    // Right-click opens the context menu with the expected actions.
    await card.click({ button: 'right' });
    const menu = window.locator('.context-menu');
    await expect(menu).toBeVisible({ timeout: 3_000 });
    await expect(menu).toContainText('Open details');
    await expect(menu).toContainText('Move to');
    await expect(menu).toContainText('Copy ID');
    await expect(menu).toContainText('Reveal task file');
    await expect(menu).toContainText('Archive');

    // Escape dismisses only the menu, NOT the whole board (regression for the
    // capture-phase Esc-handler ordering bug).
    await window.keyboard.press('Escape');
    await expect(menu).toHaveCount(0, { timeout: 3_000 });
    await expect(window.locator('.backlog-window')).toBeVisible();

    // Switch to docked side-panel mode: the panel appears and panes stay visible.
    await window.evaluate(() => (window as any).__terminalStore.getState().updateConfig({ backlogDisplayMode: 'panel' }));
    const panel = window.locator('.backlog-panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(window.locator('.backlog-window')).toHaveCount(0);
    await expect(window.locator('.terminal-panel').first()).toBeVisible();
    // Default side is right.
    await expect(panel).toHaveClass(/side-right/);

    // Collapse the project sidebar via the splitter control, then re-expand.
    await expect(window.locator('.backlog-sidebar-wrap')).not.toHaveClass(/collapsed/);
    await window.locator('.backlog-sidebar-collapse').click();
    await expect(window.locator('.backlog-sidebar-wrap')).toHaveClass(/collapsed/);
    await window.locator('.backlog-sidebar-collapse').click();
    await expect(window.locator('.backlog-sidebar-wrap')).not.toHaveClass(/collapsed/);
  } finally {
    await close();
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});
