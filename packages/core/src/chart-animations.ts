import { morphFactory, ridgeFactory } from './internal/chart-definitions.js';
import { chartIdle } from './internal/chart-idle.js';

export type { MorphWipeOptions } from './internal/chart-definitions.js';
export interface RidgeOptions {
  readonly amplitude: number;
  readonly highlightWidth: number;
}
export interface ScanOptions {
  readonly amplitude: number;
  readonly bandWidth: number;
  readonly trail: number;
}
export interface TerrainOptions {
  readonly amplitude: number;
  readonly relief: number;
}
export interface BarsOptions {
  readonly sway: number;
}
export interface ScatterOptions {
  readonly radius: number;
  readonly spread: number;
  readonly sway: number;
}
export interface CycleOptions {
  readonly holdMs: number;
  readonly blendMs: number;
}
export const ridge = ridgeFactory;
export const scan = /* @__PURE__ */ chartIdle<ScanOptions>('scan', {
  amplitude: [0.24, 0, 0.4],
  bandWidth: [36, 12, 80],
  trail: [160, 40, 240],
});
export const terrain = /* @__PURE__ */ chartIdle<TerrainOptions>('terrain', {
  amplitude: [0.24, 0, 0.4],
  relief: [1, 0.4, 1.4],
});
export const bars = /* @__PURE__ */ chartIdle<BarsOptions>('bars', {
  sway: [0.07, 0, 0.12],
});
export const scatter = /* @__PURE__ */ chartIdle<ScatterOptions>('scatter', {
  radius: [13, 6, 24],
  spread: [0.24, 0.1, 0.35],
  sway: [0.045, 0, 0.1],
});
export const cycle = /* @__PURE__ */ chartIdle<CycleOptions>('cycle', {
  holdMs: [3200, 800, 3200],
  blendMs: [460, 200, 600],
});
export const morphWipe = morphFactory;
