import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SystemStatusService } from '../services/system-status.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <h1>Analysis Agent</h1>
        <p class="tagline">Hermes + MCP · Local store</p>

        <div class="status-bar">
          <span [class]="statusClass(status.hermesOnline())">Hermes</span>
          <span [class]="statusClass(status.localApiOnline())">Local API</span>
        </div>

        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Chat</a>
          <a routerLink="/vulnerabilities" routerLinkActive="active">Vulnerabilities</a>
          <a routerLink="/analytics" routerLinkActive="active">HR Analytics</a>
          <a routerLink="/appraisals" routerLinkActive="active">Appraisals</a>
        </nav>
      </aside>
      <main class="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: 220px 1fr;
      height: 100vh;
      background: #f8fafc;
    }
    .sidebar {
      background: #0f172a;
      color: #e2e8f0;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h1 {
      margin: 0;
      font-size: 1.1rem;
    }
    .tagline {
      margin: 0;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .status-bar {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.7rem;
    }
    .status-bar span {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: #334155;
    }
    .status-bar span.ok {
      background: #14532d;
      color: #bbf7d0;
    }
    .status-bar span.err {
      background: #7f1d1d;
      color: #fecaca;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    nav a {
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.9rem;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
    }
    nav a.active,
    nav a:hover {
      background: #1e293b;
      color: #a5b4fc;
    }
    .main {
      min-width: 0;
      overflow: hidden;
    }
  `,
})
export class ShellComponent implements OnInit {
  protected readonly status = inject(SystemStatusService);

  ngOnInit(): void {
    void this.status.refresh();
    setInterval(() => void this.status.refresh(), 30_000);
  }

  statusClass(ok: boolean | null): string {
    if (ok === null) return '';
    return ok ? 'ok' : 'err';
  }
}
