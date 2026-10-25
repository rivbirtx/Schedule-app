/**
 * toast.js
 * Notifikasi singkat di pojok layar (XP, level up, achievement, sukses, error).
 * Wadahnya (#toast-root) berada di luar #app dan memiliki aria-live="polite",
 * jadi pembaca layar membacakan pesan baru tanpa mengganggu.
 */
import { html } from '../utils/dom-utils.js';
import { icon } from './icons.js';

// type -> ikon + warna + lama tampil (ms)
const TOAST_TYPES = {
  xp: { icon: 'star', tone: 'yellow', duration: 2800 },
  levelup: { icon: 'trophy', tone: 'pink', duration: 4500 },
  achievement: { icon: 'trophy', tone: 'purple', duration: 5000 },
  success: { icon: 'check', tone: 'green', duration: 2600 },
  info: { icon: 'clock', tone: 'cyan', duration: 3500 },
  error: { icon: 'alert', tone: 'red', duration: 6500 },
};
const MAX_VISIBLE = 4;

/**
 * @param {{type?: string, message: string, detail?: string}} notice
 */
export function showToast({ type = 'info', message, detail = '' }) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const config = TOAST_TYPES[type] ?? TOAST_TYPES.info;

  const toast = document.createElement('div');
  toast.className = `toast tone-${config.tone}`;
  toast.innerHTML = html`
    <span class="toast__icon">${icon(config.icon, { size: 16 })}</span>
    <div class="toast__text">
      <strong class="toast__message">${message}</strong>
      ${detail ? html`<span class="toast__detail">${detail}</span>` : ''}
    </div>
    <button type="button" class="toast__close" aria-label="Dismiss notification">${icon('x', { size: 10 })}</button>
  `.toString();

  const dismiss = () => toast.remove();
  toast.querySelector('.toast__close').addEventListener('click', dismiss);
  setTimeout(dismiss, config.duration);

  root.append(toast);
  while (root.children.length > MAX_VISIBLE) root.firstElementChild.remove();
}
