/**
 * The first screen's line as the visitor left it: its series and values,
 * edits included. The closing section draws the same line again.
 */
import { type Series, series } from './series';

const first = series[0] as Series;

export const heroLine: {
  series: Series;
  values: number[];
  edited: boolean;
} = { series: first, values: [...first.values], edited: false };
