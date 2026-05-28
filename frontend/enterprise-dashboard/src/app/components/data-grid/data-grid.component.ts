import { Component, inject, input } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import type { GridState } from '../../models/grid-data';
import { HermesChatService } from '../../services/hermes-chat.service';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-data-grid',
  imports: [AgGridAngular],
  template: `
    <section class="grid-panel">
      <h2>Data</h2>
      @if (grid(); as g) {
        <ag-grid-angular
          class="ag-theme-quartz grid"
          [rowData]="g.rowData"
          [columnDefs]="g.columnDefs"
          [gridOptions]="gridOptions"
        />
      } @else {
        <div class="empty">
          <p>No table data yet.</p>
          <p class="hint">Try a budget prompt in chat, or load project data directly:</p>
          <button type="button" (click)="loadBudget()" [disabled]="chat.isStreaming()">
            Load project budgets
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .grid-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      font-weight: 600;
    }
    .grid {
      flex: 1;
      width: 100%;
      min-height: 280px;
    }
    .empty {
      color: #64748b;
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .empty p {
      margin: 0;
    }
    .hint {
      font-size: 0.8rem;
    }
    .empty button {
      align-self: flex-start;
      padding: 0.4rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .empty button:disabled {
      opacity: 0.5;
    }
  `,
})
export class DataGridComponent {
  protected readonly chat = inject(HermesChatService);
  readonly grid = input<GridState | null>(null);

  loadBudget(): void {
    void this.chat.loadBudgetTable();
  }

  readonly gridOptions: GridOptions = {
    defaultColDef: {
      flex: 1,
      minWidth: 100,
      resizable: true,
    },
    animateRows: true,
  };
}
