import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../src/data/empty-state.js';
import {
  createTask, updateTask, deleteTask, moveTask, toggleTaskDone, toggleSubtask,
  groupTasksByStatus, filterAndSortTasks, computeTaskStats, isOverdue,
} from '../../src/services/task-service.js';
import { makeCtx, validTaskInput } from './helpers.js';

const ctx = makeCtx();

function stateWith(...inputs) {
  let state = createEmptyState();
  const ids = [];
  for (const input of inputs) {
    const result = createTask(state, validTaskInput(input), ctx);
    assert.equal(result.ok, true);
    state = result.state;
    ids.push(result.task.id);
  }
  return { state, ids };
}

test('createTask menambah tugas dengan id, createdAt, completedAt null', () => {
  const result = createTask(createEmptyState(), validTaskInput(), ctx);
  assert.equal(result.ok, true);
  assert.equal(result.state.tasks.length, 1);
  assert.match(result.task.id, /^task_/);
  assert.equal(result.task.completedAt, null);
  assert.equal(result.task.createdAt, ctx.nowIso);
});

test('createTask dengan input salah mengembalikan errors dan tidak mengubah state', () => {
  const state = createEmptyState();
  const result = createTask(state, validTaskInput({ title: '' }), ctx);
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
  assert.equal(result.state, state);
});

test('updateTask mengubah field tetapi mempertahankan id, createdAt, posisi', () => {
  const { state, ids } = stateWith({ title: 'A' }, { title: 'B' });
  const result = updateTask(state, ids[0], validTaskInput({ title: 'A2', priority: 'high' }), ctx);
  assert.equal(result.ok, true);
  assert.equal(result.state.tasks[0].id, ids[0]);
  assert.equal(result.state.tasks[0].title, 'A2');
  assert.equal(result.state.tasks[0].priority, 'high');
  assert.equal(result.state.tasks[1].title, 'B');
});

test('updateTask pada id yang tidak ada gagal', () => {
  assert.equal(updateTask(createEmptyState(), 'nope', validTaskInput(), ctx).ok, false);
});

test('deleteTask menghapus tugas', () => {
  const { state, ids } = stateWith({ title: 'A' }, { title: 'B' });
  const result = deleteTask(state, ids[0]);
  assert.equal(result.state.tasks.length, 1);
  assert.equal(result.state.tasks[0].title, 'B');
  assert.equal(deleteTask(state, 'nope').ok, false);
});

test('moveTask mengubah status dan menaruh kartu di akhir kolom tujuan', () => {
  const { state, ids } = stateWith(
    { title: 'A', status: 'todo' }, { title: 'B', status: 'in_progress' }, { title: 'C', status: 'in_progress' },
  );
  const result = moveTask(state, ids[0], 'in_progress', ctx);
  assert.equal(result.state.tasks.find((t) => t.id === ids[0]).status, 'in_progress');
  const column = groupTasksByStatus(result.state.tasks).in_progress.map((t) => t.title);
  assert.deepEqual(column, ['B', 'C', 'A']);
});

test('moveTask dengan beforeId menyisipkan sebelum kartu itu (reorder)', () => {
  const { state, ids } = stateWith(
    { title: 'A', status: 'todo' }, { title: 'B', status: 'todo' }, { title: 'C', status: 'todo' },
  );
  const result = moveTask(state, ids[2], 'todo', ctx, ids[0]);
  assert.deepEqual(result.state.tasks.map((t) => t.title), ['C', 'A', 'B']);
});

test('moveTask ke status yang sama tanpa beforeId tidak mengubah urutan', () => {
  const { state, ids } = stateWith({ title: 'A' }, { title: 'B' }, { title: 'C' });
  const result = moveTask(state, ids[1], 'todo', ctx);
  assert.deepEqual(result.state.tasks.map((t) => t.title), ['A', 'B', 'C']);
});

test('moveTask menolak status tidak dikenal', () => {
  const { state, ids } = stateWith({ title: 'A' });
  assert.equal(moveTask(state, ids[0], 'archived', ctx).ok, false);
});

test('moveTask mengatur completedAt: done -> terisi, keluar dari done -> null', () => {
  const { state, ids } = stateWith({ title: 'A' });
  const done = moveTask(state, ids[0], 'done', ctx);
  assert.equal(done.state.tasks[0].completedAt, ctx.nowIso);
  const reopened = moveTask(done.state, ids[0], 'review', ctx);
  assert.equal(reopened.state.tasks[0].completedAt, null);
});

