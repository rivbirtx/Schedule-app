/**
 * settings-actions.js
 * Aksi di halaman Settings: pengaturan, ekspor/impor JSON, reset data demo, hapus semua data,
 * unduh cadangan data rusak, dan rentang waktu di halaman Stats.
 *
 * Semua aksi yang merusak data (impor, reset, hapus) meminta konfirmasi lebih dulu.
 */
import { delegate, downloadTextFile } from '../../utils/dom-utils.js';
import { getTodayKey } from '../../utils/date-utils.js';
import {
  getState, updateSettings, resetToDemoData, clearAllData, importData, setStatsRange,
} from '../../state/app-state.js';
import { exportStateText, importStateText, getBackupText } from '../../services/storage-service.js';
import { confirmDialog } from '../../components/confirm-dialog.js';
import { showToast } from '../../components/toast.js';

async function handleImportFile(file) {
  const text = await file.text();
  const check = importStateText(text); // validasi dulu; data aktif belum disentuh
  if (!check.ok) {
    showToast({ type: 'error', message: `Import failed: ${check.error}` });
    return;
  }
  const confirmed = await confirmDialog({
    title: 'IMPORT DATA?',
    message: `This replaces your current tasks, events and XP with the file's data (${check.state.tasks.length} tasks, ${check.state.events.length} events).`,
    confirmLabel: 'Import',
    tone: 'primary',
  });
  if (!confirmed) return;
  importData(text);
  showToast({ type: 'success', message: 'Data imported.', detail: check.problems.join('; ') });
}

export function bindSettingsActions(root) {
  delegate(root, 'change', 'select[data-setting]', (_event, element) => {
    updateSettings({ [element.dataset.setting]: element.value });
    showToast({ type: 'success', message: 'Setting saved.' });
  });
  delegate(root, 'change', 'input[type="checkbox"][data-setting]', (_event, element) => {
    updateSettings({ [element.dataset.setting]: element.checked });
    showToast({ type: 'success', message: 'Setting saved.' });
  });

  delegate(root, 'click', '[data-action="export-data"]', () => {
    downloadTextFile(`pixel-schedule-${getTodayKey()}.json`, exportStateText(getState()));
    showToast({ type: 'success', message: 'Data exported.' });
  });

  delegate(root, 'click', '[data-action="import-data"]', () => {
    document.getElementById('import-file')?.click();
  });
  delegate(root, 'change', '#import-file', async (_event, element) => {
    const [file] = element.files;
    element.value = ''; // agar file yang sama bisa dipilih lagi
    if (file) await handleImportFile(file);
  });

  delegate(root, 'click', '[data-action="download-backup"]', () => {
    const backup = getBackupText();
    if (backup) downloadTextFile('pixel-schedule-corrupted-backup.json', backup, 'text/plain');
  });

  delegate(root, 'click', '[data-action="reset-demo"]', async () => {
    const confirmed = await confirmDialog({
      title: 'RESET DEMO DATA?',
      message: 'All current tasks, events, XP and achievements will be replaced by the demo data. Your settings stay.',
      confirmLabel: 'Reset',
    });
    if (!confirmed) return;
    resetToDemoData();
    showToast({ type: 'success', message: 'Demo data restored.' });
  });

  delegate(root, 'click', '[data-action="clear-data"]', async () => {
    const confirmed = await confirmDialog({
      title: 'DELETE EVERYTHING?',
      message: 'All tasks, events, XP, level and achievements will be erased. This cannot be undone (export first if unsure).',
      confirmLabel: 'Delete all',
    });
    if (!confirmed) return;
    clearAllData();
    showToast({ type: 'success', message: 'All data cleared.' });
  });

  // Rentang waktu grafik di halaman Stats
  delegate(root, 'change', 'select[data-stats-range]', (_event, element) => setStatsRange(element.value));
}
