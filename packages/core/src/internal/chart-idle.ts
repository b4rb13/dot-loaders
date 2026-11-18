import type { AnimationFactory } from '../animations.js';
import { chartFactory } from './chart-factory.js';
import type { ChartStyle } from './chart-field.js';
import { chartPainter } from './chart-field.js';
import { noise } from './chart-math.js';
import { clamp } from './math.js';
import { createRunner } from './runner.js';
import { nativeSurface } from './surface.js';
/** The chart idles beyond the default ridge: silhouettes for bar and scatter charts. */
export type Silhouette = 'bars' | 'scatter';
const crest = (x: number, w: number, h: number, t: number, a: number) => {
  const column = Math.floor((x / w) * 10);
  return (
    h *
    (0.28 +
      0.25 * noise(column * 71, 0) +
      a * 0.25 * Math.sin(t * 0.8 + column))
  );
};

function styleValues(
  out: ChartStyle,
  opacity: number,
  accent: number | boolean,
): ChartStyle {
  // Every mark is the same size (design/SPEC.md); shape comes from opacity.
  out[0] = opacity;
  out[1] = 1;
  out[2] = 0;
  out[3] = Number(accent);
  return out;
}

export function chartIdle<O extends object>(
  kind: Silhouette,
  schema: Record<keyof O, readonly [number, number, number]>,
): AnimationFactory<'chart', 'idle', O> {
  return chartFactory(
    Object.freeze({
      id: `dotquilt/chart/${kind}`,
      family: 'chart',
      phase: 'idle',
      runner: createRunner,
      snapshot: nativeSurface,
      draw: chartPainter((numeric, _timeMs, _still, w, h, t) => {
        // Reuse numeric scratch within this frame, never an emitted dot or caller data.
        const out: ChartStyle = [0, 0, 0, 0];
        const amplitude = (numeric.sway ?? 0.06) * 4;
        return [
          (x) => crest(x, w, h, t, amplitude),
          (x, _base, c, n, distance) => {
            const cw = w / 10;
            if (kind === 'bars') {
              const column = clamp(
                  ((0.38 - Math.abs((x % cw) / cw - 0.5)) * cw) / 5,
                ),
                fill = clamp(distance / 7 + 0.5) * column;
              return styleValues(
                out,
                0.045 + fill * (0.23 + n * 0.16) + c * column * 0.3,
                c * column > 0.6,
              );
            }
            const radius = numeric.radius ?? 13,
              spread = numeric.spread ?? 0.24,
              dx = (x % cw) - cw / 2,
              spot = Math.exp(-(dx * dx + distance * distance) / radius ** 2),
              satellite = Math.exp(
                -(dx * dx + (distance - h * spread) ** 2) / 85,
              );
            return styleValues(
              out,
              0.04 + spot * 0.75 + satellite * 0.3,
              spot > 0.65,
            );
          },
        ];
      }),
    }),
    schema,
  );
}
