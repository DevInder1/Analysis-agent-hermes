import { gridFromPayload } from './grid-parser';
import { gridFromToolOutput, mergeToolGrids, readResponseEvent, toolLabel } from './hermes-stream';

describe('readResponseEvent', () => {
  const toolPayload = JSON.stringify({
    result: JSON.stringify({
      count: 1,
      grid: {
        columns: [
          { field: 'name', headerName: 'Project' },
          { field: 'travel_pct_of_budget', headerName: 'Travel %' },
        ],
        rows: [{ name: 'APAC Partner Onboarding', travel_pct_of_budget: 8.98 }],
      },
    }),
  });

  it('reads text deltas', () => {
    expect(readResponseEvent({ type: 'response.output_text.delta', delta: 'Hi' })).toEqual({
      kind: 'text',
      delta: 'Hi',
    });
  });

  it('labels a starting tool call', () => {
    const event = readResponseEvent({
      type: 'response.output_item.added',
      item: { type: 'function_call', name: 'mcp_company_knowledge_query_budget_status' },
    });
    expect(event).toEqual({ kind: 'tool_start', label: 'query budget status' });
  });

  it('turns a double-encoded tool result into a grid', () => {
    const event = readResponseEvent({
      type: 'response.output_item.added',
      item: { type: 'function_call_output', output: [{ text: toolPayload }] },
    });
    expect(event.kind).toBe('tool_result');
    const grid = event.kind === 'tool_result' ? event.grid : null;
    expect(grid?.rowData).toEqual([{ name: 'APAC Partner Onboarding', travel_pct_of_budget: 8.98 }]);
    expect(grid?.columnDefs.map((c) => c.headerName)).toEqual(['Project', 'Travel %']);
  });

  it('surfaces failures', () => {
    const event = readResponseEvent({
      type: 'response.failed',
      response: { error: { message: 'model offline' } },
    });
    expect(event).toEqual({ kind: 'failed', message: 'model offline' });
  });

  it('ignores other events', () => {
    expect(readResponseEvent({ type: 'response.created' })).toEqual({ kind: 'ignore' });
    expect(
      readResponseEvent({ type: 'response.output_item.added', item: { type: 'message' } }),
    ).toEqual({ kind: 'ignore' });
  });
});

describe('gridFromToolOutput', () => {
  it('returns null for results without a grid', () => {
    expect(gridFromToolOutput(JSON.stringify({ result: '{"section":"Per diem","text":"..."}' }))).toBeNull();
    expect(gridFromToolOutput('plain text result')).toBeNull();
  });
});

describe('mergeToolGrids', () => {
  const columns = [
    { field: 'employee_id', headerName: 'Employee' },
    { field: 'status', headerName: 'Status' },
  ];
  const self = gridFromPayload({ columns, rows: [{ employee_id: 'E030', status: 'pending_self' }] })!;
  const manager = gridFromPayload({
    columns,
    rows: [
      { employee_id: 'E037', status: 'pending_manager' },
      { employee_id: 'E030', status: 'pending_self' },
    ],
  })!;

  it('appends rows from a second call with the same columns, skipping duplicates', () => {
    expect(mergeToolGrids(self, manager).rowData).toEqual([
      { employee_id: 'E030', status: 'pending_self' },
      { employee_id: 'E037', status: 'pending_manager' },
    ]);
  });

  it('replaces the table when the columns differ', () => {
    const other = gridFromPayload({ columns: [{ field: 'package' }], rows: [{ package: 'fastmcp' }] })!;
    expect(mergeToolGrids(self, other)).toBe(other);
    expect(mergeToolGrids(null, self)).toBe(self);
  });
});

describe('toolLabel', () => {
  it('strips MCP server prefixes', () => {
    expect(toolLabel('mcp_business_data_get_stored_vulnerabilities')).toBe('get stored vulnerabilities');
    expect(toolLabel('web_search')).toBe('web search');
  });
});
