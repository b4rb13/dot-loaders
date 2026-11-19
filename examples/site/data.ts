// Shared by the docs examples and the live previews, so both draw the same.
import type { Point } from '@dotquilt-internal/core/chart';
import type { TableColumn } from '@dotquilt-internal/core/table';

/** Monthly revenue, in thousands. */
export const revenue: readonly number[] = [32, 41, 38, 52, 47, 61, 58, 72];

/** Each value's place in a chart `width` × `height`, with headroom on top. */
export function linePoints(
  values: readonly number[],
  width: number,
  height: number,
): Point[] {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

/** An SVG path through the same points. */
export function linePath(
  values: readonly number[],
  width: number,
  height: number,
): string {
  return linePoints(values, width, height)
    .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

export interface Invoice {
  customer: string;
  amount: string;
  status: string;
  due: string;
}

export const invoices: readonly Invoice[] = [
  { customer: 'Northwind', amount: '$4,200', status: 'Paid', due: 'Nov 2' },
  { customer: 'Acme Labs', amount: '$1,870', status: 'Open', due: 'Nov 14' },
  { customer: 'Globex', amount: '$9,640', status: 'Overdue', due: 'Oct 28' },
  { customer: 'Initech', amount: '$3,115', status: 'Paid', due: 'Nov 20' },
];

/** The placeholder's columns: what each column holds, and its share of the width. */
export const invoiceColumns: readonly TableColumn[] = [
  { kind: 'text', width: 2 },
  { kind: 'number' },
  { kind: 'badge' },
  { kind: 'date' },
];
