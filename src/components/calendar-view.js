/**
 * calendar-view.js
 * Kalender Month / Week / Day + panel "Events on <tanggal>".
 *
 * Sumber data: event-service.indexByDate(state) -> Map(tanggal -> { events, deadlines }).
 * Event dan deadline tugas ditampilkan BERBEDA:
 *   - event    : batang berwarna (di bulan) / tombol berjam (di minggu & hari)
 *   - deadline : kotak kecil (merah = belum selesai, kuning = prioritas tinggi, hijau = selesai)
 *
 * Komponen ini hanya merender. Semua klik ditangani features/calendar/calendar-actions.js
 * lewat atribut data-action.
 */
import { html } from '../utils/dom-utils.js';
import {
  getMonthGrid, getWeekDays, WEEKDAY_SHORT, getDayNumber, getWeekdayShort, formatLongDate, parseDateKey,
  MONTH_NAMES,
} from '../utils/date-utils.js';
import { CALENDAR_VIEWS, getStatus } from '../data/constants.js';
import { indexByDate } from '../services/event-service.js';
import { getRangeLabel } from '../features/calendar/calendar-navigation.js';
import { icon } from './icons.js';

const EMPTY_DAY = Object.freeze({ events: [], deadlines: [] });
const MAX_BARS_IN_CELL = 2;
const MAX_DOTS_IN_CELL = 4;

/** Penanda deadline: done = hijau, prioritas tinggi = kuning, lainnya = merah. */
function deadlineKind(task) {
  if (task.status === 'done') return 'done';
  return task.priority === 'high' ? 'high' : 'pending';
}

