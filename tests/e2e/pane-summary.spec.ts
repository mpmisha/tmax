import { test, expect } from '@playwright/test';
import { validateAndCleanSummary } from '../../src/main/pane-summary-service';
import {
  buildTranscriptVersion,
  isSummarizerSessionName,
  SUMMARIZER_SESSION_NAME_PREFIX,
  DEFAULT_PANE_SUMMARY_CONFIG,
} from '../../src/shared/pane-summary-types';

// Task pane-summary unit tests.
//
// These cover the deterministic, side-effect-free pieces of the
// pane-summary feature: the output validator, the transcript-version
// helper, and the summarizer-session prefix gate. The spawning + IPC
// layer is covered by a smoke check in the rubber-duck pass; here we
// focus on the pure logic that every code path depends on.

test.describe('pane-summary: validateAndCleanSummary', () => {
  test('accepts a clean one-sentence summary', () => {
    const out = validateAndCleanSummary('Refactoring the WSL path utilities and adding tests.');
    expect(out).toBe('Refactoring the WSL path utilities and adding tests.');
  });

  test('rejects empty / whitespace-only input', () => {
    expect(validateAndCleanSummary('')).toBeNull();
    expect(validateAndCleanSummary('   \n\n  ')).toBeNull();
  });

  test('strips surrounding double quotes', () => {
    expect(validateAndCleanSummary('"Fixing the build."')).toBe('Fixing the build.');
  });

  test('strips smart quotes', () => {
    expect(validateAndCleanSummary('“Fixing the build.”')).toBe('Fixing the build.');
  });

  test('strips leading preamble like "Summary:"', () => {
    expect(validateAndCleanSummary('Summary: Implementing pane hover tooltips.'))
      .toBe('Implementing pane hover tooltips.');
    expect(validateAndCleanSummary('TL;DR — fixing flaky tests.'))
      .toBe('fixing flaky tests.');
  });

  test('drops content past the first non-empty line', () => {
    const multi = 'Fixing tab focus.\nLine 2\nLine 3';
    expect(validateAndCleanSummary(multi)).toBe('Fixing tab focus.');
  });

  test('strips code fences the model occasionally adds', () => {
    const fenced = '```\nFixing the build.\n```';
    expect(validateAndCleanSummary(fenced)).toBe('Fixing the build.');
  });

  test('caps the result to 25 words', () => {
    const long = Array.from({ length: 40 }, (_v, i) => `word${i}`).join(' ');
    const out = validateAndCleanSummary(long);
    expect(out).not.toBeNull();
    expect(out!.split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  test('caps the result to 180 characters', () => {
    const long = 'a'.repeat(500);
    const out = validateAndCleanSummary(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(180 + 1); // +1 for terminal punctuation
  });

  test('rejects "session in progress" boilerplate', () => {
    expect(validateAndCleanSummary('session in progress')).toBeNull();
    expect(validateAndCleanSummary('Session in progress.')).toBeNull();
  });

  test('rejects "The user is …" boilerplate (model violating the prompt)', () => {
    expect(validateAndCleanSummary('The user is working on tests')).toBeNull();
  });

  test('rejects too-short output', () => {
    expect(validateAndCleanSummary('hi')).toBeNull();
    expect(validateAndCleanSummary('done')).toBeNull();
  });

  test('adds terminal punctuation when missing', () => {
    expect(validateAndCleanSummary('Refactoring authentication code'))
      .toBe('Refactoring authentication code.');
  });

  test('leaves existing terminal punctuation alone', () => {
    expect(validateAndCleanSummary('Refactoring authentication code!'))
      .toBe('Refactoring authentication code!');
  });

  test('collapses interior whitespace', () => {
    expect(validateAndCleanSummary('Fixing    the     build.'))
      .toBe('Fixing the build.');
  });
});

test.describe('pane-summary: buildTranscriptVersion', () => {
  test('formats messageCount and latestPromptTime', () => {
    expect(buildTranscriptVersion(3, 1_700_000_000_000)).toBe('3:1700000000000');
  });

  test('treats undefined latestPromptTime as 0', () => {
    expect(buildTranscriptVersion(7, undefined)).toBe('7:0');
  });

  test('different inputs produce different versions', () => {
    const a = buildTranscriptVersion(3, 1000);
    const b = buildTranscriptVersion(4, 1000);
    const c = buildTranscriptVersion(3, 2000);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });
});

test.describe('pane-summary: isSummarizerSessionName', () => {
  test('matches our prefix', () => {
    expect(isSummarizerSessionName(`${SUMMARIZER_SESSION_NAME_PREFIX}deadbeef`)).toBe(true);
  });

  test('does not match unrelated names', () => {
    expect(isSummarizerSessionName('Implementing tab summaries')).toBe(false);
    expect(isSummarizerSessionName('summarizer-something')).toBe(false);
    expect(isSummarizerSessionName(undefined)).toBe(false);
    expect(isSummarizerSessionName(null)).toBe(false);
    expect(isSummarizerSessionName('')).toBe(false);
  });
});

test.describe('pane-summary: DEFAULT_PANE_SUMMARY_CONFIG', () => {
  test('enabled by default', () => {
    expect(DEFAULT_PANE_SUMMARY_CONFIG.enabled).toBe(true);
  });

  test('delay is 5 minutes by default', () => {
    expect(DEFAULT_PANE_SUMMARY_CONFIG.delayMs).toBe(5 * 60 * 1000);
  });
});
