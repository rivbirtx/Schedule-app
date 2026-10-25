/**
 * event-service.js
 * CRUD event kalender + query "apa saja yang terjadi pada tanggal X".
 *
 * Kalender (Month/Week/Day) dan agenda harian di dashboard SAMA-SAMA memanggil fungsi di sini,
 * sehingga keduanya selalu menampilkan data yang sama (WBS 5.6).
 *
 * Ada dua jenis item pada sebuah tanggal:
 *   - event      : punya jam mulai & selesai (state.events)
 *   - deadline   : tugas dengan dueDate pada tanggal itu (state.tasks), tanpa jam
 */

import { validateEventInput } from '../utils/validation.js';
import { generateId } from '../utils/id-generator.js';
import { timeToMinutes } from '../utils/date-utils.js';
import { unlockAchievements, buildRewardNotices } from './gamification-service.js';

const findEvent = (state, eventId) => state.events.find((event) => event.id === eventId);

const byStartTime = (a, b) =>
  timeToMinutes(a.startTime) - timeToMinutes(b.startTime) ||
  timeToMinutes(a.endTime) - timeToMinutes(b.endTime) ||
  a.title.localeCompare(b.title);

export function createEvent(state, input, ctx) {
  const check = validateEventInput(input);
  if (!check.ok) return { ok: false, state, errors: check.errors };
  const event = { id: generateId('event'), ...check.value };
  const overlaps = findOverlappingEvents(state, event);
  const achievements = unlockAchievements({ ...state, events: [...state.events, event] }, ctx);
  return { ok: true, event, overlaps, state: achievements.state, notices: buildRewardNotices({ unlocked: achievements.unlocked }) };
}

export function updateEvent(state, eventId, input) {
  if (!findEvent(state, eventId)) return { ok: false, state, error: 'Event not found.' };
  const check = validateEventInput(input);
  if (!check.ok) return { ok: false, state, errors: check.errors };
  const event = { id: eventId, ...check.value };
  const overlaps = findOverlappingEvents(state, event);
  const events = state.events.map((item) => (item.id === eventId ? event : item));
  return { ok: true, event, overlaps, state: { ...state, events }, notices: [] };
}

export function deleteEvent(state, eventId) {
  if (!findEvent(state, eventId)) return { ok: false, state, error: 'Event not found.' };
  return { ok: true, state: { ...state, events: state.events.filter((event) => event.id !== eventId) }, notices: [] };
}

/**
 * Event lain pada tanggal yang sama yang jamnya bertumpuk dengan `candidate`.
 * Hanya peringatan (soft warning), tidak memblokir penyimpanan.
 */
export function findOverlappingEvents(state, candidate) {
  const start = timeToMinutes(candidate.startTime);
  const end = timeToMinutes(candidate.endTime);
  return state.events.filter(
    (event) =>
      event.id !== candidate.id &&
      event.date === candidate.date &&
      timeToMinutes(event.startTime) < end &&
      timeToMinutes(event.endTime) > start,
  );
}

export function getEventsOnDate(state, dateKey) {
  return state.events.filter((event) => event.date === dateKey).sort(byStartTime);
}

export function getDeadlinesOnDate(state, dateKey) {
  return state.tasks.filter((task) => task.dueDate === dateKey);
}

/** Semua yang ada pada satu tanggal: { events, deadlines }. */
export function getAgendaForDate(state, dateKey) {
  return { events: getEventsOnDate(state, dateKey), deadlines: getDeadlinesOnDate(state, dateKey) };
}

/**
 * Indeks tanggal -> { events, deadlines } untuk dipakai grid kalender (hindari memfilter
 * seluruh data berulang kali untuk 42 sel).
 * @returns {Map<string, {events: Object[], deadlines: Object[]}>}
 */
export function indexByDate(state) {
  const index = new Map();
  const slot = (dateKey) => {
    if (!index.has(dateKey)) index.set(dateKey, { events: [], deadlines: [] });
    return index.get(dateKey);
  };
  state.events.forEach((event) => slot(event.date).events.push(event));
  state.tasks.forEach((task) => task.dueDate && slot(task.dueDate).deadlines.push(task));
  index.forEach((value) => value.events.sort(byStartTime));
  return index;
}

/** Apakah event sedang berlangsung pada `ctx` (todayKey + timeKey)? Dipakai badge "NOW". */
export function isEventHappeningNow(event, ctx) {
  if (event.date !== ctx.todayKey) return false;
  const now = timeToMinutes(ctx.timeKey);
  return now >= timeToMinutes(event.startTime) && now < timeToMinutes(event.endTime);
}
