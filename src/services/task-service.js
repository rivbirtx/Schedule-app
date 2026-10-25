/**
 * task-service.js
 * SATU-SATUNYA tempat aturan bisnis tugas (CRUD, perpindahan status, subtask, filter, statistik).
 *
 * Pola: setiap fungsi "mutasi" menerima `state` lalu mengembalikan state BARU (state lama tidak
 * diubah). Hasilnya selalu berbentuk:
 *   { ok: true,  state, task?, notices }      -> berhasil
 *   { ok: false, state, errors?, error? }     -> gagal, state tidak berubah
 * `notices` berisi pemberitahuan (XP, level up, achievement) yang nanti ditampilkan sebagai toast
 * oleh UI. Service sendiri tidak tahu apa-apa tentang DOM.
 *
 * Kanban, Tasks, Stats, agenda, dan kalender SEMUA membaca `state.tasks` yang sama.
 * Urutan array `state.tasks` menentukan urutan kartu di dalam kolom Kanban.
 */

import { TASK_SORTS, STATUSES, getPriority } from '../data/constants.js';
import { validateTaskInput } from '../utils/validation.js';
import { generateId } from '../utils/id-generator.js';
import { compareDateKeys, addDays, isoToDateKey } from '../utils/date-utils.js';
import { awardTaskCompletion, unlockAchievements, buildRewardNotices } from './gamification-service.js';

const findTask = (state, taskId) => state.tasks.find((task) => task.id === taskId);

/**
 * Ubah status satu tugas dan atur `completedAt`.
 * Menjadi 'done' -> completedAt = sekarang. Keluar dari 'done' -> completedAt = null.
 */
function withStatus(task, status, ctx) {
  if (task.status === status) return task;
  return { ...task, status, completedAt: status === 'done' ? ctx.nowIso : null };
}

/**
 * Langkah penutup setiap perubahan: bila tugas BARU selesai -> beri XP (sekali saja),
 * lalu cek achievement. Mengembalikan state akhir + notices.
 */
function settleRewards(state, task, becameDone, ctx) {
  let nextState = state;
  let reward = { xp: 0, leveledUp: false, level: 1 };
  if (becameDone) {
    const award = awardTaskCompletion(nextState, task, ctx);
    nextState = award.state;
    reward = award;
  }
  const achievements = unlockAchievements(nextState, ctx);
  return {
    state: achievements.state,
    notices: buildRewardNotices({ ...reward, unlocked: achievements.unlocked }),
  };
}

/** Buat tugas baru. Tugas yang langsung dibuat 'done' tetap mendapat XP sekali. */
export function createTask(state, input, ctx) {
  const check = validateTaskInput(input);
  if (!check.ok) return { ok: false, state, errors: check.errors };

  const task = {
    id: generateId('task'),
    ...check.value,
    createdAt: ctx.nowIso,
    completedAt: check.value.status === 'done' ? ctx.nowIso : null,
  };
  const settled = settleRewards({ ...state, tasks: [...state.tasks, task] }, task, task.status === 'done', ctx);
  return { ok: true, task, ...settled };
}

/** Edit seluruh field tugas dari formulir. */
export function updateTask(state, taskId, input, ctx) {
  const existing = findTask(state, taskId);
  if (!existing) return { ok: false, state, error: 'Task not found.' };
  const check = validateTaskInput(input);
  if (!check.ok) return { ok: false, state, errors: check.errors };

  const { status } = check.value;
  const becameDone = existing.status !== 'done' && status === 'done';
  const task = {
    ...existing,
    ...check.value,
    // tetap selesai -> pertahankan waktu selesai lama; baru selesai -> sekarang; dibuka lagi -> null
    completedAt: status === 'done' ? (existing.status === 'done' ? existing.completedAt : ctx.nowIso) : null,
  };
  const tasks = state.tasks.map((item) => (item.id === taskId ? task : item));
  const settled = settleRewards({ ...state, tasks }, task, becameDone, ctx);
  return { ok: true, task, ...settled };
}

export function deleteTask(state, taskId) {
  if (!findTask(state, taskId)) return { ok: false, state, error: 'Task not found.' };
  // Catatan XP di gamification.awardedTasks sengaja DIBIARKAN: menghapus tugas tidak mengurangi XP.
  return { ok: true, state: { ...state, tasks: state.tasks.filter((task) => task.id !== taskId) }, notices: [] };
}

/**
 * Pindahkan tugas ke status lain (dipakai drag-and-drop, menu kartu, dropdown status, checkbox).
 * @param {string|null} beforeId bila diisi, tugas diletakkan tepat sebelum tugas ini
 *                               (pengurutan ulang saat drag). Bila null, diletakkan di akhir kolom.
 */
export function moveTask(state, taskId, status, ctx, beforeId = null) {
  const existing = findTask(state, taskId);
  if (!existing) return { ok: false, state, error: 'Task not found.' };
  if (!STATUSES.some((item) => item.id === status)) return { ok: false, state, error: 'Unknown status.' };

  const moved = withStatus(existing, status, ctx);
  const becameDone = existing.status !== 'done' && status === 'done';
  const others = state.tasks.filter((task) => task.id !== taskId);

  let insertAt;
  const beforeIndex = beforeId && beforeId !== taskId ? others.findIndex((task) => task.id === beforeId) : -1;
  if (beforeIndex >= 0) {
    insertAt = beforeIndex;
  } else if (existing.status === status && !beforeId) {
    insertAt = state.tasks.findIndex((task) => task.id === taskId); // tidak berpindah: tetap di tempat
  } else {
    // akhir kolom tujuan = tepat setelah tugas terakhir bersatus sama
    const lastIndex = others.map((task) => task.status).lastIndexOf(status);
    insertAt = lastIndex >= 0 ? lastIndex + 1 : others.length;
  }
  const tasks = [...others.slice(0, insertAt), moved, ...others.slice(insertAt)];
  const settled = settleRewards({ ...state, tasks }, moved, becameDone, ctx);
  return { ok: true, task: moved, ...settled };
}

