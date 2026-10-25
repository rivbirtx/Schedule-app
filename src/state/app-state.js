/**
 * app-state.js
 * "Otak" aplikasi: menyimpan state yang sedang aktif dan menjadi PINTU TUNGGAL untuk mengubahnya.
 *
 * Ada dua jenis state:
 *   1. DATA (disimpan ke LocalStorage): tasks, events, gamification, settings.
 *   2. UI   (hanya di memori)         : halaman aktif, filter, view kalender, menu kartu yang terbuka.
 *
 * Alur setiap perubahan data:
 *   komponen/feature memanggil action (mis. addTask)
 *     -> action memanggil fungsi service (aturan bisnis, murni)
 *     -> hasil ok? -> state diganti, disimpan ke LocalStorage, pemberitahuan dikirim, subscriber dipanggil
 *     -> main.js (subscriber) merender ulang tampilan dari state terbaru.
 *
 * Modul ini TIDAK mengimpor komponen UI. Pemberitahuan (toast) dikirim lewat `onNotice`
 * sehingga tidak ada ketergantungan melingkar dengan lapisan tampilan.
 */

import { DEFAULT_SETTINGS, STORAGE_KEY, TASK_SORTS, PAGE_IDS } from '../data/constants.js';
import { createEmptyState } from '../data/empty-state.js';
import { createDemoState } from '../data/demo-data.js';
import { createTimeContext } from '../utils/date-utils.js';
import { loadState, saveState, importStateText } from '../services/storage-service.js';
import * as taskService from '../services/task-service.js';
import * as eventService from '../services/event-service.js';

// ---------------------------------------------------------------------------
// State internal
// ---------------------------------------------------------------------------

let state = createEmptyState();
let ui = createInitialUi(createTimeContext().todayKey);
let storageAvailable = true;
let storageRef; // opsional: Storage tiruan untuk pengujian (undefined = localStorage peramban)

const subscribers = new Set();
const noticeListeners = new Set();

function createInitialUi(todayKey) {
  return {
    page: 'dashboard',
    agendaDate: todayKey, // tanggal di panel Today Schedule
    calendar: { view: 'month', date: todayKey, selected: todayKey },
    taskFilters: { query: '', status: 'all', priority: 'all', category: 'all', sort: 'due', direction: 'asc' },
    menuTaskId: null, // kartu Kanban yang menu aksinya sedang terbuka
    statsRange: '7',
  };
}

// ---------------------------------------------------------------------------
// Membaca
// ---------------------------------------------------------------------------

export const getState = () => state;
export const getUi = () => ui;
export const isStorageAvailable = () => storageAvailable;

