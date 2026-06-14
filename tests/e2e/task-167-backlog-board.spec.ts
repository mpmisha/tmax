import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { launchTmax } from './fixtures/launch';

// TASK-167: native multi-project Backlog board. Seeds a temp Backlog.md
// project with one task, points tmax-config.json at it, opens the board, and
// asserts the task renders as a card in the correct column - exercising the
// frontmatter parser, the listTasks IPC path, and the kanban grouping.

function seedProject(): string {
  const projectDir = mkdtempSync(join(tmpdir(), 'tmax-backlog-proj-'));
  const tasksDir = join(projectDir, 'backlog', 'tasks');
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(
    join(tasksDir, 'task-1 - Wire the gizmo.md'),
    [
      '---',
      'id: TASK-1',
      "title: 'Wire the gizmo'",
      'status: In Progress',
      'assignee:',
      '  - "@alice"',
      'labels:',
      '  - backend',
      'created_date: 2026-06-01 10:00',
      '---',
      '',
      '## Description',
      '',
      'Wire it up.',
      '',
      '## Acceptance Criteria',
      '<!-- AC:BEGIN -->',
      '- [ ] #1 First criterion',
      '- [x] #2 Second criterion',
      '<!-- AC:END -->',
      '',
    ].join('\n'),
    'utf-8',
  );
  return projectDir;
}

test('Backlog board renders a seeded task in its status column', async () => {
  const projectDir = seedProject();
  const { window, close } = await launchTmax({
    preSeed: (userDataDir) => {
      writeFileSync(
        join(userDataDir, 'tmax-config.json'),
        JSON.stringify({
          backlogDisplayMode: 'overlay',
          backlogProjects: [{ name: 'gizmo', path: projectDir.replace(/\\/g, '/') }],
        }),
        'utf-8',
      );
    },
  });
  try {
    await window.waitForSelector('.terminal-panel', { timeout: 15_000 });

    // Open the board via the store (same entry point as the keyboard shortcut).
    await window.evaluate(() => (window as any).__terminalStore.getState().toggleBacklog());

    const board = window.locator('.backlog-window');
    await expect(board).toBeVisible({ timeout: 5_000 });

    // The seeded task should appear as a card with its id and title.
    const card = window.locator('.backlog-card', { hasText: 'Wire the gizmo' });
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card).toContainText('TASK-1');
    await expect(card).toContainText('@alice');
    await expect(card).toContainText('backend');

    // It should be grouped under the "In Progress" column.
    const inProgressCol = window
      .locator('.backlog-column', { has: window.locator('.backlog-col-header', { hasText: 'In Progress' }) });
    await expect(inProgressCol.locator('.backlog-card', { hasText: 'Wire the gizmo' })).toBeVisible();

    // Open the detail modal and confirm acceptance criteria were parsed.
    await card.click();
    const detail = window.locator('.backlog-detail');
    await expect(detail).toBeVisible({ timeout: 5_000 });
    await expect(detail.locator('.backlog-ac-row')).toHaveCount(2);
    // Second AC was checked in the fixture.
    await expect(detail.locator('.backlog-ac-row input[type=checkbox]').nth(1)).toBeChecked();
  } finally {
    await close();
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});
