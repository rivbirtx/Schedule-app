/**
 * achievements.js
 * Daftar achievement. Setiap achievement hanyalah DATA + satu fungsi `isUnlocked(metrics)`.
 *
 * `metrics` dihitung oleh gamification-service (lihat getMetrics), bentuknya:
 *   { completedCount, totalXp, level, streak, bestDayCount, highDone, eventCount }
 *
 * Menambah achievement baru = menambah satu objek ke ACHIEVEMENTS. Tidak ada kode lain
 * yang perlu diubah. `icon` mengacu ke nama ikon di components/icons.js.
 */

export const ACHIEVEMENTS = [
  {
    id: 'first_quest',
    title: 'First Quest',
    description: 'Complete your first task.',
    icon: 'check',
    color: 'green',
    isUnlocked: (m) => m.completedCount >= 1,
  },
  {
    id: 'hat_trick',
    title: 'Hat Trick',
    description: 'Complete 3 tasks in a single day.',
    icon: 'star',
    color: 'yellow',
    isUnlocked: (m) => m.bestDayCount >= 3,
  },
  {
    id: 'task_hunter',
    title: 'Task Hunter',
    description: 'Complete 10 tasks.',
    icon: 'trophy',
    color: 'purple',
    isUnlocked: (m) => m.completedCount >= 10,
  },
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    description: 'Complete a High priority task.',
    icon: 'alert',
    color: 'red',
    isUnlocked: (m) => m.highDone >= 1,
  },
  {
    id: 'on_fire',
    title: 'On Fire',
    description: 'Reach a 3-day streak.',
    icon: 'flame',
    color: 'pink',
    isUnlocked: (m) => m.streak >= 3,
  },
  {
    id: 'level_3',
    title: 'Level Up!',
    description: 'Reach level 3.',
    icon: 'star',
    color: 'cyan',
    isUnlocked: (m) => m.level >= 3,
  },
  {
    id: 'xp_hoarder',
    title: 'XP Hoarder',
    description: 'Earn 300 XP in total.',
    icon: 'trophy',
    color: 'yellow',
    isUnlocked: (m) => m.totalXp >= 300,
  },
  {
    id: 'planner',
    title: 'Planner',
    description: 'Schedule 3 events in the calendar.',
    icon: 'calendar',
    color: 'blue',
    isUnlocked: (m) => m.eventCount >= 3,
  },
];

export const getAchievement = (id) => ACHIEVEMENTS.find((achievement) => achievement.id === id);
