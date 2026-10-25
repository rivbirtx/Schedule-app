import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../src/data/empty-state.js';
import {
  createEvent, updateEvent, deleteEvent, getEventsOnDate, getAgendaForDate, indexByDate,
  findOverlappingEvents, isEventHappeningNow,
} from '../../src/services/event-service.js';
import { createTask } from '../../src/services/task-service.js';
import { makeCtx, validTaskInput } from './helpers.js';

const ctx = makeCtx();
const eventInput = (overrides = {}) => ({
  title: 'Meeting', date: '2026-10-22', startTime: '09:00', endTime: '10:00', color: 'blue', notes: '', ...overrides,
});

test('createEvent / updateEvent / deleteEvent', () => {
  let state = createEmptyState();
  const created = createEvent(state, eventInput(), ctx);
  assert.equal(created.ok, true);
  state = created.state;
  assert.equal(state.events.length, 1);

  const updated = updateEvent(state, created.event.id, eventInput({ title: 'Rapat', endTime: '11:00' }));
  assert.equal(updated.state.events[0].title, 'Rapat');
  assert.equal(updated.state.events[0].endTime, '11:00');

  assert.equal(deleteEvent(updated.state, created.event.id).state.events.length, 0);
  assert.equal(deleteEvent(state, 'nope').ok, false);
  assert.equal(updateEvent(state, 'nope', eventInput()).ok, false);
});

test('validasi rentang waktu ditolak service', () => {
  const result = createEvent(createEmptyState(), eventInput({ startTime: '11:00', endTime: '10:00' }), ctx);
  assert.equal(result.ok, false);
  assert.ok(result.errors.endTime);
});

test('getEventsOnDate terurut berdasarkan jam mulai', () => {
  let state = createEmptyState();
  for (const [title, start, end] of [['B', '13:00', '14:00'], ['A', '08:00', '09:00'], ['C', '10:00', '11:00']]) {
    state = createEvent(state, eventInput({ title, startTime: start, endTime: end }), ctx).state;
  }
  state = createEvent(state, eventInput({ title: 'Lain hari', date: '2026-10-23' }), ctx).state;
  assert.deepEqual(getEventsOnDate(state, '2026-10-22').map((e) => e.title), ['A', 'C', 'B']);
});

test('agenda menggabungkan event dan deadline tugas pada tanggal yang sama', () => {
  let state = createEmptyState();
  state = createEvent(state, eventInput(), ctx).state;
  state = createTask(state, validTaskInput({ title: 'Deadline', dueDate: '2026-10-22' }), ctx).state;
  state = createTask(state, validTaskInput({ title: 'Lain', dueDate: '2026-10-30' }), ctx).state;
  const agenda = getAgendaForDate(state, '2026-10-22');
  assert.equal(agenda.events.length, 1);
  assert.deepEqual(agenda.deadlines.map((t) => t.title), ['Deadline']);
});

test('indexByDate konsisten dengan getAgendaForDate', () => {
  let state = createEmptyState();
  state = createEvent(state, eventInput(), ctx).state;
  state = createTask(state, validTaskInput({ dueDate: '2026-10-22' }), ctx).state;
  const index = indexByDate(state);
  assert.equal(index.get('2026-10-22').events.length, getAgendaForDate(state, '2026-10-22').events.length);
  assert.equal(index.get('2026-10-22').deadlines.length, 1);
  assert.equal(index.get('2026-10-23'), undefined);
});

test('deteksi event bertumpuk (batas menempel tidak dihitung)', () => {
  let state = createEmptyState();
  state = createEvent(state, eventInput({ startTime: '09:00', endTime: '10:00' }), ctx).state;
  assert.equal(findOverlappingEvents(state, { ...eventInput({ startTime: '09:30', endTime: '10:30' }), id: 'x' }).length, 1);
  assert.equal(findOverlappingEvents(state, { ...eventInput({ startTime: '10:00', endTime: '11:00' }), id: 'x' }).length, 0);
  const overlapping = createEvent(state, eventInput({ startTime: '09:30', endTime: '10:30' }), ctx);
  assert.equal(overlapping.overlaps.length, 1);
});

test('isEventHappeningNow', () => {
  const event = { date: '2026-10-22', startTime: '10:00', endTime: '12:00' };
  assert.equal(isEventHappeningNow(event, { todayKey: '2026-10-22', timeKey: '10:00' }), true);
  assert.equal(isEventHappeningNow(event, { todayKey: '2026-10-22', timeKey: '12:00' }), false);
  assert.equal(isEventHappeningNow(event, { todayKey: '2026-10-23', timeKey: '10:30' }), false);
});
