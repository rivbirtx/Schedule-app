/**
 * tasks-page.js
 * Halaman Tasks: daftar semua tugas dengan pencarian, filter (status, prioritas, kategori),
 * pengurutan (deadline, prioritas, tanggal dibuat), dan aksi cepat per baris.
 *
 * Filter disimpan di `ui.taskFilters` (app-state), diterapkan oleh task-service.filterAndSortTasks.
 */
import { html } from '../utils/dom-utils.js';
import { formatShortDate } from '../utils/date-utils.js';
import { STATUSES, PRIORITIES, CATEGORIES, TASK_SORTS } from '../data/constants.js';
import { filterAndSortTasks, isOverdue } from '../services/task-service.js';
import { categoryBadge, priorityBadge } from '../components/task-card.js';
import { emptyState } from '../components/empty-state.js';
import { icon } from '../components/icons.js';

const DIRECTION_LABELS = {
  due: { asc: 'Soonest first', desc: 'Latest first' },
  priority: { asc: 'Lowest first', desc: 'Highest first' },
  created: { asc: 'Oldest first', desc: 'Newest first' },
};

function selectOptions(items, value, allLabel) {
  return html`
    <option value="all" ${value === 'all' ? 'selected' : ''}>${allLabel}</option>
    ${items.map((item) => html`<option value="${item.id}" ${item.id === value ? 'selected' : ''}>${item.label ?? item.id}</option>`)}
  `;
}

function filterBar(filters, hasActiveFilters) {
  const directionLabel = DIRECTION_LABELS[filters.sort][filters.direction];
  return html`
    <div class="filters" role="search" aria-label="Filter tasks">
      <label class="search-box">
        <span class="visually-hidden">Search tasks</span>
        ${icon('search', { size: 14 })}
        <input class="px-input search-box__input" type="search" placeholder="Search tasks..." value="${filters.query}" data-filter="query" data-focus-id="filter-query" autocomplete="off" />
      </label>
      <select class="px-input px-select" aria-label="Filter by status" data-filter="status" data-focus-id="filter-status">
        ${selectOptions(STATUSES, filters.status, 'All Status')}
      </select>
      <select class="px-input px-select" aria-label="Filter by priority" data-filter="priority" data-focus-id="filter-priority">
        ${selectOptions(PRIORITIES, filters.priority, 'All Priority')}
      </select>
      <select class="px-input px-select" aria-label="Filter by category" data-filter="category" data-focus-id="filter-category">
        ${selectOptions(CATEGORIES, filters.category, 'All Categories')}
      </select>
      <select class="px-input px-select" aria-label="Sort by" data-filter="sort" data-focus-id="filter-sort">
        ${TASK_SORTS.map((sort) => html`<option value="${sort.id}" ${sort.id === filters.sort ? 'selected' : ''}>${sort.label}</option>`)}
      </select>
      <button type="button" class="px-btn px-btn--ghost px-btn--sm filters__dir" data-action="toggle-sort-dir" data-focus-id="filter-dir" title="${directionLabel}" aria-label="Sort direction: ${directionLabel}. Activate to reverse.">
        ${icon(filters.direction === 'asc' ? 'arrow-up' : 'arrow-down', { size: 12 })} <span class="filters__dir-label">${directionLabel}</span>
      </button>
      ${hasActiveFilters ? html`<button type="button" class="px-btn px-btn--ghost px-btn--sm" data-action="clear-filters">${icon('x', { size: 10 })} Clear</button>` : ''}
    </div>
  `;
}

function taskRow(task, todayKey) {
  const done = task.status === 'done';
  const overdue = isOverdue(task, todayKey);
  return html`
    <li class="task-row ${done ? 'is-done' : ''}">
      <input type="checkbox" class="px-check" data-action="toggle-done" data-id="${task.id}" data-focus-id="check-${task.id}" ${done ? 'checked' : ''} aria-label="Mark ${task.title} as ${done ? 'not done' : 'done'}" />
      <button type="button" class="task-row__title" data-action="edit-task" data-id="${task.id}" data-focus-id="title-${task.id}">${task.title}</button>
      <span class="task-row__cat">${categoryBadge(task.category)}</span>
      <span class="task-row__prio">${priorityBadge(task.priority)}</span>
      <span class="task-row__due ${overdue ? 'is-overdue' : ''}">
        ${task.dueDate ? html`${icon('calendar', { size: 12 })} ${formatShortDate(task.dueDate)}${overdue ? html`<span class="visually-hidden"> (overdue)</span>` : ''}` : html`<span class="task-row__none">No deadline</span>`}
      </span>
      <select class="status-select tone-${STATUSES.find((s) => s.id === task.status).color}" aria-label="Status of ${task.title}" data-action="set-status" data-id="${task.id}" data-focus-id="status-${task.id}">
        ${STATUSES.map((status) => html`<option value="${status.id}" ${status.id === task.status ? 'selected' : ''}>${status.label}</option>`)}
      </select>
      <span class="task-row__actions">
        <button type="button" class="icon-btn icon-btn--framed" data-action="edit-task" data-id="${task.id}" aria-label="Edit ${task.title}">${icon('edit', { size: 12 })}</button>
        <button type="button" class="icon-btn icon-btn--framed icon-btn--danger" data-action="delete-task" data-id="${task.id}" aria-label="Delete ${task.title}">${icon('trash', { size: 12 })}</button>
      </span>
    </li>
  `;
}

export function renderTasksPage({ state, ui, ctx }) {
  const filters = ui.taskFilters;
  const hasActiveFilters = Boolean(filters.query.trim()) || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all';
  const tasks = filterAndSortTasks(state.tasks, filters);

  const empty = state.tasks.length === 0
    ? emptyState({ title: 'NO TASKS YET', message: 'Add your first quest to start earning XP.', icon: 'tasks', actionLabel: 'Add Task', actionAttrs: 'data-action="add-task"' })
    : emptyState({ title: 'NO MATCHES', message: 'No task matches the current search or filters.', icon: 'search', actionLabel: 'Clear filters', actionAttrs: 'data-action="clear-filters"' });

  return html`
    <section class="px-panel tasks-panel" aria-labelledby="tasks-title">
      <header class="px-panel__head">
        <h2 class="px-panel__title font-pixel" id="tasks-title">${icon('tasks', { size: 16, className: 'text-yellow' })} ALL TASKS</h2>
        <button type="button" class="px-btn px-btn--primary px-btn--sm" data-action="add-task" data-status="todo" data-focus-id="add-task-main">${icon('plus', { size: 12 })} Add Task</button>
      </header>
      ${filterBar(filters, hasActiveFilters)}
      <p class="tasks-panel__count" role="status" aria-live="polite">Showing ${tasks.length} of ${state.tasks.length} ${state.tasks.length === 1 ? 'task' : 'tasks'}</p>
      ${tasks.length
        ? html`<ul class="task-list">${tasks.map((task) => taskRow(task, ctx.todayKey))}</ul>`
        : empty}
    </section>
  `;
}
