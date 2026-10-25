/**
 * modal.js
 * Mesin dialog yang dipakai semua modal (task, event, konfirmasi).
 *
 * Yang ditangani di sini, supaya modal lain tidak perlu mengulang:
 *   - backdrop + role="dialog" aria-modal
 *   - fokus berpindah ke dalam dialog, Tab/Shift+Tab "terkurung" di dalamnya
 *   - Esc dan klik backdrop menutup; elemen [data-modal-close] menutup
 *   - fokus dikembalikan ke elemen yang membuka dialog
 *   - halaman di belakang tidak ikut ter-scroll
 *   - boleh bertumpuk (mis. dialog konfirmasi di atas modal tugas); hanya yang paling atas aktif
 */
import { getFocusableElements } from '../utils/dom-utils.js';

const stack = [];
let keydownBound = false;

function modalRoot() {
  return document.getElementById('modal-root');
}

function onKeydown(event) {
  const top = stack[stack.length - 1];
  if (!top) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    top.close();
    return;
  }
  if (event.key !== 'Tab') return;

  // Fokus terkurung: dari elemen terakhir lompat ke pertama, dan sebaliknya.
  const focusable = getFocusableElements(top.dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !top.dialog.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !top.dialog.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Buka dialog.
 * @param {{content: import('../utils/dom-utils.js').SafeHtml, labelledBy: string, size?: 'sm'|'md', onClose?: Function, initialFocus?: string}} options
 *   content      : isi dialog (header + body + footer). Harus berisi elemen dengan id = labelledBy.
 *   initialFocus : selector elemen yang pertama difokuskan (bawaan: elemen fokus pertama)
 * @returns {{element: HTMLElement, dialog: HTMLElement, close: Function}}
 */
export function openModal({ content, labelledBy, size = 'md', onClose = () => {}, initialFocus = '' }) {
  if (!keydownBound) {
    document.addEventListener('keydown', onKeydown);
    keydownBound = true;
  }

  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const openerFocusId = opener?.getAttribute('data-focus-id') ?? null;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal modal--${size}" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}">${content.toString()}</div>`;
  const dialog = backdrop.firstElementChild;

  let closed = false;
  const handle = {
    element: backdrop,
    dialog,
    close(result) {
      if (closed) return;
      closed = true;
      const index = stack.indexOf(handle);
      if (index >= 0) stack.splice(index, 1);
      backdrop.remove();
      if (stack.length === 0) document.body.classList.remove('modal-open');
      onClose(result);

      // Kembalikan fokus. Elemen pembuka bisa sudah dirender ulang -> cari lewat data-focus-id.
      const target = opener && document.contains(opener)
        ? opener
        : openerFocusId ? document.querySelector(`[data-focus-id="${openerFocusId}"]`) : null;
      (target ?? stack[stack.length - 1]?.dialog ?? document.getElementById('page'))?.focus?.();
    },
  };

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) handle.close();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-modal-close]')) handle.close();
  });

  stack.push(handle);
  modalRoot().append(backdrop);
  document.body.classList.add('modal-open');

  const initial = initialFocus ? dialog.querySelector(initialFocus) : null;
  (initial ?? getFocusableElements(dialog)[0] ?? dialog).focus();
  return handle;
}

export const hasOpenModal = () => stack.length > 0;
