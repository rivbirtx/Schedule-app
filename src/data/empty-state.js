import { SCHEMA_VERSION, DEFAULT_SETTINGS } from './constants.js';

/**
 * Bentuk (schema) data aplikasi. Hanya data ini yang disimpan ke LocalStorage.
 *
 * - tasks[]                  : daftar tugas (sumber data tunggal untuk Kanban, Tasks, Stats, kalender)
 * - events[]                 : daftar event kalender
 * - gamification.awardedTasks: { [taskId]: { xp, priority, awardedDate } } -> catatan XP yang sudah
 *                              diberikan. XP, level, dan streak SEMUA diturunkan dari sini.
 * - gamification.achievements: { [achievementId]: isoTimestamp }
 * - settings                 : preferensi pengguna
 *
 * @returns {import('../utils/validation.js').AppState}
 */
export function createEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    events: [],
    gamification: { awardedTasks: {}, achievements: {} },
    settings: { ...DEFAULT_SETTINGS },
  };
}
