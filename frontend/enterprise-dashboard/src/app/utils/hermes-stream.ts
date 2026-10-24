import type { GridPayload, GridState } from '../models/grid-data';
import { gridFromPayload } from './grid-parser';

export type HermesStreamEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_start'; label: string }
  | { kind: 'tool_result'; grid: GridState | null }
  | { kind: 'failed'; message: string }
  | { kind: 'ignore' };

interface ResponseItem {
  type?: string;
  name?: string;
  output?: { text?: string }[] | string;
}

interface ResponseEventPayload {
  type?: string;
  delta?: string;
  item?: ResponseItem;
  response?: { error?: { message?: string } };
}

const SERVER_PREFIX = /^mcp_(business_data|company_knowledge)_/;

export function readResponseEvent(payload: ResponseEventPayload): HermesStreamEvent {
  switch (payload.type) {
    case 'response.output_text.delta':
      return payload.delta ? { kind: 'text', delta: payload.delta } : { kind: 'ignore' };
    case 'response.output_item.added': {
      const item = payload.item;
      if (item?.type === 'function_call') {
        return { kind: 'tool_start', label: toolLabel(item.name ?? '') };
      }
      if (item?.type === 'function_call_output') {
        return { kind: 'tool_result', grid: gridFromToolOutput(outputText(item.output)) };
      }
      return { kind: 'ignore' };
    }
    case 'response.failed':
      return {
        kind: 'failed',
        message: payload.response?.error?.message ?? 'Hermes could not complete the request',
      };
    default:
      return { kind: 'ignore' };
  }
}

export function gridFromToolOutput(text: string): GridState | null {
  let value: unknown = text;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
      continue;
    }
    if (!value || typeof value !== 'object') return null;
    const record = value as { grid?: GridPayload; result?: unknown };
    if (record.grid) return gridFromPayload(record.grid);
    if (record.result === undefined) return null;
    value = record.result;
  }
  return null;
}

export function mergeToolGrids(previous: GridState | null, next: GridState): GridState {
  if (!previous || columnKey(previous) !== columnKey(next)) return next;
  const seen = new Set(previous.rowData.map((row) => JSON.stringify(row)));
  const added = next.rowData.filter((row) => !seen.has(JSON.stringify(row)));
  return { columnDefs: previous.columnDefs, rowData: [...previous.rowData, ...added] };
}

function columnKey(grid: GridState): string {
  return grid.columnDefs.map((c) => c.field).join('|');
}

export function toolLabel(name: string): string {
  return name.replace(SERVER_PREFIX, '').replace(/^mcp_/, '').replace(/_/g, ' ').trim() || 'tool';
}

function outputText(output: ResponseItem['output']): string {
  if (typeof output === 'string') return output;
  return (output ?? []).map((part) => part.text ?? '').join('');
}