/** Daftar callback yang dipanggil setiap data/UI berubah. Mengembalikan fungsi berhenti-berlangganan. */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/** Pemberitahuan { type, message, detail? } untuk ditampilkan sebagai toast oleh lapisan UI. */
export function onNotice(listener) {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

const notify = () => subscribers.forEach((listener) => listener(state, ui));
const emitNotice = (notice) => noticeListeners.forEach((listener) => listener(notice));

// ---------------------------------------------------------------------------
// Inisialisasi & penyimpanan
// ---------------------------------------------------------------------------

/**
 * Muat data dari LocalStorage.
 *  - belum ada data     -> data demo
 *  - data valid         -> dipakai apa adanya (data demo TIDAK menimpa)
 *  - data rusak         -> salinan mentah dicadangkan (storage-service), aplikasi mulai kosong
 */
export function initApp(storage) {
  storageRef = storage;
  const loaded = loadState(storageRef);
  const ctx = createTimeContext();

  if (loaded.status === 'ok') {
    state = loaded.state;
  } else if (loaded.status === 'recovered') {
    state = createEmptyState();
    emitNotice({
      type: 'error',
      message: 'Saved data was corrupted. A backup copy was kept; starting with an empty board.',
      detail: 'Settings -> Data -> Download backup',
    });
  } else {
    state = createDemoState(ctx.todayKey);
  }
  storageAvailable = loaded.status !== 'unavailable';

  ui = createInitialUi(ctx.todayKey);
  ui.page = PAGE_IDS.includes(state.settings.defaultPage) ? state.settings.defaultPage : 'dashboard';
  if (loaded.status === 'empty') persist();
  if (loaded.status === 'unavailable') {
    emitNotice({ type: 'error', message: 'LocalStorage is unavailable. Changes will be lost on reload.' });
  }
  return loaded.status;
}

let persistWarningShown = false;
function persist() {
  const saved = saveState(state, storageRef);
  if (!saved && !persistWarningShown) {
    persistWarningShown = true;
    storageAvailable = false;
    emitNotice({ type: 'error', message: 'Could not save to LocalStorage (storage full or blocked).' });
  }
}

/** Sinkronkan antar-tab: tab lain menulis data baru -> muat ulang di tab ini. */
export function reloadFromStorage() {
  const loaded = loadState(storageRef);
  if (loaded.status !== 'ok') return false;
  state = loaded.state;
  notify();
  return true;
}
export { STORAGE_KEY };

/** Terapkan hasil service: ganti state, simpan, kirim notices. @returns hasil yang sama */
function commit(result) {
  if (!result.ok) return result;
  state = result.state;
  persist();
  (result.notices ?? []).forEach(emitNotice);
  notify();
  return result;
}

// ---------------------------------------------------------------------------
// Action: tugas
// ---------------------------------------------------------------------------

export const addTask = (input) => commit(taskService.createTask(state, input, createTimeContext()));
export const editTask = (taskId, input) => commit(taskService.updateTask(state, taskId, input, createTimeContext()));
export const removeTask = (taskId) => {
  if (ui.menuTaskId === taskId) ui = { ...ui, menuTaskId: null };
  return commit(taskService.deleteTask(state, taskId));
};
export const moveTaskToStatus = (taskId, status, beforeId = null) => {
  ui = { ...ui, menuTaskId: null };
  return commit(taskService.moveTask(state, taskId, status, createTimeContext(), beforeId));
};
export const toggleTaskDone = (taskId) => commit(taskService.toggleTaskDone(state, taskId, createTimeContext()));
export const toggleSubtask = (taskId, subtaskId) => commit(taskService.toggleSubtask(state, taskId, subtaskId));

// ---------------------------------------------------------------------------
// Action: event
// ---------------------------------------------------------------------------

export const addEvent = (input) => commit(eventService.createEvent(state, input, createTimeContext()));
export const editEvent = (eventId, input) => commit(eventService.updateEvent(state, eventId, input));
export const removeEvent = (eventId) => commit(eventService.deleteEvent(state, eventId));

// ---------------------------------------------------------------------------
// Action: pengaturan & data
// ---------------------------------------------------------------------------

export function updateSettings(patch) {
  state = { ...state, settings: { ...state.settings, ...patch } };
  persist();
  notify();
}

/** Ganti seluruh tugas/event/XP dengan data demo. Pengaturan pengguna dipertahankan. */
export function resetToDemoData() {
  const demo = createDemoState(createTimeContext().todayKey);
  state = { ...demo, settings: state.settings };
  ui = { ...ui, menuTaskId: null };
  persist();
  notify();
}

/** Hapus semua tugas, event, dan XP (mulai dari nol). Pengaturan dipertahankan. */
export function clearAllData() {
  state = { ...createEmptyState(), settings: state.settings };
  ui = { ...ui, menuTaskId: null };
  persist();
  notify();
}

/** @returns {{ok: boolean, error?: string, problems?: string[]}} */
export function importData(text) {
  const result = importStateText(text);
  if (!result.ok) return result;
  state = result.state;
  persist();
  notify();
  return result;
}

// ---------------------------------------------------------------------------
// Action: UI (tidak disimpan)
// ---------------------------------------------------------------------------

export function setPage(page) {
  if (!PAGE_IDS.includes(page) || ui.page === page) return;
  ui = { ...ui, page, menuTaskId: null };
  notify();
}

export function setAgendaDate(dateKey) {
  ui = { ...ui, agendaDate: dateKey };
  notify();
}

/** `patch` boleh berisi view, date, selected. */
export function setCalendar(patch) {
  ui = { ...ui, calendar: { ...ui.calendar, ...patch } };
  notify();
}

/**
 * Ubah filter halaman Tasks. Jika `sort` diganti tanpa `direction`,
 * arah pengurutan kembali ke bawaan jenis pengurutan itu.
 */
export function setTaskFilters(patch) {
  const next = { ...ui.taskFilters, ...patch };
  if (patch.sort && !patch.direction) {
    next.direction = TASK_SORTS.find((item) => item.id === patch.sort)?.defaultDirection ?? 'asc';
  }
  ui = { ...ui, taskFilters: next };
  notify();
}

export function resetTaskFilters() {
  ui = { ...ui, taskFilters: createInitialUi(ui.agendaDate).taskFilters };
  notify();
}

export function setMenuTask(taskId) {
  ui = { ...ui, menuTaskId: taskId };
  notify();
}

export function setStatsRange(rangeId) {
  ui = { ...ui, statsRange: rangeId };
  notify();
}

/** Untuk pengujian: kembalikan modul ke kondisi awal. */
export function __resetForTests() {
  state = createEmptyState();
  ui = createInitialUi(createTimeContext().todayKey);
  storageAvailable = true;
  storageRef = undefined;
  persistWarningShown = false;
  subscribers.clear();
  noticeListeners.clear();
}

export { DEFAULT_SETTINGS };
