/**
 * confirm-dialog.js
 * Dialog konfirmasi berbasis Promise:
 *
 *   if (await confirmDialog({ title: 'Delete task?', message: '...' })) { ...hapus... }
 *
 * Mengembalikan true jika pengguna menekan tombol konfirmasi, false jika batal/Esc/klik luar.
 */
import { html } from '../utils/dom-utils.js';
import { openModal } from './modal.js';
import { icon } from './icons.js';

export function confirmDialog({ title, message, confirmLabel = 'Delete', tone = 'danger' }) {
  return new Promise((resolve) => {
    const modal = openModal({
      size: 'sm',
      labelledBy: 'confirm-title',
      initialFocus: '[data-confirm-cancel]',
      onClose: (result) => resolve(result === true),
      content: html`
        <header class="modal__head">
          <h2 class="modal__title font-pixel" id="confirm-title">${title}</h2>
          <button type="button" class="icon-btn icon-btn--framed" data-modal-close aria-label="Close">${icon('x', { size: 12 })}</button>
        </header>
        <div class="modal__body"><p class="confirm__message">${message}</p></div>
        <footer class="modal__foot">
          <button type="button" class="px-btn px-btn--ghost" data-confirm-cancel data-modal-close>Cancel</button>
          <button type="button" class="px-btn px-btn--${tone}" data-confirm-ok>${confirmLabel}</button>
        </footer>
      `,
    });
    modal.element.querySelector('[data-confirm-ok]').addEventListener('click', () => modal.close(true));
  });
}
