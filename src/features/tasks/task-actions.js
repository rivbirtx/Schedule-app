/**
 * task-actions.js
 * Menghubungkan klik/ubah pada elemen bertanda data-action ke tindakan tugas:
 * tambah, edit, hapus, pindah status, centang selesai, menu kartu, dan filter halaman Tasks.
 *
 * Pola event delegation: SATU listener di `root` untuk semua elemen yang cocok, termasuk
 * yang dirender ulang kemudian. Dipasang sekali dari main.js (tidak menumpuk).
 */
import { delegate } from '../../utils/dom-utils.js';
import {
  getUi, setMenuTask, moveTaskToStatus, toggleTaskDone, setTaskFilters, resetTaskFilters,
} from '../../state/app-state.js';
import { openTaskModal } from '../../components/task-modal.js';
import { deleteTaskFlow } from '../../components/delete-flow.js';
import { hasOpenModal } from '../../components/modal.js';

/**
 * Menu kartu akan hilang saat dirender ulang. Agar fokus keyboard tidak terlempar,
 * sebelum membuka modal kita tutup menu dan fokuskan tombol ⋮ yang sama
 * (modal akan mengembalikan fokus ke sana saat ditutup).
 */
function closeMenuKeepingFocus(taskId) {
  if (getUi().menuTaskId !== taskId) return;
  setMenuTask(null);
  document.querySelector(`[data-focus-id="menu-${CSS.escape(taskId)}"]`)?.focus();
}

export function bindTaskActions(root) {
  delegate(root, 'click', '[data-action="add-task"]', (_event, element) => {
    openTaskModal({ status: element.dataset.status || 'todo', dueDate: element.dataset.date || '' });
  });

  delegate(root, 'click', '[data-action="edit-task"]', (_event, element) => {
    closeMenuKeepingFocus(element.dataset.id);
    openTaskModal({ taskId: element.dataset.id });
  });

  delegate(root, 'click', '[data-action="delete-task"]', (_event, element) => {
    closeMenuKeepingFocus(element.dataset.id);
    deleteTaskFlow(element.dataset.id);
  });

  delegate(root, 'click', '[data-action="move-task"]', (_event, element) => {
    moveTaskToStatus(element.dataset.id, element.dataset.status);
  });

  delegate(root, 'click', '[data-action="toggle-menu"]', (_event, element) => {
    const { menuTaskId } = getUi();
    setMenuTask(menuTaskId === element.dataset.id ? null : element.dataset.id);
  });

  // Checkbox di halaman Tasks: centang = selesai, hapus centang = kembali ke To Do
  delegate(root, 'change', '[data-action="toggle-done"]', (_event, element) => {
    toggleTaskDone(element.dataset.id);
  });

  // Dropdown status di baris daftar Tasks
  delegate(root, 'change', '[data-action="set-status"]', (_event, element) => {
    moveTaskToStatus(element.dataset.id, element.value);
  });

  // ---- Filter halaman Tasks ---------------------------------------------------
  delegate(root, 'input', 'input[data-filter]', (_event, element) => {
    setTaskFilters({ [element.dataset.filter]: element.value });
  });
  delegate(root, 'change', 'select[data-filter]', (_event, element) => {
    setTaskFilters({ [element.dataset.filter]: element.value });
  });
  delegate(root, 'click', '[data-action="toggle-sort-dir"]', () => {
    setTaskFilters({ direction: getUi().taskFilters.direction === 'asc' ? 'desc' : 'asc' });
  });
  delegate(root, 'click', '[data-action="clear-filters"]', () => resetTaskFilters());

  // ---- Menutup menu kartu: klik di luar, atau tekan Esc ----------------------
  document.addEventListener('click', (event) => {
    if (!getUi().menuTaskId) return;
    const inside = event.target instanceof Element && event.target.closest('.task-card__actions, [data-action="toggle-menu"]');
    if (!inside) setMenuTask(null);
  });
  document.addEventListener('keydown', (event) => {
    const { menuTaskId } = getUi();
    if (event.key !== 'Escape' || !menuTaskId || hasOpenModal()) return;
    setMenuTask(null);
    document.querySelector(`[data-focus-id="menu-${CSS.escape(menuTaskId)}"]`)?.focus();
  });
}
