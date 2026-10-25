/**
 * main.js - TITIK MASUK APLIKASI (file pertama yang sebaiknya dibaca pemula).
 *
 * Tugas file ini hanya "merangkai":
 *   1. memuat CSS                           (styles/input.css)
 *   2. memuat data                          (state/app-state.js -> LocalStorage atau data demo)
 *   3. memasang event listener SEKALI SAJA  (features/*)
 *   4. merender tampilan dari state, dan merender ulang setiap state berubah
 *
 * Alur data (searah, mudah dilacak):
 *
 *   klik/ketik pengguna
 *     -> features/*  (membaca atribut data-action pada elemen)
 *     -> state/app-state.js  (action: addTask, moveTaskToStatus, ...)
 *     -> services/*          (aturan bisnis, mengembalikan state BARU)
 *     -> simpan ke LocalStorage + panggil subscriber
 *     -> render() di bawah   (menggambar ulang sidebar, header, halaman dari state terbaru)
 *
 * DOM tidak pernah menjadi sumber data: tampilan selalu hasil gambar ulang dari state.
 */
import './styles/input.css';

import { PAGES } from './data/constants.js';
import { createTimeContext } from './utils/date-utils.js';
import { render, captureViewState, restoreViewState } from './utils/dom-utils.js';
import { initApp, getState, getUi, subscribe, onNotice, reloadFromStorage, STORAGE_KEY } from './state/app-state.js';
import { getProgress } from './services/gamification-service.js';

import { renderSidebar, renderBottomNav } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/toast.js';

import { renderDashboard } from './pages/dashboard.js';
import { renderCalendarPage } from './pages/calendar-page.js';
import { renderTasksPage } from './pages/tasks-page.js';
import { renderStatsPage } from './pages/stats-page.js';
import { renderSettingsPage } from './pages/settings-page.js';

import { initRouter } from './features/navigation/router.js';
import { bindTaskActions } from './features/tasks/task-actions.js';
import { bindCalendarActions } from './features/calendar/calendar-actions.js';
import { bindSettingsActions } from './features/settings/settings-actions.js';
import { bindDragAndDrop } from './features/kanban/drag-and-drop.js';
import { moveTaskToStatus } from './state/app-state.js';

/** Peta id halaman -> fungsi yang menyusun halaman. Menambah halaman = tambah satu baris di sini. */
const PAGE_RENDERERS = {
  dashboard: renderDashboard,
  calendar: renderCalendarPage,
  tasks: renderTasksPage,
  stats: renderStatsPage,
  settings: renderSettingsPage,
};

const elements = {
  sidebar: document.getElementById('sidebar'),
  header: document.getElementById('header'),
  page: document.getElementById('page'),
  bottomNav: document.getElementById('bottom-nav'),
};

/** HTML terakhir tiap area. Area yang HTML-nya tidak berubah tidak disentuh (tanpa kedip/ganti fokus). */
const lastHtml = new Map();

function paint(name, element, safeHtml) {
  const next = safeHtml.toString();
  if (lastHtml.get(name) === next) return;
  lastHtml.set(name, next);
  render(element, safeHtml);
}

/** Gambar seluruh layar dari state saat ini. */
function renderApp() {
  const state = getState();
  const ui = getUi();
  const ctx = createTimeContext();
  const progress = getProgress(state, ctx.todayKey);
  const pageInfo = PAGES.find((page) => page.id === ui.page) ?? PAGES[0];

  const snapshot = captureViewState(document.body);

  paint('sidebar', elements.sidebar, renderSidebar({ ui, progress }));
  paint('header', elements.header, renderHeader({ title: pageInfo.label.toUpperCase(), progress, todayKey: ctx.todayKey }));
  paint('bottom-nav', elements.bottomNav, renderBottomNav({ ui }));
  paint('page', elements.page, PAGE_RENDERERS[ui.page]({ state, ui, ctx, progress }));
  if (elements.page.dataset.page && elements.page.dataset.page !== ui.page) window.scrollTo(0, 0);

  document.title = `${pageInfo.label} · Pixel Schedule`;
  elements.page.dataset.page = ui.page;

  restoreViewState(document.body, snapshot);
}

function start() {
  // Toast untuk semua pemberitahuan dari state (XP, level up, achievement, error penyimpanan).
  onNotice(showToast);
  initApp();

  // Pasang listener SEKALI di elemen induk (event delegation): tetap bekerja setelah render ulang.
  bindTaskActions(document.body);
  bindCalendarActions(document.body);
  bindSettingsActions(document.body);
  bindDragAndDrop(document.body, { onMove: moveTaskToStatus });

  subscribe(renderApp);
  initRouter(); // memanggil setPage() -> subscriber -> render pertama
  renderApp(); // jaga-jaga bila halaman awal sama dengan state awal (setPage tidak memberi tahu)

  // Tab lain mengubah data -> muat ulang di tab ini.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) reloadFromStorage();
  });

  // Badge "NOW" dan pergantian hari: gambar ulang tiap menit dan saat tab kembali aktif.
  setInterval(renderApp, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderApp();
  });
}

start();
