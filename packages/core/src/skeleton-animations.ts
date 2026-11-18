import type { AnimationBinding, AnimationFactory } from './animations.js';
import { brand } from './internal/binding.js';
export interface PulseOptions {
  readonly periodMs: number;
}
export interface DissolveOptions {
  readonly duration: number;
  readonly fallPx: number;
}

import { dissolveDefinition, pulseDefinition } from './internal/defaults.js';
export const pulse: AnimationFactory<'skeleton', 'idle', PulseOptions> = (
  options = {},
) => {
  if (
    Object.keys(options).some((k) => k !== 'periodMs') ||
    (options.periodMs !== undefined && !Number.isFinite(options.periodMs))
  )
    throw new TypeError('Invalid pulse options');
  return Object.freeze({
    contractVersion: 1,
    id: 'dotquilt/pulse',
    family: 'skeleton',
    phase: 'idle',
    options: Object.freeze({
      periodMs: Math.max(800, Math.min(4000, options.periodMs ?? 1600)),
    }),
    [brand]: pulseDefinition,
  }) as unknown as AnimationBinding<'skeleton', 'idle', PulseOptions>;
};
export const dissolve: AnimationFactory<
  'skeleton',
  'handoff',
  DissolveOptions
> = (options = {}) => {
  if (
    Object.keys(options).some((k) => k !== 'duration' && k !== 'fallPx') ||
    (options.fallPx !== undefined && !Number.isFinite(options.fallPx)) ||
    (options.duration !== undefined &&
      (!Number.isFinite(options.duration) || options.duration < 0))
  )
    throw new TypeError('Invalid dissolve options');
  return Object.freeze({
    contractVersion: 1,
    id: 'dotquilt/dissolve',
    family: 'skeleton',
    phase: 'handoff',
    options: Object.freeze({
      duration: options.duration ?? 300,
      fallPx: Math.max(0, Math.min(8, options.fallPx ?? 5)),
    }),
    [brand]: dissolveDefinition,
  }) as unknown as AnimationBinding<'skeleton', 'handoff', DissolveOptions>;
};
