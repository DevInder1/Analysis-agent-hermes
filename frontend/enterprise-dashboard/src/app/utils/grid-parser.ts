import type { ColDef } from 'ag-grid-community';

import type { GridPayload, GridState } from '../models/grid-data';
import { formatNumber, isPercentColumn } from './number-format';

const JSON_BLOCK = /```(?:json)?\s*([\s\S]*?)```/gi;
const UNFORMATTED_NUMBER = /(^id$|_id$|year)/i;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER_CELL = /^:?-{3,}:?$/;
const NUMERIC_CELL = /^-?\$?\d[\d,]*(\.\d+)?%?$/;

export function gridFromPayload(
  grid: { columns: { field: string; headerName?: string }[]; rows: Record<string, unknown>[] } | undefined,
): GridState | null {
  if (!grid?.columns?.length || !Array.isArray(grid.rows)) return null;
  const columnDefs: ColDef[] = grid.columns.map((c) => {
    const headerName = c.headerName ?? c.field;
    const def: ColDef = {
      field: c.field,
      headerName,
      filter: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
    };
    if (isNumberColumn(c.field, grid.rows)) {
      const percent = isPercentColumn(c.field, headerName);
      def.type = 'rightAligned';
      def.valueFormatter = (p) =>
        typeof p.value === 'number' ? formatNumber(p.value, percent) : (p.value ?? '');
    }
    return def;
  });
  return { columnDefs, rowData: grid.rows };
}

function isNumberColumn(field: string, rows: Record<string, unknown>[]): boolean {
  if (UNFORMATTED_NUMBER.test(field)) return false;
  const values = rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined);
  return values.length > 0 && values.every((v) => typeof v === 'number');
}

export function extractGridFromText(text: string): GridState | null {
  const blocks = [...text.matchAll(JSON_BLOCK)];
  for (const block of blocks) {
    const parsed = tryParseGrid(block[1]);
    if (parsed) return parsed;
  }
  return tryParseGrid(text) ?? tryParseMarkdownTable(text);
}

function tryParseMarkdownTable(text: string): GridState | null {
  const lines = text.split('\n');
  let headers: string[] | null = null;
  let fields: string[] = [];
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i + 1 < lines.length; i++) {
    if (!TABLE_ROW.test(lines[i]) || !isDividerRow(lines[i + 1])) continue;
    const tableHeaders = splitRow(lines[i]);
    if (!headers) {
      headers = tableHeaders;
      fields = uniqueFields(tableHeaders);
    } else if (tableHeaders.join('|') !== headers.join('|')) {
      continue;
    }
    for (i += 2; i < lines.length && TABLE_ROW.test(lines[i]); i++) {
      const cells = splitRow(lines[i]);
      rows.push(Object.fromEntries(fields.map((f, k) => [f, cellValue(cells[k] ?? '')])));
    }
  }

  const headerNames = headers;
  if (!headerNames || !rows.length) return null;
  return gridFromPayload({
    columns: fields.map((field, k) => ({ field, headerName: headerNames[k] })),
    rows,
  });
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

function isDividerRow(line: string): boolean {
  if (!TABLE_ROW.test(line)) return false;
  return splitRow(line).every((c) => TABLE_DIVIDER_CELL.test(c));
}

function uniqueFields(headers: string[]): string[] {
  const seen = new Set<string>();
  return headers.map((h, k) => {
    let field = h.toLowerCase().replace(/[^a-z0-9%]+/g, '_').replace(/^_+|_+$/g, '') || `col_${k + 1}`;
    while (seen.has(field)) field = `${field}_${k + 1}`;
    seen.add(field);
    return field;
  });
}

function cellValue(raw: string): unknown {
  const cell = raw.replace(/\*\*|`/g, '').trim();
  if (/^(true|false)$/i.test(cell)) return cell.toLowerCase() === 'true';
  if (NUMERIC_CELL.test(cell)) return Number(cell.replace(/[$,%]/g, ''));
  return cell;
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
