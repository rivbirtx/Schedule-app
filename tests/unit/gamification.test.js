import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../src/data/empty-state.js';
import { createTask, moveTask, updateTask, deleteTask } from '../../src/services/task-service.js';
import {
  calculateLevel, calculateStreak, getProgress, getTotalXp, xpForPriority, countCompletedOn,
} from '../../src/services/gamification-service.js';
import { makeCtx, validTaskInput } from './helpers.js';

const ctx = makeCtx();

const addTask = (state, input) => {
  const result = createTask(state, validTaskInput(input), ctx);
  return { state: result.state, id: result.task.id };
};

test('XP per prioritas: low 10, medium 20, high 30', () => {
  assert.equal(xpForPriority('low'), 10);
  assert.equal(xpForPriority('medium'), 20);
  assert.equal(xpForPriority('high'), 30);
});

test('level: setiap 100 XP naik 1 level', () => {
  assert.deepEqual(calculateLevel(0), { level: 1, xpIntoLevel: 0, xpPerLevel: 100, progressPct: 0 });
  assert.equal(calculateLevel(99).level, 1);
  assert.equal(calculateLevel(100).level, 2);
  assert.equal(calculateLevel(250).level, 3);
  assert.equal(calculateLevel(250).xpIntoLevel, 50);
  assert.equal(calculateLevel(250).progressPct, 50);
  assert.equal(calculateLevel(-5).level, 1);
});

test('menyelesaikan tugas memberi XP sesuai prioritas', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'high' });
  const result = moveTask(state, id, 'done', ctx);
  assert.equal(getTotalXp(result.state), 30);
  assert.ok(result.notices.some((n) => n.type === 'xp' && n.message === '+30 XP'));
});

test('XP hanya sekali: buka kembali lalu selesaikan lagi TIDAK memberi XP lagi', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'medium' });
  state = moveTask(state, id, 'done', ctx).state;
  assert.equal(getTotalXp(state), 20);
  state = moveTask(state, id, 'todo', ctx).state;
  assert.equal(getTotalXp(state), 20, 'membuka kembali tidak menghapus XP');
  const again = moveTask(state, id, 'done', ctx);
  assert.equal(getTotalXp(again.state), 20, 'selesai lagi tidak menambah XP');
  assert.ok(!again.notices.some((n) => n.type === 'xp'));
});

test('mengubah prioritas setelah selesai tidak mengubah XP yang sudah diberikan', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'low' });
  state = moveTask(state, id, 'done', ctx).state;
  state = updateTask(state, id, validTaskInput({ priority: 'high', status: 'done' }), ctx).state;
  assert.equal(getTotalXp(state), 10);
});

test('menghapus tugas tidak mengurangi XP', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'high' });
  state = moveTask(state, id, 'done', ctx).state;
  state = deleteTask(state, id).state;
  assert.equal(getTotalXp(state), 30);
});

test('tugas yang langsung dibuat sebagai done mendapat XP sekali', () => {
  const { state } = addTask(createEmptyState(), { status: 'done', priority: 'medium' });
  assert.equal(getTotalXp(state), 20);
});

test('mengedit tugas menjadi done lewat formulir memberi XP', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'low' });
  const result = updateTask(state, id, validTaskInput({ status: 'done', priority: 'low' }), ctx);
  assert.equal(getTotalXp(result.state), 10);
});

test('level up menghasilkan notice dan level baru', () => {
  let state = createEmptyState();
  let last;
  for (let i = 0; i < 4; i += 1) {
    const { state: s, id } = addTask(state, { priority: 'high' }); // 4 x 30 = 120 XP
    last = moveTask(s, id, 'done', ctx);
    state = last.state;
  }
  assert.equal(getProgress(state, ctx.todayKey).level, 2);
  assert.ok(last.notices.some((n) => n.type === 'levelup'));
});

test('streak: berturut-turut, hari ini kosong masih hidup, putus bila kemarin kosong', () => {
  assert.equal(calculateStreak(['2026-10-22', '2026-10-21', '2026-10-20'], '2026-10-22'), 3);
  assert.equal(calculateStreak(['2026-10-21', '2026-10-20'], '2026-10-22'), 2);
  assert.equal(calculateStreak(['2026-10-20'], '2026-10-22'), 0);
  assert.equal(calculateStreak(['2026-10-22', '2026-10-20'], '2026-10-22'), 1);
  assert.equal(calculateStreak([], '2026-10-22'), 0);
  assert.equal(calculateStreak(['2026-10-31', '2026-10-30'], '2026-11-01'), 2); // lintas bulan
});

test('getProgress menurunkan XP, level, streak dari catatan award', () => {
  const state = createEmptyState();
  state.gamification.awardedTasks = {
    a: { xp: 10, priority: 'low', awardedDate: '2026-10-21' },
    b: { xp: 30, priority: 'high', awardedDate: '2026-10-22' },
  };
  const progress = getProgress(state, '2026-10-22');
  assert.equal(progress.totalXp, 40);
  assert.equal(progress.level, 1);
  assert.equal(progress.xpIntoLevel, 40);
  assert.equal(progress.streak, 2);
});

test('misi harian & countCompletedOn memakai tanggal selesai lokal', () => {
  let state = createEmptyState();
  for (let i = 0; i < 2; i += 1) {
    const { state: s, id } = addTask(state, {});
    state = moveTask(s, id, 'done', ctx).state;
  }
  assert.equal(countCompletedOn(state.tasks, ctx.todayKey), 2);
  assert.equal(countCompletedOn(state.tasks, '2026-10-21'), 0);
  const progress = getProgress(state, ctx.todayKey);
  assert.equal(progress.doneToday, 2);
  assert.equal(progress.missionRemaining, 1);
});

test('achievement terbuka sekali dan menghasilkan notice', () => {
  let { state, id } = addTask(createEmptyState(), { priority: 'high' });
  const first = moveTask(state, id, 'done', ctx);
  assert.ok(first.state.gamification.achievements.first_quest);
  assert.ok(first.state.gamification.achievements.boss_slayer);
  assert.equal(first.notices.filter((n) => n.type === 'achievement').length, 2);

  const second = addTask(first.state, { priority: 'low' });
  const next = moveTask(second.state, second.id, 'done', ctx);
  assert.equal(next.notices.filter((n) => n.type === 'achievement').length, 0, 'tidak dibuka dua kali');
});

test('Hat Trick: 3 tugas selesai di hari yang sama', () => {
  let state = createEmptyState();
  for (let i = 0; i < 3; i += 1) {
    const { state: s, id } = addTask(state, { priority: 'low' });
    state = moveTask(s, id, 'done', ctx).state;
  }
  assert.ok(state.gamification.achievements.hat_trick);
});
