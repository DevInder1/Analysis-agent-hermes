import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { LocalDataService } from '../../services/local-data.service';

@Component({
  selector: 'app-analytics-page',
  imports: [DecimalPipe, PercentPipe],
  template: `
    <div class="page">
      <header>
        <h2>HR Analytics</h2>
        <button type="button" (click)="reload()" [disabled]="data.loading()">Refresh</button>
      </header>

      @if (data.error(); as err) {
        <p class="error">{{ err }}</p>
      }

      @if (data.analytics(); as a) {
        <div class="cards">
          <div class="card">
            <span class="label">Employees</span>
            <span class="value">{{ a.overall['total_employees'] }}</span>
          </div>
          <div class="card">
            <span class="label">Avg training (h)</span>
            <span class="value">{{ a.overall['mean_training_hours'] | number: '1.1-1' }}</span>
          </div>
          <div class="card">
            <span class="label">Avg completion</span>
            <span class="value">{{ a.overall['mean_completion_rate'] | percent: '1.0-2' }}</span>
          </div>
        </div>

        @if (a.chart; as chart) {
          <section class="chart">
            <h3>Completion rate by training bucket</h3>
            <div class="bars">
              @for (label of chart.labels; track label; let i = $index) {
                <div class="bar-row">
                  <span class="bar-label">{{ label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="chart.values[i] * 100"></div>
                  </div>
                  <span class="bar-val">{{ chart.values[i] | percent: '1.0-0' }}</span>
                </div>
              }
            </div>
          </section>
        }

        <table>
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Avg completion</th>
              <th>Employees</th>
            </tr>
          </thead>
          <tbody>
            @for (row of a.summary; track $index) {
              <tr>
                <td>{{ row['training_bucket'] }}</td>
                <td>{{ asNumber(row['avg_completion_rate']) | percent: '1.0-1' }}</td>
                <td>{{ row['employee_count'] }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: `
    .page {
      padding: 1rem 1.25rem;
      max-width: 900px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    h2,
    h3 {
      margin: 0 0 0.75rem;
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
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .label {
      font-size: 0.75rem;
      color: #64748b;
    }
    .value {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .chart {
      margin-bottom: 1.5rem;
    }
    .bars {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 80px 1fr 48px;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }
    .bar-track {
      height: 10px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: #6366f1;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th,
    td {
      border: 1px solid #e2e8f0;
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    th {
      background: #f1f5f9;
    }
    .error {
      color: #b91c1c;
    }
  `,
})
export class AnalyticsPageComponent implements OnInit {
  protected readonly data = inject(LocalDataService);

  ngOnInit(): void {
    void this.reload();
  }

  reload(): void {
    void this.data.loadAnalytics();
  }

  asNumber(v: unknown): number {
    return typeof v === 'number' ? v : Number(v);
  }
}
