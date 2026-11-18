import {
  rowsFactory,
  tableIdle,
  typeOnFactory,
} from './internal/table-definitions.js';
import { tableFactory } from './internal/table-factory.js';
export interface TypeOnOptions {
  readonly cadenceMs: number;
  readonly cellStyle:
    | 'auto'
    | 'text'
    | 'number'
    | 'badge'
    | 'date'
    | 'badge-text'
    | 'text-badge';
}
export interface RowsOptions {
  readonly staggerMs: number;
  readonly settlePx: number;
}
export const typeOn = typeOnFactory;
export const tableShimmer = /* @__PURE__ */ tableFactory<'idle', TypeOnOptions>(
  /* @__PURE__ */ tableIdle(true),
  { cadenceMs: [600, 250, 1200] },
  true,
);
export const rows = rowsFactory;
