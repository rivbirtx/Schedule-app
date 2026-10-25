/**
 * constants.js
 * Semua nilai tetap aplikasi (status, prioritas, kategori, aturan XP, kunci storage).
 * File ini TIDAK mengimpor modul lain, jadi aman diimpor dari mana saja
 * tanpa risiko ketergantungan melingkar.
 */

export const APP_VERSION = '1.0.0';

// ---- Penyimpanan -----------------------------------------------------------
export const STORAGE_KEY = 'pixelschedule.v1';
export const BACKUP_KEY = 'pixelschedule.v1.backup';
export const SCHEMA_VERSION = 1;

// ---- Status Kanban (urutan = urutan kolom) ---------------------------------
// `color` adalah nama warna design token (lihat src/styles/tokens.css).
export const STATUSES = [
  { id: 'todo', label: 'TO DO', color: 'blue' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'yellow' },
  { id: 'review', label: 'REVIEW', color: 'purple' },
  { id: 'done', label: 'DONE', color: 'green' },
];
export const STATUS_IDS = STATUSES.map((status) => status.id);

// ---- Prioritas + XP --------------------------------------------------------
// Aturan XP: Low 10, Medium 20, High 30 (diberikan sekali saat tugas pertama kali selesai).
export const PRIORITIES = [
  { id: 'low', label: 'Low', xp: 10, rank: 1, color: 'green' },
  { id: 'medium', label: 'Medium', xp: 20, rank: 2, color: 'yellow' },
  { id: 'high', label: 'High', xp: 30, rank: 3, color: 'red' },
];
export const PRIORITY_IDS = PRIORITIES.map((priority) => priority.id);

// ---- Kategori --------------------------------------------------------------
export const CATEGORIES = [
  { id: 'UI/UX', color: 'purple' },
  { id: 'Backend', color: 'blue' },
  { id: 'Code', color: 'cyan' },
  { id: 'Learning', color: 'green' },
  { id: 'Document', color: 'yellow' },
  { id: 'Presentation', color: 'pink' },
  { id: 'Other', color: 'muted' },
];
export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);
export const DEFAULT_CATEGORY = 'Other';

// ---- Event -----------------------------------------------------------------
export const EVENT_COLORS = ['blue', 'pink', 'yellow', 'purple', 'green', 'cyan'];

// ---- Gamification ----------------------------------------------------------
export const XP_PER_LEVEL = 100; // setiap 100 XP naik 1 level
export const DAILY_MISSION_TARGET = 3; // "Selesaikan 3 tugas hari ini"

// ---- Kalender, daftar tugas, statistik --------------------------------------
export const CALENDAR_VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

// direction bawaan tiap jenis pengurutan: due = terdekat dulu, priority = tertinggi dulu, created = terbaru dulu
export const TASK_SORTS = [
  { id: 'due', label: 'Due Date', defaultDirection: 'asc' },
  { id: 'priority', label: 'Priority', defaultDirection: 'desc' },
  { id: 'created', label: 'Created', defaultDirection: 'desc' },
];

export const STATS_RANGES = [
  { id: '7', label: 'Last 7 Days', days: 7 },
  { id: '30', label: 'Last 30 Days', days: 30 },
];

// ---- Halaman ---------------------------------------------------------------
export const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];
export const PAGE_IDS = PAGES.map((page) => page.id);

// ---- Pengaturan bawaan -----------------------------------------------------
export const DEFAULT_SETTINGS = Object.freeze({
  defaultPage: 'dashboard',
  confirmDelete: true,
});

// ---- Batas input -----------------------------------------------------------
export const LIMITS = Object.freeze({
  TITLE_MAX: 80,
  DESCRIPTION_MAX: 500,
  SUBTASK_MAX: 80,
  SUBTASKS_PER_TASK: 20,
});

// ---- Helper pencarian metadata --------------------------------------------
export const getStatus = (id) => STATUSES.find((status) => status.id === id) ?? STATUSES[0];
export const getPriority = (id) => PRIORITIES.find((priority) => priority.id === id) ?? PRIORITIES[1];
export const getCategory = (id) =>
  CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
