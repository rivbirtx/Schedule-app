/**
 * kanban-board.js
 * Panel Kanban: empat kolom (TO DO, IN PROGRESS, REVIEW, DONE) dari satu daftar tugas.
 */
import { html } from '../utils/dom-utils.js';
import { STATUSES } from '../data/constants.js';
import { groupTasksByStatus } from '../services/task-service.js';
import { kanbanColumn } from './kanban-column.js';
import { icon } from './icons.js';

export function kanbanBoard({ tasks, todayKey, menuTaskId }) {
  const groups = groupTasksByStatus(tasks);
  return html`
    <section class="px-panel kanban" aria-labelledby="kanban-title">
      <header class="px-panel__head">
        <h2 class="px-panel__title font-pixel" id="kanban-title">${icon('tasks', { size: 16, className: 'text-yellow' })} KANBAN BOARD</h2>
        <button type="button" class="px-btn px-btn--primary px-btn--sm" data-action="add-task" data-status="todo" data-focus-id="add-task-main">
          ${icon('plus', { size: 12 })} Add Task
        </button>
      </header>
      <p class="kanban__hint">Drag cards between columns, or use the ⋮ menu on a card.</p>
      <div class="kanban__columns" data-scroll-key="kanban">
        ${STATUSES.map((status) => kanbanColumn(status, groups[status.id], { todayKey, menuTaskId }))}
      </div>
    </section>
  `;
}
