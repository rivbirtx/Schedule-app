/**
 * sidebar.js
 * Navigasi utama (desktop & tablet) dan bottom navigation (mobile).
 * Navigasi memakai <a href="#/halaman">, jadi bisa dipakai keyboard, di-bookmark, dan tombol Back berfungsi.
 * Hash dibaca oleh features/navigation/router.js.
 */
import { html, assetUrl } from '../utils/dom-utils.js';
import { PAGES } from '../data/constants.js';
import { icon } from './icons.js';

const HEART_SLOTS = 4;

function navLink(page, activePage, variant) {
  const active = page.id === activePage;
  return html`
    <a class="${variant}__link ${active ? 'is-active' : ''}" href="#/${page.id}" aria-current="${active ? 'page' : 'false'}">
      ${icon(page.icon, { size: variant === 'bottom-nav' ? 20 : 18 })}
      <span class="${variant}__label">${page.label}</span>
    </a>
  `;
}

/** Hati di sidebar = streak (maksimal 4 hati penuh). */
function hearts(streak) {
  const full = Math.min(streak, HEART_SLOTS);
  const slots = Array.from({ length: HEART_SLOTS }, (_, index) => index < full);
  return html`
    <div class="sidebar__hearts" role="img" aria-label="Streak hearts: ${full} of ${HEART_SLOTS}">
      ${slots.map(
        (isFull) => html`<img class="pixelated" src="${assetUrl(isFull ? 'assets/images/heart.svg' : 'assets/images/heart-empty.svg')}" alt="" width="18" height="16" />`,
      )}
    </div>
  `;
}

export function renderSidebar({ ui, progress }) {
  return html`
    <div class="sidebar__brand">
      <span class="sidebar__title font-pixel">PIXEL<br />SCHEDULE</span>
      <img class="pixelated sidebar__logo" src="${assetUrl('assets/images/gamepad.svg')}" alt="" width="56" height="35" />
    </div>
    <nav class="sidebar__nav" aria-label="Main navigation">
      ${PAGES.map((page) => navLink(page, ui.page, 'sidebar'))}
    </nav>
    <div class="sidebar__scene">
      <img class="pixelated" src="${assetUrl('assets/images/scene.svg')}" alt="Pixel Cadet standing in a meadow" width="144" height="108" />
    </div>
    <div class="sidebar__cheer font-pixel">KEEP GOING!<br />YOU CAN DO IT!</div>
    ${hearts(progress.streak)}
  `;
}

export function renderBottomNav({ ui }) {
  return html`${PAGES.map((page) => navLink(page, ui.page, 'bottom-nav'))}`;
}
