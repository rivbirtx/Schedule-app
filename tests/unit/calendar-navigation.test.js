import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftDate, getRangeLabel, moveSelection, isSameMonth } from '../../src/features/calendar/calendar-navigation.js';
import { parsePageFromHash } from '../../src/features/navigation/router.js';
import { findCardAfterPointer } from '../../src/features/kanban/drag-and-drop.js';

test('shiftDate: month/week/day', () => {
  assert.equal(shiftDate('month', '2026-10-31', 1), '2026-11-30');
  assert.equal(shiftDate('month', '2026-01-15', -1), '2025-12-15');
  assert.equal(shiftDate('week', '2026-10-22', 1), '2026-10-29');
  assert.equal(shiftDate('day', '2026-10-31', 1), '2026-11-01');
});

test('getRangeLabel', () => {
  assert.equal(getRangeLabel('month', '2026-10-22'), 'October 2026');
  assert.equal(getRangeLabel('week', '2026-10-22'), 'Oct 18 - Oct 24, 2026');
  assert.equal(getRangeLabel('day', '2026-10-22'), 'Thu, Oct 22, 2026');
});

test('moveSelection dengan tombol panah', () => {
  assert.equal(moveSelection('2026-10-22', 'ArrowLeft'), '2026-10-21');
  assert.equal(moveSelection('2026-10-22', 'ArrowRight'), '2026-10-23');
  assert.equal(moveSelection('2026-10-22', 'ArrowUp'), '2026-10-15');
  assert.equal(moveSelection('2026-10-22', 'ArrowDown'), '2026-10-29');
  assert.equal(moveSelection('2026-10-22', 'Home'), '2026-10-18');
  assert.equal(moveSelection('2026-10-22', 'End'), '2026-10-24');
  assert.equal(moveSelection('2026-10-22', 'a'), null);
});

test('isSameMonth', () => {
  assert.equal(isSameMonth('2026-10-01', '2026-10-31'), true);
  assert.equal(isSameMonth('2026-10-31', '2026-11-01'), false);
});

test('router: parsePageFromHash', () => {
  assert.equal(parsePageFromHash('#/tasks'), 'tasks');
  assert.equal(parsePageFromHash('#/calendar?x=1'), 'calendar');
  assert.equal(parsePageFromHash(''), null);
  assert.equal(parsePageFromHash('#/hack'), null);
  assert.equal(parsePageFromHash(undefined), null);
});

test('drag-and-drop: findCardAfterPointer memilih kartu di bawah kursor', () => {
  globalThis.CSS ??= { escape: (value) => value };
  const makeCard = (id, top) => ({
    dataset: { taskId: id },
    getBoundingClientRect: () => ({ top, height: 40 }),
  });
  const cards = [makeCard('a', 0), makeCard('b', 50), makeCard('c', 100)];
  const zone = { querySelectorAll: () => cards.filter((card) => card.dataset.taskId !== 'a') };
  // kursor di y=60 (di atas titik tengah kartu b = 70) -> sisipkan sebelum b
  assert.equal(findCardAfterPointer(zone, 60, 'a').dataset.taskId, 'b');
  // kursor di y=75 (di bawah titik tengah b, di atas tengah c = 120) -> sebelum c
  assert.equal(findCardAfterPointer(zone, 75, 'a').dataset.taskId, 'c');
  // kursor di bawah semua kartu -> akhir kolom
  assert.equal(findCardAfterPointer(zone, 500, 'a'), null);
});