test('toggleTaskDone bolak-balik done <-> todo', () => {
  const { state, ids } = stateWith({ title: 'A' });
  const done = toggleTaskDone(state, ids[0], ctx);
  assert.equal(done.state.tasks[0].status, 'done');
  assert.equal(toggleTaskDone(done.state, ids[0], ctx).state.tasks[0].status, 'todo');
});

test('toggleSubtask membalik satu subtask', () => {
  const { state, ids } = stateWith({ subtasks: [{ id: 's1', title: 'x', done: false }, { id: 's2', title: 'y', done: false }] });
  const result = toggleSubtask(state, ids[0], 's2');
  assert.deepEqual(result.state.tasks[0].subtasks.map((s) => s.done), [false, true]);
});

test('filterAndSortTasks: pencarian, status, prioritas, kategori', () => {
  const { state } = stateWith(
    { title: 'Desain Login', status: 'todo', priority: 'high', category: 'UI/UX', description: 'pixel art' },
    { title: 'Bug upload', status: 'review', priority: 'low', category: 'Backend' },
    { title: 'Laporan', status: 'done', priority: 'medium', category: 'Document' },
  );
  const tasks = state.tasks;
  assert.deepEqual(filterAndSortTasks(tasks, { query: 'LOGIN' }).map((t) => t.title), ['Desain Login']);
  assert.deepEqual(filterAndSortTasks(tasks, { query: 'pixel' }).length, 1); // cari di deskripsi
  assert.deepEqual(filterAndSortTasks(tasks, { query: 'backend' }).length, 1); // cari di kategori
  assert.equal(filterAndSortTasks(tasks, { status: 'done' }).length, 1);
  assert.equal(filterAndSortTasks(tasks, { priority: 'high' }).length, 1);
  assert.equal(filterAndSortTasks(tasks, { category: 'Document' }).length, 1);
  assert.equal(filterAndSortTasks(tasks, { status: 'done', priority: 'high' }).length, 0);
  assert.equal(filterAndSortTasks(tasks, {}).length, 3);
});

test('filterAndSortTasks: urut deadline (tanpa deadline selalu terakhir), prioritas, created', () => {
  const { state } = stateWith(
    { title: 'late', dueDate: '2026-11-01', priority: 'low' },
    { title: 'none', dueDate: '', priority: 'high' },
    { title: 'soon', dueDate: '2026-10-23', priority: 'medium' },
  );
  const titles = (opts) => filterAndSortTasks(state.tasks, opts).map((t) => t.title);
  assert.deepEqual(titles({ sort: 'due', direction: 'asc' }), ['soon', 'late', 'none']);
  assert.deepEqual(titles({ sort: 'due', direction: 'desc' }), ['late', 'soon', 'none']);
  assert.deepEqual(titles({ sort: 'priority' }), ['none', 'soon', 'late']); // bawaan: tertinggi dulu
  assert.deepEqual(titles({ sort: 'priority', direction: 'asc' }), ['late', 'soon', 'none']);
});

test('computeTaskStats dihitung dari data', () => {
  const { state } = stateWith(
    { status: 'todo' }, { status: 'todo' }, { status: 'in_progress' }, { status: 'review' }, { status: 'done' },
  );
  const stats = computeTaskStats(state.tasks);
  assert.equal(stats.total, 5);
  assert.equal(stats.completed, 1);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.pending, 3); // todo + review
  assert.equal(stats.completionRate, 20);
  assert.equal(computeTaskStats([]).completionRate, 0);
});

test('isOverdue', () => {
  const { state } = stateWith({ dueDate: '2026-10-21' }, { dueDate: '2026-10-21', status: 'done' }, { dueDate: '' });
  const [late, doneLate, none] = state.tasks;
  assert.equal(isOverdue(late, '2026-10-22'), true);
  assert.equal(isOverdue(doneLate, '2026-10-22'), false);
  assert.equal(isOverdue(none, '2026-10-22'), false);
});

test('getActivitySeries menghitung tugas dibuat & selesai per hari', async () => {
  const { getActivitySeries } = await import('../../src/services/task-service.js');
  const { state, ids } = stateWith({ title: 'A' }, { title: 'B' });
  const done = moveTask(state, ids[0], 'done', ctx).state; // dibuat & selesai hari ini
  const series = getActivitySeries(done.tasks, ctx.todayKey, 7);
  assert.equal(series.length, 7);
  assert.equal(series[0].dateKey, '2026-10-16');
  assert.equal(series[6].dateKey, '2026-10-22');
  assert.equal(series[6].created, 2);
  assert.equal(series[6].completed, 1);
  assert.equal(series[0].created + series[0].completed, 0);
});
