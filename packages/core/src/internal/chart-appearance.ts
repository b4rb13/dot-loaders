/** Immutable snapshot metadata, shared by independently evaluated compatible recipes. */
export const chartAppearance: unique symbol = Symbol.for(
  'dotquilt.chart-appearance.v1',
);
export interface Appearance {
  readonly pitch: number;
  readonly scale: number;
}
