import { Injectable, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import type { GridState } from '../models/grid-data';
import { gridFromPayload } from '../utils/grid-parser';

export interface EmployeeAnalytics {
  overall: Record<string, number>;
  summary: Record<string, unknown>[];
  chart?: { labels: string[]; values: number[] };
}

@Injectable({ providedIn: 'root' })
export class LocalDataService {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly vulnGrid = signal<GridState | null>(null);
  readonly analytics = signal<EmployeeAnalytics | null>(null);
  readonly scanHistory = signal<Record<string, unknown>[]>([]);

  private base = environment.localApiUrl;

  async checkLocalApi(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/health`);
      if (!res.ok) return false;
      const ct = res.headers.get('content-type') ?? '';
      return ct.includes('application/json');
    } catch {
      return false;
    }
  }

  private async parseJson<T>(res: Response): Promise<T> {
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      throw new Error(
        'Local API returned HTML (proxy not active). Run: bash scripts/start-local-api.sh then restart ng serve.',
      );
    }
    return (await res.json()) as T;
  }

  async loadVulnerabilities(severity?: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const q = severity ? `?severity=${encodeURIComponent(severity)}` : '';
      const res = await fetch(`${this.base}/vulnerabilities${q}`);
      if (!res.ok) throw new Error(`Local API ${res.status}`);
      const data = await this.parseJson<{
        grid?: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] };
      }>(res);
      const grid = gridFromPayload(data.grid);
      if (grid) this.vulnGrid.set(grid);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load vulnerabilities');
    } finally {
      this.loading.set(false);
    }
  }

  async runVulnerabilityScan(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${this.base}/vulnerabilities/scan`, { method: 'POST' });
      if (!res.ok) throw new Error(`Scan failed ${res.status}`);
      await this.loadVulnerabilities();
      await this.loadScanHistory();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      this.loading.set(false);
    }
  }

  async loadScanHistory(): Promise<void> {
    try {
      const res = await fetch(`${this.base}/vulnerabilities/scans`);
      if (!res.ok) return;
      const data = await this.parseJson<{ scans: Record<string, unknown>[] }>(res);
      this.scanHistory.set(data.scans ?? []);
    } catch {
      /* optional */
    }
  }

  async loadAnalytics(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${this.base}/analytics/employees`);
      if (!res.ok) throw new Error(`Local API ${res.status}`);
      this.analytics.set(await this.parseJson<EmployeeAnalytics>(res));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      this.loading.set(false);
    }
  }
}
