import { Component, inject } from '@angular/core';

import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { DataGridComponent } from '../data-grid/data-grid.component';
import { HermesChatService } from '../../services/hermes-chat.service';

@Component({
  selector: 'app-dashboard',
  imports: [ChatPanelComponent, DataGridComponent],
  template: `
    <div class="dashboard">
      <aside class="sidebar">
        <h1>Analysis Agent</h1>
        <p class="tagline">Hermes + MCP · No RAG</p>
        <nav>
          <span class="active">Dashboard</span>
        </nav>
      </aside>
      <main class="main">
        <div class="split">
          <app-chat-panel class="chat-col" />
          <app-data-grid class="grid-col" [grid]="chat.tableData()" />
        </div>
      </main>
    </div>
  `,
  styles: `
    .dashboard {
      display: grid;
      grid-template-columns: 220px 1fr;
      height: 100vh;
      background: #f8fafc;
    }
    .sidebar {
      background: #0f172a;
      color: #e2e8f0;
      padding: 1.25rem;
    }
    .sidebar h1 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
    }
    .tagline {
      margin: 0 0 1.5rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    nav .active {
      font-size: 0.9rem;
      color: #a5b4fc;
    }
    .main {
      padding: 1rem 1.25rem;
      min-width: 0;
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      height: calc(100vh - 2rem);
    }
    .chat-col,
    .grid-col {
      min-height: 0;
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .split {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
    }
  `,
})
export class DashboardComponent {
  protected readonly chat = inject(HermesChatService);
}
