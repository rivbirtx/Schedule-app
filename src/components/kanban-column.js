/**
 * kanban-column.js
 * Satu kolom Kanban: header berwarna + jumlah kartu, daftar kartu, dan slot "+ Add Task".
 * Elemen `[data-dropzone]` adalah area tujuan drag-and-drop (lihat features/kanban/drag-and-drop.js).
 */
import { html } from '../utils/dom-utils.js';
import { taskCard } from './task-card.js';
import { icon } from './icons.js';

/**
 * @param {{id: string, label: string, color: string}} status
 * @param {Object[]} tasks tugas pada kolom ini (sudah terurut)
 * @param {{todayKey: string, menuTaskId: string|null}} options
 */
export function kanbanColumn(status, tasks, { todayKey, menuTaskId }) {
  return html`
    <section class="kanban-col tone-${status.color}" aria-labelledby="col-${status.id}">
      <header class="kanban-col__head">
        <h3 class="font-pixel kanban-col__name" id="col-${status.id}">${status.label}</h3>
        <span class="kanban-col__count font-pixel" aria-label="${tasks.length} tasks">${tasks.length}</span>
      </header>
      <div class="kanban-col__body" data-dropzone data-status="${status.id}">
        ${tasks.map((task) => taskCard(task, { todayKey, menuOpen: menuTaskId === task.id }))}
        ${tasks.length === 0 ? html`<p class="kanban-col__empty">Nothing here yet.<br />Drop a task or add one.</p>` : ''}
        <button type="button" class="kanban-col__add" data-action="add-task" data-status="${status.id}" data-focus-id="add-task-${status.id}">
          ${icon('plus', { size: 12 })} Add Task
        </button>
      </div>
    </section>
  `;
}
