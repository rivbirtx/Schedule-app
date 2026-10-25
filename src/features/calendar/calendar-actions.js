/**
 * calendar-actions.js
 * Interaksi kalender dan agenda: ganti view, navigasi tanggal, pilih hari, tambah/edit/hapus event,
 * navigasi keyboard (tombol panah) di grid hari, dan navigasi tanggal panel Today Schedule.
 * Logika perhitungan tanggal ada di calendar-navigation.js (murni & teruji).
 */
import { delegate } from '../../utils/dom-utils.js';
import { addDays, getTodayKey, getWeekDays } from '../../utils/date-utils.js';
import { getUi, setCalendar, setAgendaDate } from '../../state/app-state.js';
import { shiftDate, moveSelection, isSameMonth } from './calendar-navigation.js';
import { openEventModal } from '../../components/event-modal.js';
import { deleteEventFlow } from '../../components/delete-flow.js';

/** Pindahkan tanggal acuan bila tanggal terpilih keluar dari rentang yang sedang tampil. */
function anchorFor(view, currentDate, selected) {
  if (view === 'month') return isSameMonth(currentDate, selected) ? currentDate : selected;
  if (view === 'week') return getWeekDays(currentDate).includes(selected) ? currentDate : selected;
  return selected;
}

export function bindCalendarActions(root) {
  delegate(root, 'click', '[data-action="cal-view"]', (_event, element) => {
    setCalendar({ view: element.dataset.view });
  });

  const step = (direction) => {
    const { view, date } = getUi().calendar;
    const next = shiftDate(view, date, direction);
    setCalendar({ date: next, selected: next });
  };
  delegate(root, 'click', '[data-action="cal-prev"]', () => step(-1));
  delegate(root, 'click', '[data-action="cal-next"]', () => step(1));
  delegate(root, 'click', '[data-action="cal-today"]', () => {
    const today = getTodayKey();
    setCalendar({ date: today, selected: today });
  });

  delegate(root, 'click', '[data-action="cal-select-day"]', (_event, element) => {
    const { view, date } = getUi().calendar;
    const selected = element.dataset.date;
    setCalendar({ selected, date: anchorFor(view, date, selected) });
  });

  // Tombol panah di grid hari (month) / kepala hari (week)
  root.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action="cal-select-day"]') : null;
    if (!target) return;
    const next = moveSelection(target.dataset.date, event.key);
    if (!next) return;
    event.preventDefault();
    const { view, date } = getUi().calendar;
    setCalendar({ selected: next, date: anchorFor(view, date, next) });
    document.querySelector(`[data-focus-id="day-${next}"]`)?.focus(); // render sudah selesai (sinkron)
  });

  delegate(root, 'click', '[data-action="add-event"]', (_event, element) => {
    openEventModal({ date: element.dataset.date || getUi().calendar.selected });
  });
  delegate(root, 'click', '[data-action="edit-event"]', (_event, element) => {
    openEventModal({ eventId: element.dataset.id });
  });
  delegate(root, 'click', '[data-action="delete-event"]', (_event, element) => {
    deleteEventFlow(element.dataset.id);
  });

  // ---- Panel Today Schedule (dashboard) ---------------------------------------
  delegate(root, 'click', '[data-action="agenda-prev"]', () => setAgendaDate(addDays(getUi().agendaDate, -1)));
  delegate(root, 'click', '[data-action="agenda-next"]', () => setAgendaDate(addDays(getUi().agendaDate, 1)));
  delegate(root, 'click', '[data-action="agenda-today"]', () => setAgendaDate(getTodayKey()));
  delegate(root, 'click', '[data-action="agenda-select"]', (_event, element) => setAgendaDate(element.dataset.date));
}
