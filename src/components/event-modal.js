/**
 * event-modal.js
 * Formulir "Add / Edit Event" (judul, tanggal, jam mulai/selesai, warna, catatan).
 *
 *   openEventModal({ date: '2026-10-22' })   -> tambah event pada tanggal itu
 *   openEventModal({ eventId })              -> edit (+ tombol Delete)
 *
 * Validasi rentang waktu (jam selesai harus setelah jam mulai, tanggal nyata) dilakukan
 * oleh utils/validation.js lewat event-service; modal hanya menampilkan pesannya.
 * Event yang jamnya bertumpuk TIDAK diblokir; pengguna diberi peringatan lewat toast.
 */
import { html } from '../utils/dom-utils.js';
import { EVENT_COLORS, LIMITS } from '../data/constants.js';
import { getState, addEvent, editEvent } from '../state/app-state.js';
import { openModal } from './modal.js';
import { deleteEventFlow } from './delete-flow.js';
import { showToast } from './toast.js';
import { icon } from './icons.js';

const COLOR_LABELS = { blue: 'Blue', pink: 'Pink', yellow: 'Yellow', purple: 'Purple', green: 'Green', cyan: 'Cyan' };

function field(id, label, control, { required = false } = {}) {
  return html`
    <div class="field">
      <label class="field__label" for="${id}">${label}${required ? html` <span class="field__req" aria-hidden="true">*</span>` : ''}</label>
      ${control}
      <p class="field__error" id="${id}-error" role="alert" hidden></p>
    </div>
  `;
}

function formMarkup(values, isEdit) {
  return html`
    <form class="event-form" novalidate>
      <header class="modal__head">
        <h2 class="modal__title font-pixel" id="event-modal-title">${isEdit ? 'EDIT EVENT' : 'ADD EVENT'}</h2>
        <button type="button" class="icon-btn icon-btn--framed" data-modal-close aria-label="Close">${icon('x', { size: 12 })}</button>
      </header>
      <div class="modal__body">
        ${field('event-title', 'Title', html`<input class="px-input" id="event-title" name="title" type="text" maxlength="${LIMITS.TITLE_MAX + 20}" autocomplete="off" required value="${values.title}" />`, { required: true })}
        ${field('event-date', 'Date', html`<input class="px-input" id="event-date" name="date" type="date" required value="${values.date}" />`, { required: true })}
        <div class="field-row">
          ${field('event-start', 'Start', html`<input class="px-input" id="event-start" name="startTime" type="time" required value="${values.startTime}" />`, { required: true })}
          ${field('event-end', 'End', html`<input class="px-input" id="event-end" name="endTime" type="time" required value="${values.endTime}" />`, { required: true })}
        </div>
        <fieldset class="field field--fieldset">
          <legend class="field__label">Color</legend>
          <div class="swatches">
            ${EVENT_COLORS.map(
              (color) => html`
                <label class="swatch tone-${color}" title="${COLOR_LABELS[color]}">
                  <input type="radio" name="color" value="${color}" ${color === values.color ? 'checked' : ''} aria-label="${COLOR_LABELS[color]}" />
                  <span class="swatch__box"></span>
                </label>`,
            )}
          </div>
        </fieldset>
        ${field('event-notes', 'Notes', html`<textarea class="px-input px-textarea" id="event-notes" name="notes" rows="2" maxlength="${LIMITS.DESCRIPTION_MAX}">${values.notes}</textarea>`)}
      </div>
      <footer class="modal__foot">
        ${isEdit ? html`<button type="button" class="px-btn px-btn--danger modal__foot-left" data-modal-action="delete-event">${icon('trash', { size: 12 })} Delete</button>` : ''}
        <button type="button" class="px-btn px-btn--ghost" data-modal-close>Cancel</button>
        <button type="submit" class="px-btn px-btn--yellow">Save</button>
      </footer>
    </form>
  `;
}

function showErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach((element) => {
    element.hidden = true;
    element.textContent = '';
  });
  const fieldIds = { title: 'event-title', date: 'event-date', startTime: 'event-start', endTime: 'event-end' };
  let firstInvalid = null;
  Object.entries(errors).forEach(([name, message]) => {
    const id = fieldIds[name];
    const error = id ? form.querySelector(`#${id}-error`) : null;
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    const control = form.querySelector(`#${id}`);
    control?.setAttribute('aria-invalid', 'true');
    firstInvalid ??= control;
  });
  firstInvalid?.focus();
}

/**
 * @param {{eventId?: string, date?: string}} options
 */
export function openEventModal({ eventId = null, date = '' } = {}) {
  const existing = eventId ? getState().events.find((event) => event.id === eventId) : null;
  if (eventId && !existing) {
    showToast({ type: 'error', message: 'That event no longer exists.' });
    return null;
  }
  const values = existing ?? { title: '', date, startTime: '09:00', endTime: '10:00', color: 'blue', notes: '' };
  const modal = openModal({ labelledBy: 'event-modal-title', initialFocus: '#event-title', content: formMarkup(values, Boolean(existing)) });
  const form = modal.dialog.querySelector('form');

  form.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-modal-action="delete-event"]') : null;
    if (!button) return;
    if (await deleteEventFlow(existing.id)) modal.close(true);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const input = Object.fromEntries(['title', 'date', 'startTime', 'endTime', 'color', 'notes'].map((name) => [name, data.get(name)]));
    const result = existing ? editEvent(existing.id, input) : addEvent(input);
    if (!result.ok) {
      showErrors(form, result.errors ?? { title: result.error ?? 'Could not save the event.' });
      return;
    }
    showToast({ type: 'success', message: existing ? 'Event updated.' : 'Event added.' });
    if (result.overlaps?.length) {
      showToast({ type: 'info', message: 'Heads up: this overlaps with another event.', detail: result.overlaps.map((item) => item.title).join(', ') });
    }
    modal.close(true);
  });

  return modal;
}
