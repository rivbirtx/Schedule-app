/**
 * stats-page.js
 * Halaman Stats. SEMUA angka dihitung dari data aplikasi:
 *   - kartu ringkasan : task-service.computeTaskStats + gamification-service.getProgress
 *   - donut distribusi: computeTaskStats().byStatus
 *   - grafik batang   : task-service.getActivitySeries (dibuat vs selesai per hari)
 *   - achievement     : features/gamification/achievements.js + state.gamification.achievements
 * Grafik dibuat dengan HTML/CSS + SVG sederhana (tanpa library chart).
 */
import { html } from '../utils/dom-utils.js';
import { STATUSES, STATS_RANGES } from '../data/constants.js';
import { computeTaskStats, getActivitySeries } from '../services/task-service.js';
import { ACHIEVEMENTS } from '../features/gamification/achievements.js';
import { getWeekdayShort, getDayNumber, formatShortDate, isoToDateKey } from '../utils/date-utils.js';
import { icon } from '../components/icons.js';

function summaryTiles(stats, progress) {
  return html`
    <div class="stats-tiles">
      <article class="stat-tile tone-green">
        <h3 class="stat-tile__label font-pixel">Task Completion</h3>
        <p class="stat-tile__value font-pixel">${stats.completionRate}%</p>
        <div class="segbar" role="progressbar" aria-label="Task completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.completionRate}">
          <div class="segbar__fill" style="width: ${stats.completionRate}%"></div>
        </div>
        <p class="stat-tile__hint">${stats.completed} / ${stats.total} tasks done</p>
      </article>
      <article class="stat-tile tone-yellow">
        <h3 class="stat-tile__label font-pixel">Current Streak</h3>
        <p class="stat-tile__value font-pixel">${icon('flame', { size: 22, className: 'text-orange' })} ${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}</p>
        <p class="stat-tile__hint">Complete a task every day to keep it alive.</p>
      </article>
      <article class="stat-tile tone-yellow">
        <h3 class="stat-tile__label font-pixel">Total XP</h3>
        <p class="stat-tile__value font-pixel">${icon('star', { size: 22, className: 'text-yellow' })} ${progress.totalXp}</p>
        <p class="stat-tile__hint">Low 10 · Medium 20 · High 30 XP per task.</p>
      </article>
      <article class="stat-tile tone-cyan">
        <h3 class="stat-tile__label font-pixel">Current Level</h3>
        <p class="stat-tile__value font-pixel">${icon('trophy', { size: 22, className: 'text-cyan' })} ${progress.level}</p>
        <div class="segbar segbar--cyan" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="${progress.xpPerLevel}" aria-valuenow="${progress.xpIntoLevel}">
          <div class="segbar__fill" style="width: ${progress.progressPct}%"></div>
        </div>
        <p class="stat-tile__hint">${progress.xpIntoLevel} / ${progress.xpPerLevel} XP to level ${progress.level + 1}</p>
      </article>
    </div>
  `;
}

/** Donut SVG: lingkaran r=15.915 berkeliling tepat 100, sehingga panjang busur = persen. */
function statusDonut(stats) {
  let offset = 25; // mulai dari jam 12
  const segments = STATUSES.map((status) => {
    const count = stats.byStatus[status.id];
    const pct = stats.total ? (count / stats.total) * 100 : 0;
    const segment = { status, count, pct, dashoffset: offset };
    offset -= pct;
    return segment;
  });
  return html`
    <section class="px-panel stats-card" aria-labelledby="donut-title">
      <h3 class="px-panel__title font-pixel" id="donut-title">Task Status Distribution</h3>
      <div class="donut-wrap">
        <div class="donut" role="img" aria-label="${stats.total} tasks: ${segments.map((s) => `${s.count} ${s.status.label}`).join(', ')}">
          <svg viewBox="0 0 42 42" class="donut__svg" shape-rendering="crispEdges" aria-hidden="true">
            <circle class="donut__track" cx="21" cy="21" r="15.915" fill="none" stroke-width="6" />
            ${segments.filter((s) => s.pct > 0).map(
              (s) => html`<circle class="donut__seg tone-${s.status.color}" cx="21" cy="21" r="15.915" fill="none" stroke-width="6" stroke-dasharray="${s.pct} ${100 - s.pct}" stroke-dashoffset="${s.dashoffset}" />`,
            )}
          </svg>
          <div class="donut__center"><span class="font-pixel donut__total">${stats.total}</span><span class="donut__sub">Tasks</span></div>
        </div>
        <ul class="legend">
          ${segments.map(
            (s) => html`<li><span class="legend__swatch tone-${s.status.color}"></span><span class="legend__name">${s.status.label}</span><span class="legend__value">${s.count} <span class="legend__pct">(${Math.round(s.pct)}%)</span></span></li>`,
          )}
        </ul>
      </div>
    </section>
  `;
}

