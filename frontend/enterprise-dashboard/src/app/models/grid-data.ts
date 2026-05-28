import type { ColDef } from 'ag-grid-community';

export interface GridColumn {
  field: string;
  headerName?: string;
}

export interface GridPayload {
  columns: GridColumn[];
  rows: Record<string, unknown>[];
}

export interface GridState {
  columnDefs: ColDef[];
  rowData: Record<string, unknown>[];
}
