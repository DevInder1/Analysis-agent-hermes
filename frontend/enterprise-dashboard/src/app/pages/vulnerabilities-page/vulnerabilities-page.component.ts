import { Component, inject, OnInit, signal } from '@angular/core';

import { DataGridComponent } from '../../components/data-grid/data-grid.component';
import { LocalDataService } from '../../services/local-data.service';

@Component({
  selector: 'app-vulnerabilities-page',
  imports: [DataGridComponent],
  template: `
    <div class="page">
      <header>
        <h2>Vulnerabilities</h2>
        <div class="actions">
          <select [value]="filter()" (change)="onFilter($event)">
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="button" (click)="scan()" [disabled]="data.loading()">Run scan</button>
          <button type="button" class="secondary" (click)="reload()" [disabled]="data.loading()">Refresh</button>
        </div>
      </header>

      @if (data.error(); as err) {
        <p class="error">{{ err }}</p>
      }

      @if (data.scanHistory().length) {
        <p class="meta">Last scan: {{ data.scanHistory()[0]['scanned_at'] }} — {{ data.scanHistory()[0]['finding_count'] }} findings</p>
      }

      <app-data-grid [grid]="data.vulnGrid()" />
    </div>
  `,
  styles: `
    .page {
      padding: 1rem 1.25rem;
      height: 100vh;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    h2 {
      margin: 0;
      font-size: 1.1rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    button {
      padding: 0.4rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
      font-weight: 500;
    }
    button.secondary {
      background: #64748b;
    }
    button:disabled {
      opacity: 0.5;
    }
    select {
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .error {
      color: #b91c1c;
      font-size: 0.85rem;
    }
    .meta {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0 0 0.5rem;
    }
    app-data-grid {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class VulnerabilitiesPageComponent implements OnInit {
  protected readonly data = inject(LocalDataService);
  protected readonly filter = signal('');

  ngOnInit(): void {
    void this.reload();
  }

  reload(): void {
    void this.data.loadVulnerabilities(this.filter() || undefined);
    void this.data.loadScanHistory();
  }

  scan(): void {
    void this.data.runVulnerabilityScan();
  }

  onFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filter.set(value);
    void this.data.loadVulnerabilities(value || undefined);
  }
}
