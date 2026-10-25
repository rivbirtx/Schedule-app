import { createEmptyState } from './empty-state.js';
import { addDays } from '../utils/date-utils.js';

/**
 * Data demo mengikuti gambar referensi. Tanggal dibuat RELATIF terhadap hari ini
 * (offset hari) agar demo selalu terlihat segar. Hanya dimuat saat belum ada data pengguna
 * atau saat pengguna menekan "Reset Demo Data".
 *
 * @param {string} todayKey 'YYYY-MM-DD'
 */
export function createDemoState(todayKey) {
  const state = createEmptyState();

  // 'YYYY-MM-DDTHH:MM:00' tanpa zona = waktu LOKAL; toISOString() mengubahnya ke UTC untuk disimpan.
  const isoAt = (offsetDays, time) => new Date(`${addDays(todayKey, offsetDays)}T${time}:00`).toISOString();

  const task = (id, title, status, priority, category, dueOffset, extra = {}) => ({
    id,
    title,
    description: extra.description ?? '',
    status,
    priority,
    category,
    dueDate: addDays(todayKey, dueOffset),
    subtasks: (extra.subtasks ?? []).map(([subTitle, done], index) => ({ id: `${id}_s${index}`, title: subTitle, done })),
    createdAt: isoAt(extra.createdOffset ?? -3, '09:00'),
    completedAt: status === 'done' ? isoAt(extra.doneOffset ?? -1, '15:00') : null,
  });

  state.tasks = [
    task('demo_t1', 'Desain UI Login', 'todo', 'high', 'UI/UX', 0, {
      description: 'Buat tampilan halaman login dengan tema pixel art.',
      createdOffset: -2,
      subtasks: [['Buat wireframe', true], ['Implement HTML & CSS', false], ['Tambahkan interaksi JavaScript', false]],
    }),
    task('demo_t2', 'Perbaiki Bug Upload', 'todo', 'high', 'Backend', 1, { createdOffset: -1 }),
    task('demo_t3', 'Tulis Laporan', 'todo', 'medium', 'Document', 3, { createdOffset: 0 }),
    task('demo_t4', 'Integrasi Database', 'in_progress', 'medium', 'Backend', 2, { createdOffset: -4 }),
    task('demo_t5', 'Implementasi Auth', 'in_progress', 'medium', 'Backend', 2, { createdOffset: -3 }),
    task('demo_t6', 'Review Kode', 'review', 'low', 'Code', 1, { createdOffset: -5 }),
    task('demo_t7', 'Pelajari Tailwind CSS', 'done', 'low', 'Learning', -1, { createdOffset: -6, doneOffset: -1 }),
    task('demo_t8', 'Buat Presentasi', 'done', 'low', 'Presentation', -2, { createdOffset: -5, doneOffset: -2 }),
  ];

  // Dua tugas selesai sudah mendapat XP (10 + 10) pada tanggal selesainya -> streak awal 2 hari.
  state.gamification.awardedTasks = {
    demo_t7: { xp: 10, priority: 'low', awardedDate: addDays(todayKey, -1) },
    demo_t8: { xp: 10, priority: 'low', awardedDate: addDays(todayKey, -2) },
  };
  state.gamification.achievements = {
    first_quest: isoAt(-2, '15:00'),
    planner: isoAt(-1, '10:00'), // demo sudah punya >= 3 event
  };

  state.events = [
    { id: 'demo_e1', title: 'Meeting Tim', date: todayKey, startTime: '08:00', endTime: '09:00', color: 'cyan', notes: '' },
    { id: 'demo_e2', title: 'Desain UI Login', date: todayKey, startTime: '10:00', endTime: '12:00', color: 'pink', notes: '' },
    { id: 'demo_e3', title: 'Integrasi Database', date: todayKey, startTime: '13:00', endTime: '14:00', color: 'blue', notes: '' },
    { id: 'demo_e4', title: 'Review Kode', date: todayKey, startTime: '15:00', endTime: '16:00', color: 'purple', notes: '' },
    { id: 'demo_e5', title: 'Tulis Laporan', date: todayKey, startTime: '19:00', endTime: '20:00', color: 'yellow', notes: '' },
    { id: 'demo_e6', title: 'Sprint Planning', date: addDays(todayKey, 3), startTime: '09:00', endTime: '10:30', color: 'green', notes: '' },
  ];

  return state;
}
