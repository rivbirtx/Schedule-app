/**
 * delete-flow.js
 * Alur hapus yang dipakai bersama (kartu Kanban, daftar Tasks, kalender, dan tombol Delete di modal):
 * konfirmasi (jika diaktifkan di Settings) -> hapus lewat app-state -> toast.
 * Ditaruh di satu file agar logika konfirmasi tidak diduplikasi.
 *
 * @returns {Promise<boolean>} true jika benar-benar terhapus
 */
import { getState, removeTask, removeEvent } from '../state/app-state.js';
import { confirmDialog } from './confirm-dialog.js';
import { showToast } from './toast.js';

export async function deleteTaskFlow(taskId) {
  const task = getState().tasks.find((item) => item.id === taskId);
  if (!task) return false;
  if (getState().settings.confirmDelete) {
    const confirmed = await confirmDialog({
      title: 'DELETE TASK?',
      message: `"${task.title}" will be removed. XP you already earned is kept.`,
    });
    if (!confirmed) return false;
  }
  removeTask(taskId);
  showToast({ type: 'success', message: 'Task deleted.' });
  return true;
}

export async function deleteEventFlow(eventId) {
  const event = getState().events.find((item) => item.id === eventId);
  if (!event) return false;
  if (getState().settings.confirmDelete) {
    const confirmed = await confirmDialog({
      title: 'DELETE EVENT?',
      message: `"${event.title}" will be removed from the calendar.`,
    });
    if (!confirmed) return false;
  }
  removeEvent(eventId);
  showToast({ type: 'success', message: 'Event deleted.' });
  return true;
}
