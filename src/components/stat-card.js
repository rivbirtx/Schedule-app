/**
 * stat-card.js
 * Kartu statistik kecil (ikon + angka + label), dipakai di Dashboard.
 */
import { html } from '../utils/dom-utils.js';
import { icon } from './icons.js';

/**
 * @param {{label: string, value: number|string, icon: string, tone: string, hint?: string}} props
 *   tone = nama warna token: blue | green | yellow | red | purple | pink | cyan
 */
export function statCard({ label, value, icon: iconName, tone, hint = '' }) {
  return html`
    <article class="stat-card tone-${tone}" title="${hint}">
      <span class="stat-card__icon">${icon(iconName, { size: 22 })}</span>
      <div class="stat-card__body">
        <span class="stat-card__label">${label}</span>
        <span class="stat-card__value font-pixel">${value}</span>
      </div>
    </article>
  `;
}
