/**
 * task-card.js
 * Kartu tugas untuk kolom Kanban.
 *
 * Interaksi (semuanya lewat atribut data-*, ditangani oleh features/tasks/task-actions.js
 * dan features/kanban/drag-and-drop.js; komponen ini hanya MERENDER):
 *   - seluruh kartu bisa di-drag (draggable)
 *   - tombol ⋮ membuka baris aksi: Edit, Delete, dan "Move to" kolom lain
 *     (alternatif drag-and-drop yang bisa dipakai keyboard & layar sentuh)
 */
import { html } from '../utils/dom-utils.js';
import { STATUSES, getCategory, getPriority, getStatus } from '../data/constants.js';
import { formatShortDate } from '../utils/date-utils.js';
import { isOverdue, getSubtaskProgress } from '../services/task-service.js';
import { icon } from './icons.js';

export function priorityBadge(priorityId) {
  const priority = getPriority(priorityId);
  return html`<span class="px-badge tone-${priority.color}">${priority.label}</span>`;
}

export function categoryBadge(categoryId) {
  const category = getCategory(categoryId);
  return html`<span class="px-badge tone-${category.color}">${category.id}</span>`;
}

export function statusBadge(statusId) {
  const status = getStatus(statusId);
  return html`<span class="px-badge px-badge--pixel tone-${status.color}">${status.label}</span>`;
}

function dueLabel(task, todayKey) {
  if (!task.dueDate) return html`<span class="task-card__due is-none">No deadline</span>`;
  const overdue = isOverdue(task, todayKey);
  return html`
    <span class="task-card__due ${overdue ? 'is-overdue' : ''}">
      ${icon('calendar', { size: 12 })}
      <span>${formatShortDate(task.dueDate)}</span>
      ${overdue ? html`<span class="visually-hidden">(overdue)</span>` : ''}
    </span>
  `;
}

function actionsRow(task) {
  const otherStatuses = STATUSES.filter((status) => status.id !== task.status);
  return html`
    <div class="task-card__actions" role="group" aria-label="Actions for ${task.title}">
      <div class="task-card__action-row">
        <button type="button" class="px-btn px-btn--ghost px-btn--xs" data-action="edit-task" data-id="${task.id}" data-autofocus>
          ${icon('edit', { size: 12 })} Edit
        </button>
        <button type="button" class="px-btn px-btn--danger px-btn--xs" data-action="delete-task" data-id="${task.id}">
          ${icon('trash', { size: 12 })} Delete
        </button>
      </div>
      <p class="task-card__move-label">Move to</p>
      <div class="task-card__action-row">
        ${otherStatuses.map(
          (status) => html`
            <button type="button" class="px-btn px-btn--xs tone-${status.color} px-btn--tone" data-action="move-task" data-id="${task.id}" data-status="${status.id}">
              ${status.label}
            </button>
          `,
        )}
      </div>
    </div>
  `;
}

/**
 * @param {Object} task
 * @param {{todayKey: string, menuOpen: boolean}} options
 */
export function taskCard(task, { todayKey, menuOpen }) {
  const status = getStatus(task.status);
  const subtasks = getSubtaskProgress(task);
  return html`
    <article class="task-card ${task.status === 'done' ? 'is-done' : ''}" draggable="true" data-task-id="${task.id}" data-status="${task.status}">
      <div class="task-card__top">
        <span class="task-card__dot tone-${status.color}" aria-hidden="true"></span>
        <h4 class="task-card__title">${task.title}</h4>
        <button
          type="button"
          class="icon-btn"
          data-action="toggle-menu"
          data-id="${task.id}"
          data-focus-id="menu-${task.id}"
          aria-haspopup="true"
          aria-expanded="${menuOpen ? 'true' : 'false'}"
          aria-label="Actions for ${task.title}"
        >${icon('more', { size: 14 })}</button>
      </div>
      <div class="task-card__badges">${categoryBadge(task.category)} ${priorityBadge(task.priority)}</div>
      ${subtasks.total > 0
        ? html`<p class="task-card__subtasks" title="Subtasks done">${icon('check', { size: 11 })} ${subtasks.done}/${subtasks.total} subtasks</p>`
        : ''}
      ${dueLabel(task, todayKey)}
      ${menuOpen ? actionsRow(task) : ''}
    </article>
  `;
}
