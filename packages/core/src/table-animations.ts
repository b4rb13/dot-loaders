import {
  rowsFactory,
  shimmerFactory,
  typeOnFactory,
} from './internal/table-definitions.js';
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
export const tableShimmer = shimmerFactory;
export const rows = rowsFactory;
