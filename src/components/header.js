/**
 * header.js
 * Header halaman: judul, level + bar XP, streak, tanggal hari ini, dan avatar.
 * Semua angka datang dari `progress` (gamification-service.getProgress) -> selalu sinkron dengan state.
 */
import { html, assetUrl } from '../utils/dom-utils.js';
import { formatLongDate } from '../utils/date-utils.js';
import { icon } from './icons.js';

export function renderHeader({ title, progress, todayKey }) {
  return html`
    <h1 class="page-header__title font-pixel" id="page-title">${title}</h1>
    <div class="page-header__chips">
      <div class="chip chip--level" title="Level ${progress.level}">
        ${icon('star', { size: 14, className: 'text-yellow' })}
        <span class="font-pixel chip__text">LV ${progress.level}</span>
      </div>
      <div class="chip chip--xp" title="${progress.xpIntoLevel} of ${progress.xpPerLevel} XP to next level">
        <div class="xp-bar" role="progressbar" aria-label="XP progress" aria-valuemin="0" aria-valuemax="${progress.xpPerLevel}" aria-valuenow="${progress.xpIntoLevel}">
          <div class="xp-bar__fill" style="width: ${progress.progressPct}%"></div>
        </div>
        <span class="font-pixel chip__text chip__text--sm">${progress.xpIntoLevel} / ${progress.xpPerLevel} XP</span>
      </div>
      <div class="chip chip--streak" title="Daily streak">
        ${icon('flame', { size: 14, className: 'text-orange' })}
        <span class="font-pixel chip__text">${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}</span>
      </div>
      <div class="chip chip--date">
        <time datetime="${todayKey}" class="chip__text">${formatLongDate(todayKey)}</time>
      </div>
      <span class="avatar" aria-hidden="true">
        <img class="pixelated" src="${assetUrl('assets/images/hero.svg')}" alt="" width="40" height="40" />
      </span>
    </div>
  `;
}
