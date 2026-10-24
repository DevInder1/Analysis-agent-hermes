const PERCENT_COLUMN = /(%|pct|percent)/i;
const NUMERIC_TEXT = /^-?\d+(\.\d+)?$/;

const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && NUMERIC_TEXT.test(value.trim());
}

export function isPercentColumn(field: string, header?: string): boolean {
  return PERCENT_COLUMN.test(field) || PERCENT_COLUMN.test(header ?? '');
}

export function formatNumber(value: number, percent = false): string {
  return percent ? `${full.format(value)}%` : full.format(value);
}

export function formatCompact(value: number, percent = false): string {
  return percent ? `${full.format(value)}%` : compact.format(value);
}
