/**
 * agenda-panel.js
 * Panel "Today Schedule": agenda satu hari (event + deadline tugas) dengan navigasi tanggal.
 * Data diambil dari event-service.getAgendaForDate, fungsi yang SAMA dipakai kalender,
 * sehingga agenda dan kalender selalu konsisten.
 */
import { html, assetUrl } from '../utils/dom-utils.js';
import { formatLongDate } from '../utils/date-utils.js';
import { getAgendaForDate, isEventHappeningNow } from '../services/event-service.js';
import { getStatus, getPriority } from '../data/constants.js';
import { icon } from './icons.js';
import { emptyState } from './empty-state.js';

function eventRow(event, ctx) {
  const now = isEventHappeningNow(event, ctx);
  return html`
    <li class="agenda__item">
      <span class="agenda__dot tone-${event.color}" aria-hidden="true"></span>
      <button type="button" class="agenda__event" data-action="edit-event" data-id="${event.id}" aria-label="Edit event ${event.title}, ${event.startTime} to ${event.endTime}">
        <span class="agenda__time">${event.startTime} - ${event.endTime}</span>
        <span class="agenda__title">${event.title}</span>
      </button>
      ${now ? html`<span class="px-badge px-badge--pixel tone-red anim-blink">NOW</span>` : ''}
    </li>
  `;
}

function deadlineRow(task) {
  const status = getStatus(task.status);
  const priority = getPriority(task.priority);
  return html`
    <li class="agenda__item">
      <span class="agenda__dot agenda__dot--square tone-${task.status === 'done' ? 'green' : priority.color}" aria-hidden="true"></span>
      <button type="button" class="agenda__event" data-action="edit-task" data-id="${task.id}" aria-label="Edit task ${task.title}, due this day, status ${status.label}">
        <span class="agenda__time">Due · ${status.label}</span>
        <span class="agenda__title ${task.status === 'done' ? 'is-done' : ''}">${task.title}</span>
      </button>
    </li>
  `;
}

function missionBubble(progress, isToday) {
  if (!isToday) return '';
  const text = progress.missionRemaining > 0
    ? `Today's mission: Selesaikan ${progress.missionRemaining} tugas!`
    : `Mission complete! Kerja bagus!`;
  return html`<p class="agenda__bubble" role="status">${text}</p>`;
}

/**
 * @param {{state: Object, ui: Object, ctx: Object, progress: Object}} props
 */
export function agendaPanel({ state, ui, ctx, progress }) {
  const date = ui.agendaDate;
  const isToday = date === ctx.todayKey;
  const agenda = getAgendaForDate(state, date);
  const hasItems = agenda.events.length + agenda.deadlines.length > 0;

  return html`
    <section class="px-panel agenda" aria-labelledby="agenda-title">
      <header class="px-panel__head">
        <h2 class="px-panel__title font-pixel" id="agenda-title">${icon('clock', { size: 16, className: 'text-pink' })} TODAY SCHEDULE</h2>
        <button type="button" class="icon-btn icon-btn--framed" data-action="add-event" data-date="${date}" aria-label="Add event on ${formatLongDate(date)}">
          ${icon('plus', { size: 14 })}
        </button>
      </header>

      <div class="agenda__nav">
        <button type="button" class="icon-btn icon-btn--framed" data-action="agenda-prev" aria-label="Previous day">${icon('chevron-left', { size: 12 })}</button>
        <div class="agenda__date">
          <time datetime="${date}">${formatLongDate(date)}</time>
          ${isToday ? '' : html`<button type="button" class="agenda__today-link" data-action="agenda-today">Back to today</button>`}
        </div>
        <button type="button" class="icon-btn icon-btn--framed" data-action="agenda-next" aria-label="Next day">${icon('chevron-right', { size: 12 })}</button>
      </div>

      ${hasItems
        ? html`
            <ol class="agenda__list" data-scroll-key="agenda">
              ${agenda.events.map((event) => eventRow(event, ctx))}
              ${agenda.deadlines.map(deadlineRow)}
            </ol>
          `
        : emptyState({
            title: 'FREE DAY',
            message: 'No events or deadlines on this date.',
            icon: 'calendar',
            actionLabel: 'Add Event',
            actionAttrs: `data-action="add-event" data-date="${date}"`,
          })}

      <div class="agenda__scene">
        <img class="pixelated agenda__tree" src="${assetUrl('assets/images/tree.svg')}" alt="" width="42" height="54" />
        <img class="pixelated agenda__hero anim-bob" src="${assetUrl('assets/images/hero.svg')}" alt="Pixel Cadet" width="64" height="64" />
        ${missionBubble(progress, isToday)}
      </div>
    </section>
  `;
}
