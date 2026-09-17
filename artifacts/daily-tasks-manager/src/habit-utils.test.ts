import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCurrentHabitStreak, normalizeHabitDate } from './habit-utils.ts';

test('habit is not treated as completed on a new day', () => {
  assert.equal(normalizeHabitDate('2026-09-17T00:00:00.000Z'), '2026-09-17');
  const completed = ['2026-09-17T00:00:00.000Z'].map(normalizeHabitDate);
  assert.equal(completed.includes('2026-09-18'), false);
});

test('streak continues from yesterday and increments when today is checked', () => {
  assert.equal(calculateCurrentHabitStreak(['2026-09-16', '2026-09-17'], '2026-09-18'), 2);
  assert.equal(calculateCurrentHabitStreak(['2026-09-16', '2026-09-17', '2026-09-18'], '2026-09-18'), 3);
});

test('streak resets after a missed day', () => {
  assert.equal(calculateCurrentHabitStreak(['2026-09-15', '2026-09-16'], '2026-09-18'), 0);
});
