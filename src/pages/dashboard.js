import { html } from '../utils/dom-utils.js';
import { computeTaskStats } from '../services/task-service.js';
import { kanbanBoard } from '../components/kanban-board.js';
import { agendaPanel } from '../components/agenda-panel.js';

export function renderDashboard({ state, ui, ctx, progress }) {
  return html`
    <div class="dash">
      <div class="dash__main">
        ${kanbanBoard({ tasks: state.tasks, todayKey: ctx.todayKey, menuTaskId: ui.menuTaskId })}
        ${agendaPanel({ state, ui, ctx, progress })}
      </div>
    </div>
  `;
}