import type { ColDef } from 'ag-grid-community';

import type { GridPayload, GridState } from '../models/grid-data';

const JSON_BLOCK = /```(?:json)?\s*([\s\S]*?)```/gi;

export function gridFromPayload(
  grid: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] } | undefined,
): GridState | null {
  if (!grid?.columns?.length || !Array.isArray(grid.rows)) return null;
  const columnDefs: ColDef[] = grid.columns.map((c) => ({
    field: c.field,
    headerName: c.headerName ?? c.field,
    filter: true,
    sortable: true,
    flex: 1,
    minWidth: 120,
  }));
  return { columnDefs, rowData: grid.rows };
}

export function extractGridFromText(text: string): GridState | null {
  const blocks = [...text.matchAll(JSON_BLOCK)];
  for (const block of blocks) {
    const parsed = tryParseGrid(block[1]);
    if (parsed) return parsed;
  }
  return tryParseGrid(text);
}

function tryParseGrid(raw: string): GridState | null {
  try {
    const data = JSON.parse(raw.trim()) as { grid?: GridPayload };
    const grid = data.grid ?? (data as unknown as GridPayload);
    return gridFromPayload(grid);
  } catch {
    return null;
  }
}
