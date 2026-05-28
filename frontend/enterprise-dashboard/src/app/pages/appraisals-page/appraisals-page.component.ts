import { Component, OnInit, signal } from '@angular/core';

import { DataGridComponent } from '../../components/data-grid/data-grid.component';
import { environment } from '../../../environments/environment';
import type { GridState } from '../../models/grid-data';
import { gridFromPayload } from '../../utils/grid-parser';

@Component({
  selector: 'app-appraisals-page',
  imports: [DataGridComponent],
  template: `
    <div class="page">
      <header>
        <h2>Appraisals</h2>
        <button type="button" (click)="load()" [disabled]="loading()">Refresh</button>
      </header>

      @if (error(); as err) {
        <p class="error">{{ err }}</p>
      }

      <p class="hint">Use chat to submit self-assessments or manager reviews via Hermes tools.</p>
      <app-data-grid [grid]="grid()" />
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
      margin-bottom: 0.5rem;
    }
    h2 {
      margin: 0;
      font-size: 1.1rem;
    }
    button {
      padding: 0.4rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
    }
    .error {
      color: #b91c1c;
      font-size: 0.85rem;
    }
    .hint {
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
export class AppraisalsPageComponent implements OnInit {
  private readonly base = environment.localApiUrl;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly grid = signal<GridState | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${this.base}/appraisals`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Local API unreachable — start: bash scripts/start-local-api.sh');
      }
      const data = (await res.json()) as { appraisals: Record<string, unknown>[] };
      this.grid.set(
        gridFromPayload({
          columns: [
            { field: 'employee_id', headerName: 'Employee' },
            { field: 'department', headerName: 'Dept' },
            { field: 'status', headerName: 'Status' },
            { field: 'updated_at', headerName: 'Updated' },
          ],
          rows: data.appraisals ?? [],
        }),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Load failed');
    } finally {
      this.loading.set(false);
    }
  }
}
