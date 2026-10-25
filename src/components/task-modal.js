/**
 * task-modal.js
 * Formulir "Add / Edit Task" (judul, deskripsi, status, prioritas, kategori, deadline, subtask).
 *
 *   openTaskModal()                              -> tambah tugas baru
 *   openTaskModal({ status: 'review' })          -> tambah, status awal sudah terpilih
 *   openTaskModal({ dueDate: '2026-10-25' })     -> tambah, deadline awal sudah terisi
 *   openTaskModal({ taskId })                    -> edit (+ tombol Delete)
 *
 * Alur simpan: baca formulir -> app-state.addTask/editTask -> service memvalidasi.
 * Jika service mengembalikan `errors`, pesan ditampilkan di bawah field yang bermasalah
 * dan modal tetap terbuka. Validasi hanya ada di satu tempat (utils/validation.js).
 */
import { html } from '../utils/dom-utils.js';
import { STATUSES, PRIORITIES, CATEGORIES, LIMITS } from '../data/constants.js';
import { generateId } from '../utils/id-generator.js';
import { getState, addTask, editTask } from '../state/app-state.js';
import { openModal } from './modal.js';
import { deleteTaskFlow } from './delete-flow.js';
import { showToast } from './toast.js';
import { icon } from './icons.js';

function subtaskRow(subtask) {
  return html`
    <li class="subtask-row" data-sub-id="${subtask.id}">
      <input type="checkbox" class="px-check" aria-label="Subtask done" ${subtask.done ? 'checked' : ''} data-sub-done />
      <input type="text" class="px-input" aria-label="Subtask title" maxlength="${LIMITS.SUBTASK_MAX}" placeholder="Subtask..." data-sub-title value="${subtask.title}" />
      <button type="button" class="icon-btn icon-btn--framed icon-btn--danger" data-modal-action="remove-subtask" aria-label="Remove subtask">${icon('x', { size: 10 })}</button>
    </li>
  `;
}

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
    <form class="task-form" novalidate>
      <header class="modal__head">
        <h2 class="modal__title font-pixel" id="task-modal-title">${isEdit ? 'EDIT TASK' : 'ADD TASK'}</h2>
        <button type="button" class="icon-btn icon-btn--framed" data-modal-close aria-label="Close">${icon('x', { size: 12 })}</button>
      </header>

      <div class="modal__body">
        ${field('task-title', 'Title', html`<input class="px-input" id="task-title" name="title" type="text" maxlength="${LIMITS.TITLE_MAX + 20}" autocomplete="off" required aria-describedby="task-title-error" value="${values.title}" />`, { required: true })}
        ${field('task-description', 'Description', html`<textarea class="px-input px-textarea" id="task-description" name="description" rows="3" maxlength="${LIMITS.DESCRIPTION_MAX}">${values.description}</textarea>`)}

        <div class="field-row">
          ${field('task-status', 'Status', html`
            <select class="px-input px-select" id="task-status" name="status">
              ${STATUSES.map((status) => html`<option value="${status.id}" ${status.id === values.status ? 'selected' : ''}>${status.label}</option>`)}
            </select>`)}
          <fieldset class="field field--fieldset">
            <legend class="field__label">Priority</legend>
            <div class="px-segmented px-segmented--priority">
              ${PRIORITIES.map(
                (priority) => html`
                  <label class="px-segmented__radio tone-${priority.color}">
                    <input type="radio" name="priority" value="${priority.id}" ${priority.id === values.priority ? 'checked' : ''} />
                    <span>${priority.label}</span>
                  </label>`,
              )}
            </div>
          </fieldset>
        </div>

        <div class="field-row">
          ${field('task-category', 'Category', html`
            <select class="px-input px-select" id="task-category" name="category">
              ${CATEGORIES.map((category) => html`<option value="${category.id}" ${category.id === values.category ? 'selected' : ''}>${category.id}</option>`)}
            </select>`)}
          ${field('task-due', 'Due Date', html`<input class="px-input" id="task-due" name="dueDate" type="date" value="${values.dueDate}" aria-describedby="task-due-error" />`)}
        </div>

        <fieldset class="field field--fieldset">
          <legend class="field__label">Subtasks</legend>
          <ul class="subtask-list" data-subtask-list>${values.subtasks.map(subtaskRow)}</ul>
          <button type="button" class="subtask-add" data-modal-action="add-subtask">${icon('plus', { size: 10 })} Add subtask</button>
        </fieldset>
      </div>

      <footer class="modal__foot">
        ${isEdit ? html`<button type="button" class="px-btn px-btn--danger modal__foot-left" data-modal-action="delete-task">${icon('trash', { size: 12 })} Delete</button>` : ''}
        <button type="button" class="px-btn px-btn--ghost" data-modal-close>Cancel</button>
        <button type="submit" class="px-btn px-btn--yellow">Save</button>
      </footer>
    </form>
  `;
}

/** Baca nilai mentah dari formulir. Validasi dilakukan oleh service, bukan di sini. */
function readForm(form) {
  const data = new FormData(form);
  const subtasks = [...form.querySelectorAll('.subtask-row')].map((row) => ({
    id: row.dataset.subId || undefined,
    title: row.querySelector('[data-sub-title]').value,
    done: row.querySelector('[data-sub-done]').checked,
  }));
  return {
    title: data.get('title'),
    description: data.get('description'),
    status: data.get('status'),
    priority: data.get('priority'),
    category: data.get('category'),
    dueDate: data.get('dueDate'),
    subtasks,
  };
}

function showErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach((element) => {
    element.hidden = true;
    element.textContent = '';
  });
  const fieldIds = { title: 'task-title', status: 'task-status', priority: 'task-status', dueDate: 'task-due' };
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
 * @param {{taskId?: string, status?: string, dueDate?: string}} [options]
 */
export function openTaskModal({ taskId = null, status = 'todo', dueDate = '' } = {}) {
  const existing = taskId ? getState().tasks.find((task) => task.id === taskId) : null;
  if (taskId && !existing) {
    showToast({ type: 'error', message: 'That task no longer exists.' });
    return null;
  }

  const values = existing ?? { title: '', description: '', status, priority: 'medium', category: 'Other', dueDate, subtasks: [] };
  const modal = openModal({ labelledBy: 'task-modal-title', initialFocus: '#task-title', content: formMarkup(values, Boolean(existing)) });
  const form = modal.dialog.querySelector('form');

  const addSubtaskRow = () => {
    const list = form.querySelector('[data-subtask-list]');
    if (list.children.length >= LIMITS.SUBTASKS_PER_TASK) {
      showToast({ type: 'info', message: `Maximum ${LIMITS.SUBTASKS_PER_TASK} subtasks per task.` });
      return;
    }
    list.insertAdjacentHTML('beforeend', subtaskRow({ id: generateId('sub'), title: '', done: false }).toString());
    list.lastElementChild.querySelector('[data-sub-title]').focus();
  };

  form.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-modal-action]') : null;
    if (!button) return;
    const action = button.dataset.modalAction;
    if (action === 'add-subtask') addSubtaskRow();
    if (action === 'remove-subtask') button.closest('.subtask-row').remove();
    if (action === 'delete-task' && (await deleteTaskFlow(existing.id))) modal.close(true);
  });

  // Enter di kolom subtask menambah baris baru, bukan menyimpan seluruh formulir.
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target instanceof Element && event.target.matches('[data-sub-title]')) {
      event.preventDefault();
      if (event.target.value.trim()) addSubtaskRow();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = readForm(form);
    const result = existing ? editTask(existing.id, input) : addTask(input);
    if (!result.ok) {
      showErrors(form, result.errors ?? { title: result.error ?? 'Could not save the task.' });
      return;
    }
    showToast({ type: 'success', message: existing ? 'Task updated.' : 'Task added.' });
    modal.close(true);
  });

  return modal;
}