/** Centang/uncentang tugas: selesai <-> to do. */
export function toggleTaskDone(state, taskId, ctx) {
  const existing = findTask(state, taskId);
  if (!existing) return { ok: false, state, error: 'Task not found.' };
  return moveTask(state, taskId, existing.status === 'done' ? 'todo' : 'done', ctx);
}

export function toggleSubtask(state, taskId, subtaskId) {
  const existing = findTask(state, taskId);
  if (!existing) return { ok: false, state, error: 'Task not found.' };
  const subtasks = existing.subtasks.map((sub) => (sub.id === subtaskId ? { ...sub, done: !sub.done } : sub));
  const tasks = state.tasks.map((task) => (task.id === taskId ? { ...task, subtasks } : task));
  return { ok: true, state: { ...state, tasks }, notices: [] };
}

// ---------------------------------------------------------------------------
// Query / selector: membaca state, tidak mengubahnya
// ---------------------------------------------------------------------------

/** { todo: [...], in_progress: [...], review: [...], done: [...] } dengan urutan array state. */
export function groupTasksByStatus(tasks) {
  const groups = Object.fromEntries(STATUSES.map((status) => [status.id, []]));
  tasks.forEach((task) => groups[task.status]?.push(task));
  return groups;
}

/**
 * Filter + urutkan untuk halaman Tasks.
 * @param {Object[]} tasks
 * @param {{query?:string, status?:string, priority?:string, category?:string, sort?:string, direction?:'asc'|'desc'}} options
 */
export function filterAndSortTasks(tasks, options = {}) {
  const { query = '', status = 'all', priority = 'all', category = 'all', sort = 'due', direction } = options;
  const needle = query.trim().toLowerCase();
  const dir = direction ?? TASK_SORTS.find((item) => item.id === sort)?.defaultDirection ?? 'asc';

  const matches = tasks.filter(
    (task) =>
      (status === 'all' || task.status === status) &&
      (priority === 'all' || task.priority === priority) &&
      (category === 'all' || task.category === category) &&
      (!needle ||
        task.title.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle) ||
        task.category.toLowerCase().includes(needle)),
  );

  const sign = dir === 'asc' ? 1 : -1;
  const tieBreak = (a, b) => compareDateKeys(a.createdAt, b.createdAt) || a.title.localeCompare(b.title);

  return [...matches].sort((a, b) => {
    if (sort === 'due') {
      // Tugas tanpa deadline selalu di bawah, apa pun arah pengurutannya.
      if (!a.dueDate && !b.dueDate) return tieBreak(a, b);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return sign * compareDateKeys(a.dueDate, b.dueDate) || tieBreak(a, b);
    }
    if (sort === 'priority') {
      return sign * (getPriority(a.priority).rank - getPriority(b.priority).rank) || tieBreak(a, b);
    }
    return sign * compareDateKeys(a.createdAt, b.createdAt) || a.title.localeCompare(b.title);
  });
}

/**
 * Statistik dasar yang dipakai dashboard dan halaman Stats.
 * pending = to do + review (belum dikerjakan / menunggu tinjauan).
 */
export function computeTaskStats(tasks) {
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status.id, 0]));
  tasks.forEach((task) => {
    byStatus[task.status] += 1;
  });
  const total = tasks.length;
  return {
    total,
    completed: byStatus.done,
    inProgress: byStatus.in_progress,
    pending: byStatus.todo + byStatus.review,
    byStatus,
    completionRate: total === 0 ? 0 : Math.round((byStatus.done / total) * 100),
  };
}

/** Tugas belum selesai yang melewati deadline. */
export function isOverdue(task, todayKey) {
  return task.status !== 'done' && Boolean(task.dueDate) && compareDateKeys(task.dueDate, todayKey) < 0;
}

/** Progres subtask, mis. { done: 1, total: 3 }. */
export function getSubtaskProgress(task) {
  return { done: task.subtasks.filter((sub) => sub.done).length, total: task.subtasks.length };
}

/**
 * Data grafik "Progress Chart": untuk setiap hari dalam `days` hari terakhir (berakhir hari ini),
 * berapa tugas yang dibuat dan berapa yang diselesaikan (tugas yang saat ini berstatus done).
 * @returns {{dateKey: string, created: number, completed: number}[]} urut dari yang terlama
 */
export function getActivitySeries(tasks, todayKey, days) {
  const series = Array.from({ length: days }, (_, index) => ({
    dateKey: addDays(todayKey, index - (days - 1)),
    created: 0,
    completed: 0,
  }));
  const byDate = new Map(series.map((entry) => [entry.dateKey, entry]));
  tasks.forEach((task) => {
    const created = byDate.get(isoToDateKey(task.createdAt));
    if (created) created.created += 1;
    if (task.status === 'done') {
      const completed = byDate.get(isoToDateKey(task.completedAt));
      if (completed) completed.completed += 1;
    }
  });
  return series;
}
