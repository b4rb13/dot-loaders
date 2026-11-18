import type { AnimationSurface, Dot } from '../animations.js';
import type { ChartInput } from '../chart.js';
import { chartBinding, chartFactory } from './chart-factory.js';
import { chartPainter } from './chart-field.js';
import { mix, smooth } from './chart-math.js';
import { managedPainter } from './dense/managed-painter.js';
import { createDenseRunner as createRunner } from './dense/runner.js';
import { createHandoff } from './handoff.js';
import { handoff } from './marks.js';
import { clamp } from './math.js';
import type { HandoffFrame } from './paint.js';
import { createRevealEffect } from './reveal-effect.js';
import { nativeSurface } from './surface.js';
import { createTargetTracker } from './target-tracker.js';

const geometry = (input: ChartInput) =>
  input.kind === 'bar' ? input.bars : input.points;
export interface MorphWipeOptions {
  readonly morphEnd: number;
  readonly wipeStart: number;
  readonly edge: number;
}
interface Destination {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly opacity: number;
}
const morphDefinition = /* @__PURE__ */ Object.freeze({
  id: 'dotquilt/chart/morph-wipe',
  family: 'chart' as const,
  phase: 'handoff' as const,
  handoff: createHandoff,
  painter: managedPainter,
  snapshot: nativeSurface,
  reveal: createRevealEffect,
  targets: createTargetTracker,
  // design/SPEC.md: the field glides onto the line (~570 ms), then the line
  // draws in (~570 ms).
  duration: (surface: AnimationSurface<'chart'>) =>
    geometry(surface.input).length ? handoff.duration : 150,
  prepare(surface: AnimationSurface<'chart'>) {
    const input = surface.input,
      items = geometry(input),
      columns = input.kind === 'line' ? new Map<number, Dot>() : undefined;
    if (columns)
      for (const d of surface.source) {
        const key = Math.round(d.x),
          old = columns.get(key);
        if (!old || d.opacity > old.opacity) columns.set(key, d);
      }

    return Object.freeze(
      surface.source.map((d, i) => {
        let x = d.x,
          y = d.y,
          size = d.size,
          opacity = d.opacity;
        if (input.kind === 'line' && items.length) {
          // Sample the supplied path in its original order, including descending
          // or vertical segments. No sorting or invented data values.
          const position =
              clamp(d.x / Math.max(1, surface.width)) * (items.length - 1),
            cursor = Math.floor(position),
            a = items[cursor],
            b = items[Math.min(cursor + 1, items.length - 1)];
          if (a && b) {
            const target = mix(a.y, b.y, position - cursor),
              crest = columns?.get(Math.round(d.x))?.y ?? d.y;
            x = mix(a.x, b.x, position - cursor);
            y = d.y + target - crest;
            if (Math.abs(y - target) < 5.5) {
              y = target;
              opacity = 0.95;
            } else if (y > target && y < input.baseline) {
              opacity =
                0.05 +
                clamp(1 - (y - target) / Math.max(1, input.baseline - target)) *
                  0.22;
            } else opacity *= 0.03;
          }
        } else if (input.kind === 'bar' && input.bars.length) {
          const bar =
            input.bars[
              Math.min(
                input.bars.length - 1,
                Math.floor(
                  (d.x / Math.max(1, surface.width)) * input.bars.length,
                ),
              )
            ];
          if (bar) {
            x =
              bar.x +
              clamp(
                ((d.x / Math.max(1, surface.width)) * input.bars.length) % 1,
              ) *
                bar.width;
            y = bar.y + clamp(d.y / Math.max(1, surface.height)) * bar.height;
            opacity =
              0.18 + 0.6 * (1 - clamp(d.y / Math.max(1, surface.height)));
          }
        } else if (input.kind === 'scatter' && items.length) {
          const point = items[i % items.length];
          if (point) {
            x = point.x;
            y = point.y;
            opacity = i < items.length ? 0.85 : 0;
          }
        }
        return Object.freeze({ x, y, size, opacity });
      }),
    );
  },
  draw({
    surface,
    options,
    prepared,
    progress: p,
    dot,
    reveal,
  }: HandoffFrame<
    'chart',
    MorphWipeOptions,
    readonly Destination[]
  >): undefined {
    if (!geometry(surface.input).length) {
      const q = smooth(p);
      for (const d of surface.source)
        dot({ ...d, opacity: d.opacity * (1 - q) });
      reveal({ opacity: q });
      return;
    }
    const front = smooth((p - options.wipeStart) / (1 - options.wipeStart));
    reveal({ opacity: 1, clipStart: front });
    for (let i = 0; i < surface.source.length; i++) {
      const d = surface.source[i],
        end = prepared[i];
      if (!d || !end) continue;
      const nx = d.x / Math.max(1, surface.width),
        q = smooth((p - nx * 0.35) / Math.max(0.1, options.morphEnd - 0.35)),
        x = mix(d.x, end.x, q),
        leave =
          p >= 1
            ? 0
            : front <= 0
              ? 1
              : clamp(
                  (x - front * surface.width + options.edge) / options.edge,
                );
      dot({
        x,
        y: mix(d.y, end.y, q),
        size: mix(d.size, end.size, q),
        opacity: mix(d.opacity, end.opacity, q) * leave,
        tone: q > 0.3 ? 'accent' : d.tone,
      });
    }
  },
});
export const morphFactory = /* @__PURE__ */ chartFactory<
  'handoff',
  MorphWipeOptions
>(morphDefinition, {
  morphEnd: [0.55, 0.55, 0.95],
  wipeStart: [0.48, 0.15, 0.6],
  edge: [40, 4, 80],
});
// The default Ridge entry retains only its own silhouette. Optional recipes use
// the same painter/scheduler but do not become hidden default dependencies.
const ridgeDefinition = /* @__PURE__ */ Object.freeze({
  id: 'dotquilt/chart/ridge',
  family: 'chart' as const,
  phase: 'idle' as const,
  runner: createRunner,
  snapshot: nativeSurface,
  draw: /* @__PURE__ */ chartPainter(),
});
export const ridgeFactory = /* @__PURE__ */ chartFactory<
  'idle',
  { amplitude: number; highlightWidth: number }
>(ridgeDefinition, {
  amplitude: [0.24, 0, 0.4],
  highlightWidth: [90, 20, 180],
});
export const defaultRidge = /* @__PURE__ */ chartBinding(ridgeDefinition, {
  amplitude: 0.24,
  highlightWidth: 90,
});
export const defaultMorphWipe = /* @__PURE__ */ chartBinding(morphDefinition, {
  morphEnd: 0.55,
  wipeStart: 0.48,
  edge: 40,
});
