import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateKey, parseDateKey, isValidDateKey, addDays, addMonths, startOfWeek, getWeekDays,
  getMonthGrid, diffInDays, isoToDateKey, isValidTime, timeToMinutes, formatLongDate, formatMonthYear,
} from '../../src/utils/date-utils.js';

test('toDateKey/parseDateKey round-trip tanpa pergeseran zona waktu', () => {
  for (const key of ['2026-01-01', '2026-03-29', '2026-10-25', '2026-12-31', '2028-02-29']) {
    assert.equal(toDateKey(parseDateKey(key)), key);
  }
});

test('isValidDateKey menolak tanggal yang tidak ada', () => {
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2028-02-29'), true);
  assert.equal(isValidDateKey('2026-13-01'), false);
  assert.equal(isValidDateKey('26-1-1'), false);
  assert.equal(isValidDateKey(null), false);
});

test('addDays melewati batas bulan dan tahun', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
});

test('addMonths memotong hari ke akhir bulan', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-15');
});

test('minggu dimulai hari Minggu', () => {
  assert.equal(startOfWeek('2026-10-22'), '2026-10-18'); // 22 Okt 2026 = Kamis
  assert.deepEqual(getWeekDays('2026-10-22'), [
    '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24',
  ]);
});

test('getMonthGrid: 42 sel, Oktober 2026 dimulai Kamis', () => {
  const grid = getMonthGrid('2026-10-22');
  assert.equal(grid.length, 42);
  assert.equal(grid[0].dateKey, '2026-09-27');
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid[4].dateKey, '2026-10-01');
  assert.equal(grid[4].inMonth, true);
  assert.equal(grid.filter((cell) => cell.inMonth).length, 31);
});

test('diffInDays', () => {
  assert.equal(diffInDays('2026-10-22', '2026-10-25'), 3);
  assert.equal(diffInDays('2026-10-25', '2026-10-22'), -3);
  assert.equal(diffInDays('2026-03-28', '2026-03-30'), 2); // tidak terpengaruh DST
});

test('isoToDateKey memakai tanggal lokal', () => {
  const iso = new Date('2026-10-22T23:30:00').toISOString();
  assert.equal(isoToDateKey(iso), '2026-10-22');
  assert.equal(isoToDateKey('bukan tanggal'), '');
});

test('validasi & konversi jam', () => {
  assert.equal(isValidTime('09:05'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('9:05'), false);
  assert.equal(timeToMinutes('13:30'), 810);
});

test('format tampilan', () => {
  assert.equal(formatLongDate('2026-10-22'), 'Thu, Oct 22, 2026');
  assert.equal(formatMonthYear('2026-10-22'), 'October 2026');
});
