/** Immutable snapshot metadata, shared by independently evaluated compatible recipes. */
export const chartAppearance: unique symbol = Symbol(
  'dotquilt.chart-appearance',
);
export interface Appearance {
  readonly pitch: number;
  readonly scale: number;
}