function progressChart(series, range) {
  const max = Math.max(1, ...series.flatMap((entry) => [entry.created, entry.completed]));
  const dense = series.length > 10;
  return html`
    <section class="px-panel stats-card" aria-labelledby="chart-title">
      <h3 class="px-panel__title font-pixel" id="chart-title">Progress Chart</h3>
      <ul class="legend legend--inline">
        <li><span class="legend__swatch tone-blue"></span> Created</li>
        <li><span class="legend__swatch tone-green"></span> Completed</li>
      </ul>
      <div class="bars ${dense ? 'bars--dense' : ''}" role="img" aria-label="Tasks created and completed per day, ${range.label.toLowerCase()}. ${series.map((e) => `${formatShortDate(e.dateKey)}: ${e.created} created, ${e.completed} completed`).join('; ')}">
        <div class="bars__scale" aria-hidden="true"><span>${max}</span><span>${Math.round(max / 2)}</span><span>0</span></div>
        <div class="bars__plot">
          ${series.map(
            (entry) => html`
              <div class="bars__col" title="${formatShortDate(entry.dateKey)}: ${entry.created} created, ${entry.completed} completed">
                <div class="bars__pair">
                  <span class="bar tone-blue" style="height: ${(entry.created / max) * 100}%"></span>
                  <span class="bar tone-green" style="height: ${(entry.completed / max) * 100}%"></span>
                </div>
                <span class="bars__label">${dense ? (getDayNumber(entry.dateKey) % 5 === 0 || entry === series[0] ? getDayNumber(entry.dateKey) : '') : getWeekdayShort(entry.dateKey)}</span>
              </div>`,
          )}
        </div>
      </div>
    </section>
  `;
}

function achievementsPanel(state) {
  const unlocked = state.gamification.achievements;
  const count = ACHIEVEMENTS.filter((achievement) => unlocked[achievement.id]).length;
  return html`
    <section class="px-panel stats-card stats-card--wide" aria-labelledby="ach-title">
      <h3 class="px-panel__title font-pixel" id="ach-title">${icon('trophy', { size: 16, className: 'text-yellow' })} Achievements <span class="stats-card__count">${count}/${ACHIEVEMENTS.length}</span></h3>
      <ul class="achievements">
        ${ACHIEVEMENTS.map((achievement) => {
          const when = unlocked[achievement.id];
          return html`
            <li class="achievement ${when ? 'is-unlocked' : 'is-locked'} tone-${achievement.color}">
              <span class="achievement__icon">${icon(when ? achievement.icon : 'lock', { size: 20 })}</span>
              <div class="achievement__text">
                <strong class="achievement__title">${achievement.title}</strong>
                <span class="achievement__desc">${achievement.description}</span>
                <span class="achievement__state">${when ? html`Unlocked ${formatShortDate(isoToDateKey(when))}` : 'Locked'}</span>
              </div>
            </li>`;
        })}
      </ul>
    </section>
  `;
}

export function renderStatsPage({ state, ui, ctx, progress }) {
  const stats = computeTaskStats(state.tasks);
  const range = STATS_RANGES.find((item) => item.id === ui.statsRange) ?? STATS_RANGES[0];
  const series = getActivitySeries(state.tasks, ctx.todayKey, range.days);

  return html`
    <div class="stats-page">
      <div class="stats-page__bar">
        <h2 class="px-panel__title font-pixel">STATISTICS</h2>
        <label class="stats-range">
          <span class="visually-hidden">Time range</span>
          <select class="px-input px-select" data-stats-range data-focus-id="stats-range">
            ${STATS_RANGES.map((item) => html`<option value="${item.id}" ${item.id === range.id ? 'selected' : ''}>${item.label}</option>`)}
          </select>
        </label>
      </div>
      ${summaryTiles(stats, progress)}
      <div class="stats-grid">
        ${statusDonut(stats)}
        ${progressChart(series, range)}
      </div>
      ${achievementsPanel(state)}
    </div>
  `;
}
