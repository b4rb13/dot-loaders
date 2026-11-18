/** Immutable snapshot metadata, shared by independently evaluated compatible recipes. */
export const chartAppearance: unique symbol = Symbol(
  'dotquilt.chart-appearance',
);
export interface Appearance {
  /** Distance between mark centres across. */
  readonly pitch: number;
  /** Distance between rows; dashes have a different pitch down than across. */
  readonly rows: number;
  /** Radius of each painter command. */
  readonly scale: number;
}
