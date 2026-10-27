import { html } from '../utils/dom-utils.js';
import { computeTaskStats } from '../services/task-service.js';
import { calendarView } from '../components/calendar-view.js';
import { agendaPanel } from '../components/agenda-panel.js';

export function renderDashboard({ state, ui, ctx, progress }) {
  return html`
    <div class="dash">
      <div class="dash__main">
        ${calendarView({ state, ui, ctx })}
        ${agendaPanel({ state, ui, ctx, progress })}
      </div>
    </div>
  `;
}