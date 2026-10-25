/**
 * calendar-page.js
 * Halaman Calendar: view Month/Week/Day + panel detail hari terpilih.
 * Seluruh tampilan ada di components/calendar-view.js.
 */
import { html } from '../utils/dom-utils.js';
import { calendarView } from '../components/calendar-view.js';

export function renderCalendarPage({ state, ui, ctx }) {
  return html`<div class="calendar-page">${calendarView({ state, ui, ctx })}</div>`;
}
