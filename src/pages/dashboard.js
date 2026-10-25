/**
 * dashboard.js
 * Halaman Dashboard = empat kartu statistik + Kanban Board + Today Schedule (berdampingan di desktop).
 * Halaman hanya MENYUSUN komponen; semua angka dihitung service dari state.
 */
import { html } from '../utils/dom-utils.js';
import { computeTaskStats } from '../services/task-service.js';
import { statCard } from '../components/stat-card.js';
import { kanbanBoard } from '../components/kanban-board.js';
import { agendaPanel } from '../components/agenda-panel.js';

export function renderDashboard({ state, ui, ctx, progress }) {
  const stats = computeTaskStats(state.tasks);
  return html`
    <div class="dash">
      <div class="dash__stats">
        ${statCard({ label: 'Total Tasks', value: stats.total, icon: 'tasks', tone: 'blue' })}
        ${statCard({ label: 'Completed', value: stats.completed, icon: 'check', tone: 'green' })}
        ${statCard({ label: 'In Progress', value: stats.inProgress, icon: 'hourglass', tone: 'yellow' })}
        ${statCard({ label: 'Pending', value: stats.pending, icon: 'alert', tone: 'red', hint: 'To Do + Review' })}
      </div>
      <div class="dash__main">
        ${kanbanBoard({ tasks: state.tasks, todayKey: ctx.todayKey, menuTaskId: ui.menuTaskId })}
        ${agendaPanel({ state, ui, ctx, progress })}
      </div>
    </div>
  `;
}