function describeDay(dateKey, day) {
  const date = parseDateKey(dateKey);
  const parts = [`${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`];
  if (day.events.length) parts.push(`${day.events.length} ${day.events.length === 1 ? 'event' : 'events'}`);
  if (day.deadlines.length) parts.push(`${day.deadlines.length} ${day.deadlines.length === 1 ? 'task due' : 'tasks due'}`);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function toolbar(ui) {
  const { view, date } = ui.calendar;
  return html`
    <div class="cal-toolbar">
      <div class="px-segmented" role="group" aria-label="Calendar view">
        ${CALENDAR_VIEWS.map(
          (item) => html`<button type="button" class="px-segmented__btn" data-action="cal-view" data-view="${item.id}" aria-pressed="${String(item.id === view)}">${item.label}</button>`,
        )}
      </div>
      <button type="button" class="px-btn px-btn--primary px-btn--sm cal-toolbar__add" data-action="add-event" data-date="${ui.calendar.selected}" data-focus-id="add-event-main">
        ${icon('plus', { size: 12 })} Add Event
      </button>
      <div class="cal-toolbar__nav">
        <button type="button" class="icon-btn icon-btn--framed" data-action="cal-prev" aria-label="Previous ${view}">${icon('chevron-left', { size: 12 })}</button>
        <h2 class="cal-toolbar__label font-pixel" aria-live="polite">${getRangeLabel(view, date)}</h2>
        <button type="button" class="icon-btn icon-btn--framed" data-action="cal-next" aria-label="Next ${view}">${icon('chevron-right', { size: 12 })}</button>
        <button type="button" class="px-btn px-btn--ghost px-btn--sm" data-action="cal-today">Today</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Month
// ---------------------------------------------------------------------------

function monthCell({ dateKey, inMonth }, day, { todayKey, selected }) {
  const bars = day.events.slice(0, MAX_BARS_IN_CELL);
  const hiddenEvents = day.events.length - bars.length;
  const dots = day.deadlines.slice(0, MAX_DOTS_IN_CELL);
  const classes = [
    'cal-cell',
    inMonth ? '' : 'is-outside',
    dateKey === todayKey ? 'is-today' : '',
    dateKey === selected ? 'is-selected' : '',
  ].join(' ');

  return html`
    <button type="button" class="${classes}" data-action="cal-select-day" data-date="${dateKey}" data-focus-id="day-${dateKey}"
      aria-pressed="${String(dateKey === selected)}" aria-label="${describeDay(dateKey, day)}">
      <span class="cal-cell__num">${getDayNumber(dateKey)}</span>
      <span class="cal-cell__marks" aria-hidden="true">
        ${bars.map((event) => html`<span class="cal-bar tone-${event.color}"><span class="cal-bar__text">${event.title}</span></span>`)}
        ${hiddenEvents > 0 ? html`<span class="cal-more">+${hiddenEvents}</span>` : ''}
        ${dots.length
          ? html`<span class="cal-dots">${dots.map((task) => html`<span class="cal-dot cal-dot--${deadlineKind(task)}"></span>`)}</span>`
          : ''}
      </span>
    </button>
  `;
}

function monthView(index, ui, ctx) {
  const grid = getMonthGrid(ui.calendar.date);
  return html`
    <div class="cal-grid" data-cal-grid>
      ${WEEKDAY_SHORT.map((name) => html`<div class="cal-weekday font-pixel">${name}</div>`)}
      ${grid.map((cell) =>
        monthCell(cell, index.get(cell.dateKey) ?? EMPTY_DAY, { todayKey: ctx.todayKey, selected: ui.calendar.selected }),
      )}
    </div>
    ${legend()}
  `;
}

function legend() {
  return html`
    <ul class="cal-legend" aria-label="Legend">
      <li><span class="cal-dot cal-dot--pending"></span> Task Deadline</li>
      <li><span class="cal-bar-sample tone-blue"></span> Event</li>
      <li><span class="cal-dot cal-dot--high"></span> High Priority</li>
      <li><span class="cal-dot cal-dot--done"></span> Completed</li>
    </ul>
  `;
}

// ---------------------------------------------------------------------------
// Item yang bisa diklik (dipakai Week, Day, dan panel detail)
// ---------------------------------------------------------------------------

function eventButton(event) {
  return html`
    <button type="button" class="cal-item tone-${event.color}" data-action="edit-event" data-id="${event.id}">
      <span class="cal-item__time">${event.startTime}-${event.endTime}</span>
      <span class="cal-item__title">${event.title}</span>
    </button>
  `;
}

function deadlineButton(task) {
  const kind = deadlineKind(task);
  return html`
    <button type="button" class="cal-item cal-item--deadline cal-item--${kind}" data-action="edit-task" data-id="${task.id}">
      <span class="cal-dot cal-dot--${kind}" aria-hidden="true"></span>
      <span class="cal-item__title">${task.title}</span>
      <span class="cal-item__time">${getStatus(task.status).label}</span>
    </button>
  `;
}

// ---------------------------------------------------------------------------
// Week
// ---------------------------------------------------------------------------

function weekView(index, ui, ctx) {
  return html`
    <div class="week-grid">
      ${getWeekDays(ui.calendar.date).map((dateKey) => {
        const day = index.get(dateKey) ?? EMPTY_DAY;
        const classes = ['week-day', dateKey === ctx.todayKey ? 'is-today' : '', dateKey === ui.calendar.selected ? 'is-selected' : ''].join(' ');
        const empty = day.events.length + day.deadlines.length === 0;
        return html`
          <section class="${classes}" aria-label="${describeDay(dateKey, day)}">
            <button type="button" class="week-day__head" data-action="cal-select-day" data-date="${dateKey}" data-focus-id="day-${dateKey}" aria-pressed="${String(dateKey === ui.calendar.selected)}">
              <span class="week-day__name font-pixel">${getWeekdayShort(dateKey)}</span>
              <span class="week-day__num">${getDayNumber(dateKey)}</span>
            </button>
            <ul class="week-day__list">
              ${day.events.map((event) => html`<li>${eventButton(event)}</li>`)}
              ${day.deadlines.map((task) => html`<li>${deadlineButton(task)}</li>`)}
              ${empty ? html`<li class="week-day__empty">-</li>` : ''}
            </ul>
          </section>
        `;
      })}
    </div>
    ${legend()}
  `;
}

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

function dayView(index, ui) {
  const day = index.get(ui.calendar.date) ?? EMPTY_DAY;
  const empty = day.events.length + day.deadlines.length === 0;
  return html`
    <div class="day-view">
      ${empty ? html`<p class="day-view__empty">Nothing scheduled on this day.</p>` : ''}
      ${day.deadlines.length
        ? html`
            <h3 class="day-view__heading font-pixel">DEADLINES</h3>
            <ul class="day-view__list">${day.deadlines.map((task) => html`<li>${deadlineButton(task)}</li>`)}</ul>
          `
        : ''}
      ${day.events.length
        ? html`
            <h3 class="day-view__heading font-pixel">SCHEDULE</h3>
            <ul class="day-view__list">${day.events.map((event) => html`<li>${eventButton(event)}</li>`)}</ul>
          `
        : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Panel detail hari terpilih ("Events on Oct 22, 2026")
// ---------------------------------------------------------------------------

function detailPanel(index, ui) {
  const selected = ui.calendar.selected;
  const day = index.get(selected) ?? EMPTY_DAY;
  const empty = day.events.length + day.deadlines.length === 0;
  return html`
    <section class="px-panel cal-detail" aria-labelledby="cal-detail-title">
      <header class="px-panel__head">
        <h2 class="px-panel__title font-pixel" id="cal-detail-title">${icon('calendar', { size: 16, className: 'text-cyan' })} Events on ${formatLongDate(selected)}</h2>
        <button type="button" class="px-btn px-btn--primary px-btn--sm" data-action="add-event" data-date="${selected}">
          ${icon('plus', { size: 12 })} Add Event
        </button>
      </header>
      ${empty ? html`<p class="cal-detail__empty">No events or deadlines. Press "Add Event" to plan this day.</p>` : ''}
      <ul class="cal-detail__list">
        ${day.events.map(
          (event) => html`
            <li class="cal-detail__row">
              <span class="agenda__dot tone-${event.color}" aria-hidden="true"></span>
              <span class="cal-detail__time">${event.startTime} - ${event.endTime}</span>
              <span class="cal-detail__title">${event.title}</span>
              <button type="button" class="icon-btn icon-btn--framed" data-action="edit-event" data-id="${event.id}" aria-label="Edit event ${event.title}">${icon('edit', { size: 12 })}</button>
              <button type="button" class="icon-btn icon-btn--framed icon-btn--danger" data-action="delete-event" data-id="${event.id}" aria-label="Delete event ${event.title}">${icon('trash', { size: 12 })}</button>
            </li>
          `,
        )}
        ${day.deadlines.map(
          (task) => html`
            <li class="cal-detail__row">
              <span class="cal-dot cal-dot--${deadlineKind(task)}" aria-hidden="true"></span>
              <span class="cal-detail__time">Deadline</span>
              <span class="cal-detail__title ${task.status === 'done' ? 'is-done' : ''}">${task.title}</span>
              <button type="button" class="icon-btn icon-btn--framed" data-action="edit-task" data-id="${task.id}" aria-label="Edit task ${task.title}">${icon('edit', { size: 12 })}</button>
            </li>
          `,
        )}
      </ul>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Rakitan akhir
// ---------------------------------------------------------------------------

/**
 * @param {{state: Object, ui: Object, ctx: Object}} props
 */
export function calendarView({ state, ui, ctx }) {
  const index = indexByDate(state);
  const { view } = ui.calendar;
  const body = view === 'month' ? monthView(index, ui, ctx) : view === 'week' ? weekView(index, ui, ctx) : dayView(index, ui);
  return html`
    <section class="px-panel calendar" aria-label="Calendar">
      ${toolbar(ui)}
      ${body}
    </section>
    ${view === 'day' ? '' : detailPanel(index, ui)}
  `;
}
