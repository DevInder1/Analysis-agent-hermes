import { buildChartModel, chartBars } from './chart-data';
import { gridFromPayload } from './grid-parser';

describe('buildChartModel', () => {
  const budgetGrid = gridFromPayload({
    columns: [
      { field: 'name', headerName: 'Project' },
      { field: 'budget', headerName: 'Budget' },
      { field: 'travel_pct_of_budget', headerName: 'Travel %' },
      { field: 'status', headerName: 'Status' },
      { field: 'travel_budget_alert', headerName: 'Alert' },
    ],
    rows: [
      { name: 'A', budget: 100, travel_pct_of_budget: 2, status: 'On Track', travel_budget_alert: false },
      { name: 'B', budget: 300, travel_pct_of_budget: 9, status: 'At Risk', travel_budget_alert: true },
      { name: 'C', budget: 200, travel_pct_of_budget: 6, status: 'On Track', travel_budget_alert: true },
    ],
  });

  it('defaults to the percent measure and flags alert rows', () => {
    const model = buildChartModel(budgetGrid)!;
    expect(model.defaultKey).toBe('m:travel_pct_of_budget');
    expect(model.views.map((v) => v.key)).toEqual([
      'm:budget',
      'm:travel_pct_of_budget',
      'c:status',
      'c:travel_budget_alert',
    ]);

    const view = model.views.find((v) => v.key === model.defaultKey)!;
    const bars = chartBars(budgetGrid!, model, view);
    expect(bars.map((b) => b.label)).toEqual(['B', 'C', 'A']);
    expect(bars.map((b) => b.alert)).toEqual([true, true, false]);
  });

  it('counts categories when there are no numeric columns', () => {
    const grid = gridFromPayload({
      columns: [
        { field: 'employee_id', headerName: 'Employee' },
        { field: 'status', headerName: 'Status' },
        { field: 'updated_at', headerName: 'Updated' },
      ],
      rows: [
        { employee_id: 'E1', status: 'completed', updated_at: '2026-01-01' },
        { employee_id: 'E2', status: 'pending_self', updated_at: '2026-01-02' },
        { employee_id: 'E3', status: 'pending_self', updated_at: '2026-01-03' },
      ],
    });
    const model = buildChartModel(grid)!;
    expect(model.views.map((v) => v.key)).toEqual(['c:status']);

    const bars = chartBars(grid!, model, model.views[0]);
    expect(bars).toEqual([
      { label: 'pending_self', value: 2, alert: false },
      { label: 'completed', value: 1, alert: false },
    ]);
  });

  it('returns null when nothing is chartable', () => {
    const grid = gridFromPayload({
      columns: [{ field: 'summary', headerName: 'Summary' }],
      rows: [{ summary: 'only text' }],
    });
    expect(buildChartModel(grid)).toBeNull();
  });
});
