/**
 * empty-state.js
 * Tampilan "belum ada data" yang ramah, dengan aksi opsional.
 */
import { html, raw } from '../utils/dom-utils.js';
import { icon } from './icons.js';

/**
 * @param {{title: string, message?: string, icon?: string, actionLabel?: string, actionAttrs?: string}} props
 *   actionAttrs = atribut HTML tepercaya untuk tombol aksi, mis. 'data-action="add-task"'
 */
export function emptyState({ title, message = '', icon: iconName = 'star', actionLabel = '', actionAttrs = '' }) {
  return html`
    <div class="empty-state">
      <span class="empty-state__icon">${icon(iconName, { size: 28 })}</span>
      <p class="empty-state__title font-pixel">${title}</p>
      ${message ? html`<p class="empty-state__message">${message}</p>` : ''}
      ${actionLabel
        ? html`<button type="button" class="px-btn px-btn--primary px-btn--sm" ${raw(actionAttrs)}>${icon('plus', { size: 12 })} ${actionLabel}</button>`
        : ''}
    </div>
  `;
}
