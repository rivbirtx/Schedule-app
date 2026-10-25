/**
 * gamification-service.js
 * Aturan XP, level, streak, dan achievement. Semua fungsi MURNI: menerima state, mengembalikan
 * hasil (atau state baru) tanpa menyentuh DOM atau LocalStorage, sehingga mudah diuji.
 *
 * ATURAN (lihat WBS 6.0)
 *  - Low 10 XP, Medium 20 XP, High 30 XP.
 *  - Setiap 100 XP = 1 level (level mulai dari 1).
 *  - XP diberikan SEKALI per tugas, saat pertama kali tugas itu selesai. Catatannya disimpan di
 *    state.gamification.awardedTasks[taskId]. Membuka kembali tugas atau menghapusnya TIDAK
 *    menghapus catatan itu, dan menyelesaikannya lagi tidak memberi XP lagi.
 *  - XP total, level, dan streak tidak disimpan sendiri; semuanya DITURUNKAN dari awardedTasks.
 *    Jadi tidak mungkin ada angka yang tidak sinkron.
 *  - Streak = jumlah hari berturut-turut (sampai hari ini, atau sampai kemarin bila hari ini
 *    belum ada tugas selesai) yang memiliki minimal satu tugas yang mendapat XP.
 */

import { XP_PER_LEVEL, DAILY_MISSION_TARGET, getPriority } from '../data/constants.js';
import { addDays, isoToDateKey } from '../utils/date-utils.js';
import { ACHIEVEMENTS } from '../features/gamification/achievements.js';

/** XP yang didapat dari satu tugas berdasarkan prioritasnya. */
export function xpForPriority(priorityId) {
  return getPriority(priorityId).xp;
}

/** Jumlah seluruh XP yang pernah diberikan. */
export function getTotalXp(state) {
  return Object.values(state.gamification.awardedTasks).reduce((sum, award) => sum + award.xp, 0);
}

/**
 * Total XP -> info level.
 * @returns {{level:number, xpIntoLevel:number, xpPerLevel:number, progressPct:number}}
 */
export function calculateLevel(totalXp) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpPerLevel: XP_PER_LEVEL, progressPct: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100) };
}

/**
 * Hitung streak harian.
 * @param {Iterable<string>} dateKeys tanggal-tanggal yang punya aktivitas ('YYYY-MM-DD')
 * @param {string} todayKey
 */
export function calculateStreak(dateKeys, todayKey) {
  const days = new Set(dateKeys);
  // Hari ini belum ada tugas selesai? Streak masih hidup selama kemarin ada.
  let cursor = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Jumlah tugas berstatus selesai yang diselesaikan pada tanggal tertentu (waktu lokal). */
export function countCompletedOn(tasks, dateKey) {
  return tasks.filter((task) => task.status === 'done' && isoToDateKey(task.completedAt) === dateKey).length;
}

/**
 * Ringkasan progres untuk header, Stats, dan misi harian.
 */
export function getProgress(state, todayKey) {
  const totalXp = getTotalXp(state);
  const awardedDates = Object.values(state.gamification.awardedTasks).map((award) => award.awardedDate);
  const doneToday = countCompletedOn(state.tasks, todayKey);
  return {
    totalXp,
    ...calculateLevel(totalXp),
    streak: calculateStreak(awardedDates, todayKey),
    doneToday,
    missionTarget: DAILY_MISSION_TARGET,
    missionRemaining: Math.max(0, DAILY_MISSION_TARGET - doneToday),
  };
}

/** Angka mentah yang dibaca oleh achievements.js. */
export function getMetrics(state, todayKey) {
  const awards = Object.values(state.gamification.awardedTasks);
  const perDay = {};
  awards.forEach((award) => {
    perDay[award.awardedDate] = (perDay[award.awardedDate] ?? 0) + 1;
  });
  const progress = getProgress(state, todayKey);
  return {
    completedCount: awards.length,
    totalXp: progress.totalXp,
    level: progress.level,
    streak: progress.streak,
    bestDayCount: Math.max(0, ...Object.values(perDay)),
    highDone: awards.filter((award) => award.priority === 'high').length,
    eventCount: state.events.length,
  };
}

/**
 * Beri XP untuk tugas yang BARU SAJA selesai, jika belum pernah diberi.
 * @returns {{state: Object, xp: number, leveledUp: boolean, level: number}} xp = 0 bila sudah pernah
 */
export function awardTaskCompletion(state, task, ctx) {
  const before = calculateLevel(getTotalXp(state));
  if (state.gamification.awardedTasks[task.id]) {
    return { state, xp: 0, leveledUp: false, level: before.level };
  }
  const xp = xpForPriority(task.priority);
  const nextState = {
    ...state,
    gamification: {
      ...state.gamification,
      awardedTasks: {
        ...state.gamification.awardedTasks,
        [task.id]: { xp, priority: task.priority, awardedDate: ctx.todayKey },
      },
    },
  };
  const after = calculateLevel(getTotalXp(nextState));
  return { state: nextState, xp, leveledUp: after.level > before.level, level: after.level };
}

/**
 * Buka achievement baru (yang sudah terbuka tidak dibuka dua kali).
 * @returns {{state: Object, unlocked: Object[]}} unlocked = definisi achievement yang baru terbuka
 */
export function unlockAchievements(state, ctx) {
  const metrics = getMetrics(state, ctx.todayKey);
  const unlocked = ACHIEVEMENTS.filter(
    (achievement) => !state.gamification.achievements[achievement.id] && achievement.isUnlocked(metrics),
  );
  if (unlocked.length === 0) return { state, unlocked };
  const achievements = { ...state.gamification.achievements };
  unlocked.forEach((achievement) => {
    achievements[achievement.id] = ctx.nowIso;
  });
  return { state: { ...state, gamification: { ...state.gamification, achievements } }, unlocked };
}

/**
 * Susun daftar pemberitahuan (toast) dari hasil award + achievement.
 * @returns {{type:string, message:string, detail?:string}[]}
 */
export function buildRewardNotices({ xp = 0, leveledUp = false, level = 1, unlocked = [] }) {
  const notices = [];
  if (xp > 0) notices.push({ type: 'xp', message: `+${xp} XP` });
  if (leveledUp) notices.push({ type: 'levelup', message: `LEVEL UP! You are now level ${level}` });
  unlocked.forEach((achievement) =>
    notices.push({ type: 'achievement', message: `Achievement unlocked: ${achievement.title}`, detail: achievement.description }),
  );
  return notices;
}
