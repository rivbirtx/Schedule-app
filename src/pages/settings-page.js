/**
 * settings-page.js
 * Halaman Settings. Setiap kontrol benar-benar berfungsi (lihat features/settings/settings-actions.js):
 *   - Default page       : halaman yang dibuka saat aplikasi dimulai tanpa hash di URL
 *   - Confirm before delete
 *   - Export / Import JSON, Reset Demo Data, Delete all data
 *   - Info versi & status penyimpanan
 */
import { html } from '../utils/dom-utils.js';
import { PAGES, APP_VERSION, STORAGE_KEY, SCHEMA_VERSION } from '../data/constants.js';
import { isStorageAvailable } from '../state/app-state.js';
import { getBackupText } from '../services/storage-service.js';
import { icon } from '../components/icons.js';

function settingRow({ title, description, control }) {
  return html`
    <div class="setting-row">
      <div class="setting-row__text">
        <p class="setting-row__title">${title}</p>
        <p class="setting-row__desc">${description}</p>
      </div>
      <div class="setting-row__control">${control}</div>
    </div>
  `;
}

export function renderSettingsPage({ state }) {
  const { settings } = state;
  const hasBackup = Boolean(getBackupText());
  const storageOk = isStorageAvailable();

  return html`
    <div class="settings-page">
      <section class="px-panel settings-card" aria-labelledby="set-general">
        <h2 class="px-panel__title font-pixel" id="set-general">${icon('sliders', { size: 16, className: 'text-cyan' })} GENERAL</h2>
        ${settingRow({
          title: 'Default Page',
          description: 'The page shown when the app starts.',
          control: html`
            <select class="px-input px-select" aria-label="Default page" data-setting="defaultPage" data-focus-id="set-default-page">
              ${PAGES.map((page) => html`<option value="${page.id}" ${page.id === settings.defaultPage ? 'selected' : ''}>${page.label}</option>`)}
            </select>`,
        })}
        ${settingRow({
          title: 'Confirm before deleting',
          description: 'Ask for confirmation when deleting a task or an event.',
          control: html`<input type="checkbox" class="px-switch" role="switch" aria-label="Confirm before deleting" data-setting="confirmDelete" data-focus-id="set-confirm-delete" ${settings.confirmDelete ? 'checked' : ''} />`,
        })}
      </section>

      <section class="px-panel settings-card" aria-labelledby="set-data">
        <h2 class="px-panel__title font-pixel" id="set-data">${icon('download', { size: 16, className: 'text-green' })} DATA</h2>
        ${settingRow({
          title: 'Backup Data',
          description: 'Download all tasks, events, XP and settings as a JSON file.',
          control: html`<button type="button" class="px-btn px-btn--blue px-btn--sm" data-action="export-data">${icon('download', { size: 12 })} Export</button>`,
        })}
        ${settingRow({
          title: 'Import Data',
          description: 'Load a JSON file exported from Pixel Schedule. The file is checked before anything is replaced.',
          control: html`
            <button type="button" class="px-btn px-btn--blue px-btn--sm" data-action="import-data">${icon('upload', { size: 12 })} Import</button>
            <input type="file" id="import-file" accept="application/json,.json" class="visually-hidden" tabindex="-1" aria-label="Choose a JSON file to import" />`,
        })}
        ${settingRow({
          title: 'Reset Demo Data',
          description: 'Replace everything with the sample tasks and events.',
          control: html`<button type="button" class="px-btn px-btn--danger px-btn--sm" data-action="reset-demo">${icon('reset', { size: 12 })} Reset</button>`,
        })}
        ${settingRow({
          title: 'Delete All Data',
          description: 'Start from zero: removes all tasks, events, XP, level and achievements.',
          control: html`<button type="button" class="px-btn px-btn--danger px-btn--sm" data-action="clear-data">${icon('trash', { size: 12 })} Delete all</button>`,
        })}
        ${hasBackup
          ? settingRow({
              title: 'Recovered Backup',
              description: 'Saved data was corrupted once. The raw copy was kept so nothing is lost.',
              control: html`<button type="button" class="px-btn px-btn--ghost px-btn--sm" data-action="download-backup">${icon('download', { size: 12 })} Download backup</button>`,
            })
          : ''}
      </section>

      <section class="px-panel settings-card" aria-labelledby="set-about">
        <h2 class="px-panel__title font-pixel" id="set-about">${icon('star', { size: 16, className: 'text-yellow' })} ABOUT</h2>
        <dl class="about">
          <div><dt>Pixel Schedule</dt><dd>v${APP_VERSION}</dd></div>
          <div><dt>Description</dt><dd>A retro arcade productivity app: Kanban, calendar, XP and streaks.</dd></div>
          <div><dt>Storage</dt><dd class="${storageOk ? 'text-green' : 'text-red'}">${storageOk ? `LocalStorage · key "${STORAGE_KEY}" · schema v${SCHEMA_VERSION}` : 'LocalStorage unavailable - data is kept in memory only'}</dd></div>
          <div><dt>Data</dt><dd>${state.tasks.length} tasks · ${state.events.length} events</dd></div>
        </dl>
      </section>
    </div>
  `;
}
