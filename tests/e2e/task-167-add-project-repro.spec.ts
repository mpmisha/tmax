import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { launchTmax } from './fixtures/launch';

// TASK-167: adding a project through the sidebar form persists it and renders
// its tasks. (Regression for a "Add does nothing" report that turned out to be
// a stale-preload dev session; the form now also surfaces bridge errors instead
// of failing silently.)

function seedProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tmax-add-proj-'));
  const tasksDir = join(dir, 'backlog', 'tasks');
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(
    join(tasksDir, 'task-1 - Hello.md'),
    ['---', 'id: TASK-1', "title: 'Hello'", 'status: To Do', '---', '', '## Description', '', 'x', ''].join('\n'),
    'utf-8',
  );
  return dir;
}

test('adding a project via the form populates the sidebar and board', async () => {
  const projectDir = seedProject();
  const { window, close } = await launchTmax();
  try {
    await window.waitForSelector('.terminal-panel', { timeout: 15_000 });
    await window.evaluate(() => (window as any).__terminalStore.getState().toggleBacklog());
    // Default display mode is the docked side panel.
    await expect(window.locator('.backlog-panel')).toBeVisible({ timeout: 5_000 });

    // Open the add form and submit a path with a trailing slash (as a user might).
    await window.locator('.backlog-add-btn', { hasText: 'Add project' }).click();
    await window.locator('.backlog-add-form input').first().fill(projectDir.replace(/\\/g, '/') + '/');
    await window.locator('.backlog-add-buttons button', { hasText: 'Add' }).click();

    // The project should appear in the sidebar and its task on the board.
    await expect(window.locator('.backlog-proj-name')).toHaveText(/tmax-add-proj-/, { timeout: 5_000 });
    await expect(window.locator('.backlog-card', { hasText: 'Hello' })).toBeVisible({ timeout: 5_000 });

    // And it should persist to config.
    const persisted = await window.evaluate(
      () => (window as any).__terminalStore.getState().config?.backlogProjects?.length ?? 0,
    );
    expect(persisted).toBe(1);
  } finally {
    await close();
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});
