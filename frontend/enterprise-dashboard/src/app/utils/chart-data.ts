import type { GridState } from '../models/grid-data';
import { isNumeric, isPercentColumn } from './number-format';

export interface ChartView {
  key: string;
  kind: 'measure' | 'count';
  field: string;
  label: string;
  title: string;
  percent: boolean;
}

export interface ChartBar {
  label: string;
  value: number;
  alert: boolean;
}

export interface ChartModel {
  views: ChartView[];
  defaultKey: string;
  labelField: string | null;
  alertField: string | null;
  alertLabel: string | null;
}

interface ColumnInfo {
  field: string;
  header: string;
  values: unknown[];
}

const ID_FIELD = /(^id$|_id$|^year$)/i;
const SKIP_DIMENSION = /(_at$|date|time|version)/i;
const ALERT_FIELD = /(alert|flag|breach|overrun)/i;
const PRIORITY_DIMENSION = /(severity|status|priority|stage|level)/i;
const MAX_CATEGORIES = 12;
const MAX_TEXT_LENGTH = 40;

export function buildChartModel(grid: GridState | null): ChartModel | null {
  if (!grid?.rowData.length) return null;
  const rows = grid.rowData;

  const columns: ColumnInfo[] = grid.columnDefs
    .filter((c): c is typeof c & { field: string } => typeof c.field === 'string')
    .map((c) => ({
      field: c.field,
      header: c.headerName ?? c.field,
      values: rows.map((r) => r[c.field]).filter((v) => v !== null && v !== undefined && v !== ''),
    }))
    .filter((c) => c.values.length > 0);

  const measures = columns.filter((c) => !ID_FIELD.test(c.field) && c.values.every(isNumeric));
  const booleans = columns.filter((c) => c.values.every((v) => typeof v === 'boolean'));
  const texts = columns.filter((c) => !measures.includes(c) && !booleans.includes(c));

  const labelColumn =
    texts.find(
      (c) => !SKIP_DIMENSION.test(c.field) && new Set(c.values.map(String)).size >= rows.length * 0.8,
    ) ?? null;
  const alertColumn =
    booleans.find((c) => ALERT_FIELD.test(c.field) || ALERT_FIELD.test(c.header)) ?? null;

  const dimensions = [...texts, ...booleans]
    .filter((c) => {
      if (c === labelColumn || SKIP_DIMENSION.test(c.field)) return false;
      const distinct = new Set(c.values.map(String)).size;
      return (
        distinct >= 2 &&
        distinct <= MAX_CATEGORIES &&
        distinct < c.values.length &&
        averageLength(c.values) <= MAX_TEXT_LENGTH
      );
    })
    .sort((a, b) => priority(b) - priority(a));

  const views: ChartView[] = [];
  if (labelColumn) {
    for (const m of measures) {
      views.push({
        key: `m:${m.field}`,
        kind: 'measure',
        field: m.field,
        label: m.header,
        title: `${m.header} by ${labelColumn.header}`,
        percent: isPercentColumn(m.field, m.header),
      });
    }
  }
  for (const d of dimensions) {
    views.push({
      key: `c:${d.field}`,
      kind: 'count',
      field: d.field,
      label: `By ${d.header}`,
      title: `Count by ${d.header}`,
      percent: false,
    });
  }
  if (!views.length) return null;

  const preferred = alertColumn ? views.find((v) => v.kind === 'measure' && v.percent) : undefined;
  return {
    views,
    defaultKey: (preferred ?? views[0]).key,
    labelField: labelColumn?.field ?? null,
    alertField: alertColumn?.field ?? null,
    alertLabel: alertColumn?.header ?? null,
  };
}

export function chartBars(grid: GridState, model: ChartModel, view: ChartView): ChartBar[] {
  if (view.kind === 'count') {
    const counts = new Map<string, number>();
    for (const row of grid.rowData) {
      const raw = row[view.field];
      if (raw === null || raw === undefined || raw === '') continue;
      const label = formatCategory(raw);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts]
      .map(([label, value]) => ({ label, value, alert: false }))
      .sort((a, b) => b.value - a.value);
  }

  const labelField = model.labelField;
  const alertField = model.alertField;
  return grid.rowData
    .filter((row) => isNumeric(row[view.field]))
    .map((row) => ({
      label: labelField ? String(row[labelField] ?? '') : '',
      value: Number(row[view.field]),
      alert: alertField ? row[alertField] === true : false,
    }))
    .sort((a, b) => b.value - a.value);
}

function formatCategory(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function averageLength(values: unknown[]): number {
  return values.reduce<number>((sum, v) => sum + String(v).length, 0) / values.length;
}

function priority(c: ColumnInfo): number {
  return PRIORITY_DIMENSION.test(c.field) || PRIORITY_DIMENSION.test(c.header) ? 1 : 0;
}
