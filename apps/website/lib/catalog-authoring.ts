import {
  type AnimationFamily,
  type DrawContext,
  defineAnimation,
  definePreset,
} from '@dotquilt-internal/core/animations';
import { morphWipe, scan } from '@dotquilt-internal/core/animations/chart';
import { dissolve, pulse } from '@dotquilt-internal/core/animations/skeleton';
import { rows, tableShimmer } from '@dotquilt-internal/core/animations/table';
import {
  printText,
  scrambleWords,
} from '@dotquilt-internal/core/animations/text';
import type { CustomIdleOptions, CustomRevealOptions } from './catalog-options';

function finite(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new TypeError('Invalid example animation option');
  return value;
}
function known(value: object, keys: readonly string[]) {
  if (
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new TypeError('Unknown example animation option');
}
function drawIdle<F extends AnimationFamily>(
  { surface, frame, dot }: DrawContext<F>,
  options: Readonly<CustomIdleOptions>,
): undefined {
  const opacity = frame.static
    ? 1
    : options.minimumOpacity +
      (1 - options.minimumOpacity) *
        (0.5 + 0.5 * Math.cos((2 * Math.PI * frame.timeMs) / options.periodMs));
  for (const source of surface.source)
    dot({ ...source, opacity: source.opacity * opacity });
}
function idle<F extends Exclude<AnimationFamily, 'region'>>(family: F) {
  return defineAnimation<F, CustomIdleOptions>({
    contractVersion: 1,
    id: `examples/${family}/breathe`,
    family,
    phase: 'idle',
    options: {
      parse(value) {
        known(value, ['periodMs', 'minimumOpacity']);
        return {
          periodMs: finite(value.periodMs, 1800, 800, 4000),
          minimumOpacity: finite(value.minimumOpacity, 0.35, 0.2, 1),
        };
      },
    },
    frame: drawIdle,
    still: drawIdle,
  });
}
function handoff<F extends AnimationFamily>(family: F) {
  return defineAnimation<F, CustomRevealOptions, readonly string[]>({
    contractVersion: 1,
    id: `examples/${family}/soft-reveal`,
    family,
    phase: 'handoff',
    options: {
      parse(value) {
        known(value, ['duration', 'liftPx']);
        return {
          duration: finite(value.duration, 450, 0, 2000),
          liftPx: finite(value.liftPx, 3, 0, 8),
        };
      },
    },
    duration(_surface, options) {
      return options.duration;
    },
    prepare(surface) {
      return [...surface.revealTargetIds];
    },
    frame({ surface, frame, prepared, dot, reveal, revealTarget }, options) {
      for (const source of surface.source)
        dot({ ...source, opacity: source.opacity * (1 - frame.progress) });
      // Registered row targets receive translation; the wrapper only fades.
      // This avoids applying the same translation to a target and its ancestor.
      reveal({
        opacity: prepared.length ? 1 : frame.progress,
        ...(!prepared.length
          ? { translateY: options.liftPx * (1 - frame.progress) }
          : {}),
      });
      for (const id of prepared)
        revealTarget(id, {
          opacity: frame.progress,
          translateY: options.liftPx * (1 - frame.progress),
        });
    },
  });
}
// Factories run synchronously on the engine's clock. No DOM, timers, RAF or requests.
export const customAnimations = {
  text: { idle: idle('text'), handoff: handoff('text') },
  chart: { idle: idle('chart'), handoff: handoff('chart') },
  table: { idle: idle('table'), handoff: handoff('table') },
  skeleton: { idle: idle('skeleton'), handoff: handoff('skeleton') },
  region: { handoff: handoff('region') },
} as const;
// Local immutable configuration: no readiness, content, geometry providers or styles.
export const localPresets = {
  text: definePreset({
    kind: 'text',
    speed: 0.5,
    animations: {
      idle: scrambleWords({ changesPerSecond: 1.2 }),
      handoff: printText({ staggerMs: 16 }),
    },
  }),
  chart: definePreset({
    kind: 'chart',
    speed: 0.5,
    animations: {
      idle: scan({ amplitude: 0.18 }),
      handoff: morphWipe({ edge: 24 }),
    },
  }),
  table: definePreset({
    kind: 'table',
    speed: 0.5,
    animations: {
      idle: tableShimmer({ cadenceMs: 800 }),
      handoff: rows({ staggerMs: 20, settlePx: 2 }),
    },
  }),
  skeleton: definePreset({
    kind: 'skeleton',
    speed: 0.5,
    animations: {
      idle: pulse({ periodMs: 2200 }),
      handoff: dissolve({ duration: 400, fallPx: 2 }),
    },
  }),
  region: definePreset({
    kind: 'region',
    animations: {
      handoff: customAnimations.region.handoff({ duration: 600, liftPx: 2 }),
    },
  }),
  typing: definePreset({ kind: 'typing', speed: 0.5, count: 3 }),
} as const;
