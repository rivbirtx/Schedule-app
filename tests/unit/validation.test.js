import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTaskInput, validateEventInput, sanitizeState } from '../../src/utils/validation.js';
import { createEmptyState } from '../../src/data/empty-state.js';
import { createDemoState } from '../../src/data/demo-data.js';
import { validTaskInput } from './helpers.js';

test('tugas valid lolos dan dirapikan', () => {
  const result = validateTaskInput(validTaskInput({ title: '  Halo   dunia  ' }));
  assert.equal(result.ok, true);
  assert.equal(result.value.title, 'Halo dunia');
});

test('judul kosong, status/prioritas salah, tanggal mustahil ditolak', () => {
  const result = validateTaskInput(validTaskInput({ title: '   ', status: 'x', priority: 'y', dueDate: '2026-02-31' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.title && result.errors.status && result.errors.priority && result.errors.dueDate);
});

test('judul terlalu panjang ditolak', () => {
  assert.equal(validateTaskInput(validTaskInput({ title: 'a'.repeat(81) })).ok, false);
});

test('deadline boleh kosong; subtask kosong dibuang', () => {
  const result = validateTaskInput(validTaskInput({ dueDate: '', subtasks: [{ title: 'ok' }, { title: '  ' }] }));
  assert.equal(result.ok, true);
  assert.equal(result.value.subtasks.length, 1);
});

test('event: jam selesai harus setelah jam mulai', () => {
  const base = { title: 'Rapat', date: '2026-10-22', startTime: '10:00', endTime: '09:00', color: 'blue' };
  assert.equal(validateEventInput(base).ok, false);
  assert.equal(validateEventInput({ ...base, endTime: '10:00' }).ok, false);
  assert.equal(validateEventInput({ ...base, endTime: '10:30' }).ok, true);
  assert.equal(validateEventInput({ ...base, date: '2026-02-30', endTime: '11:00' }).errors.date !== undefined, true);
});

test('sanitizeState menerima state demo apa adanya', () => {
  const demo = createDemoState('2026-10-22');
  const { state, problems } = sanitizeState(JSON.parse(JSON.stringify(demo)));
  assert.deepEqual(problems, []);
  assert.equal(state.tasks.length, demo.tasks.length);
  assert.equal(state.events.length, demo.events.length);
});

test('sanitizeState menolak bentuk/versi yang salah', () => {
  assert.equal(sanitizeState(null).state, null);
  assert.equal(sanitizeState([]).state, null);
  assert.equal(sanitizeState({ schemaVersion: 99, tasks: [], events: [] }).state, null);
  assert.equal(sanitizeState({ schemaVersion: 1, tasks: 'x', events: [] }).state, null);
});

test('sanitizeState membuang item rusak dan id ganda', () => {
  const raw = createEmptyState();
  raw.tasks = [
    { id: 'a', title: 'Benar' },
    { id: 'a', title: 'Duplikat' },
    { id: '', title: 'Tanpa id' },
    { id: 'b', title: '' },
    'bukan objek',
  ];
  raw.events = [{ id: 'e', title: 'x', date: 'salah', startTime: '10:00', endTime: '11:00' }];
  const { state, problems } = sanitizeState(raw);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].status, 'todo'); // nilai default dipulihkan
  assert.equal(state.events.length, 0);
  assert.ok(problems.length >= 2);
});

test('sanitizeState membuang catatan XP tidak masuk akal', () => {
  const raw = createEmptyState();
  raw.gamification.awardedTasks = {
    ok: { xp: 20, priority: 'medium', awardedDate: '2026-10-22' },
    negatif: { xp: -5, priority: 'low', awardedDate: '2026-10-22' },
    raksasa: { xp: 99999, priority: 'high', awardedDate: '2026-10-22' },
    tanggalRusak: { xp: 10, priority: 'low', awardedDate: 'kemarin' },
  };
  const { state } = sanitizeState(raw);
  assert.deepEqual(Object.keys(state.gamification.awardedTasks), ['ok']);
});
