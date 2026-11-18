import { morphFactory, ridgeFactory } from './internal/chart-definitions.js';
import { chartIdle } from './internal/chart-idle.js';

export type { MorphWipeOptions } from './internal/chart-definitions.js';
export interface RidgeOptions {
  readonly amplitude: number;
  readonly highlightWidth: number;
}
export interface BarsOptions {
  readonly sway: number;
}
export interface ScatterOptions {
  readonly radius: number;
  readonly spread: number;
  readonly sway: number;
}
export const ridge = ridgeFactory;
export const bars = /* @__PURE__ */ chartIdle<BarsOptions>('bars', {
  sway: [0.07, 0, 0.12],
});
export const scatter = /* @__PURE__ */ chartIdle<ScatterOptions>('scatter', {
  radius: [13, 6, 24],
  spread: [0.24, 0.1, 0.35],
  sway: [0.045, 0, 0.1],
});
export const morphWipe = morphFactory;
