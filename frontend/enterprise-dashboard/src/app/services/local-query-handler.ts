import { environment } from '../../environments/environment';
import type { GridState } from '../models/grid-data';
import { gridFromPayload } from '../utils/grid-parser';

export interface LocalQueryResult {
  summary: string;
  grid: GridState;
}

export type CompanyQueryIntent = 'budget' | 'travel_alerts' | 'projects';

/** Returns intent when the message should load company data from the local API. */
export function getCompanyQueryIntent(userText: string): CompanyQueryIntent | null {
  const text = userText.trim().toLowerCase();
  if (!text) return null;
  if (isTravelAlertQuery(text)) return 'travel_alerts';
  if (isBudgetQuery(text)) return 'budget';
  if (isProjectListQuery(text)) return 'projects';
  return null;
}

/** Run structured company queries against the local API (bypasses LLM tool-calling). */
export async function tryLocalCompanyQuery(userText: string): Promise<LocalQueryResult | null> {
  const intent = getCompanyQueryIntent(userText);
  if (!intent) return null;

  switch (intent) {
    case 'travel_alerts':
      return fetchBudgetStatus(true);
    case 'budget':
      return fetchBudgetStatus(false);
    case 'projects':
      return fetchProjects();
  }
}

function isTravelAlertQuery(text: string): boolean {
  return (
    /travel budget alert|travel alert|over.?budget travel|high travel/.test(text) ||
    (text.includes('travel') && text.includes('alert'))
  );
}

function isBudgetQuery(text: string): boolean {
  return (
    /query budget|budget status|budget analysis|all projects.*budget|budget.*all project/.test(
      text,
    ) || (text.includes('budget') && (text.includes('project') || text.includes('status')))
  );
}

function isProjectListQuery(text: string): boolean {
  return (
    /project status|list projects|show projects|top \d+ project|get_project_status/.test(text) ||
    (text.includes('project') && (text.includes('budget') || text.includes('travel expense')))
  );
}

async function fetchBudgetStatus(overAlertsOnly: boolean): Promise<LocalQueryResult | null> {
  const q = overAlertsOnly ? '?over_budget_travel_only=true' : '';
  const url = `${environment.localApiUrl}/budget/status${q}`;
  const res = await fetch(url);

  if (res.ok) {
    const data = (await res.json()) as {
      projects?: Record<string, unknown>[];
      grid?: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] };
    };
    const grid = gridFromPayload(data.grid);
    if (!grid) return null;
    const rows = data.projects ?? [];
    return summarizeBudget(rows, grid, overAlertsOnly);
  }

  // Older local API without /budget/status — derive from /projects
  if (res.status === 404) {
    const data = await getJson<{
      projects?: Record<string, unknown>[];
      grid?: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] };
    }>(`${environment.localApiUrl}/projects?limit=50`);
    const enriched = (data.projects ?? []).map(enrichBudgetRow);
    const filtered = overAlertsOnly
      ? enriched.filter((r) => r['travel_budget_alert'])
      : enriched;
    const grid =
      gridFromPayload({
        columns: [
          { field: 'name', headerName: 'Project' },
          { field: 'budget', headerName: 'Budget' },
          { field: 'travel_expense', headerName: 'Travel' },
          { field: 'travel_pct_of_budget', headerName: 'Travel %' },
          { field: 'budget_remaining', headerName: 'Remaining' },
          { field: 'status', headerName: 'Status' },
          { field: 'travel_budget_alert', headerName: 'Alert' },
        ],
        rows: filtered,
      }) ?? gridFromPayload(data.grid);
    if (!grid) return null;
    return summarizeBudget(filtered, grid, overAlertsOnly);
  }

  throw new Error(`Local API ${res.status} — restart: bash scripts/start-local-api.sh`);
}

function enrichBudgetRow(p: Record<string, unknown>): Record<string, unknown> {
  const budget = Number(p['budget'] ?? 0);
  const travel = Number(p['travel_expense'] ?? 0);
  const travelPct = budget ? Math.round((travel / budget) * 10000) / 100 : 0;
  const status = String(p['status'] ?? '');
  return {
    ...p,
    travel_pct_of_budget: travelPct,
    budget_remaining: Math.round((budget - travel) * 100) / 100,
    travel_budget_alert: travelPct > 5 || status === 'At Risk',
  };
}

function summarizeBudget(
  rows: Record<string, unknown>[],
  grid: GridState,
  overAlertsOnly: boolean,
): LocalQueryResult {
  const alerts = rows.filter((r) => r['travel_budget_alert']).length;
  const summary = overAlertsOnly
    ? `Found ${rows.length} project(s) with travel budget alerts.\n\nData loaded from the company store — see the table on the right.`
    : `Budget status for ${rows.length} project(s) (${alerts} with travel alerts).\n\nData loaded from the company store — see the table on the right.`;
  return { summary, grid };
}

async function fetchProjects(): Promise<LocalQueryResult | null> {
  const data = await getJson<{
    projects?: Record<string, unknown>[];
    grid?: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] };
  }>(`${environment.localApiUrl}/projects?limit=20`);
  const grid = gridFromPayload(data.grid);
  if (!grid) return null;

  const count = data.projects?.length ?? grid.rowData.length;
  return {
    summary: `Loaded ${count} projects with budget and travel spend.\n\nData from the company store — see the table on the right.`,
    grid,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Local API ${res.status} — is it running? (bash scripts/start-local-api.sh)`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error('Local API returned HTML. Start: bash scripts/start-local-api.sh');
  }
  return (await res.json()) as T;
}
