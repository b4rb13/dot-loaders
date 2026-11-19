import type { AnimationFactory } from '../animations.js';
import { chartFactory } from './chart-factory.js';
import type { ChartStyle } from './chart-field.js';
import { chartPainter } from './chart-field.js';
import { mix, noise, ridgeHeight, smooth } from './chart-math.js';
import { clamp } from './math.js';
import { createRunner } from './runner.js';
import { nativeSurface } from './surface.js';
export type Silhouette =
  | 'ridge'
  | 'scan'
  | 'terrain'
  | 'bars'
  | 'scatter'
  | 'cycle';
const sequence: readonly Silhouette[] = ['ridge', 'bars', 'scatter'];
const crest = (
  x: number,
  w: number,
  h: number,
  t: number,
  kind: Silhouette | undefined,
  a: number,
) => {
  const nx = x / w;
  if (kind === 'bars' || kind === 'scatter') {
    const column = Math.floor(nx * 10);
    return (
      h *
      (0.28 +
        0.25 * noise(column * 71, 0) +
        a * 0.25 * Math.sin(t * 0.8 + column))
    );
  }
  if (kind === 'scan')
    return (
      h *
      (0.48 +
        0.12 * Math.sin(nx * 7 - t) +
        a * 0.55 * Math.sin(nx * 3 + t * 0.4))
    );
  return ridgeHeight(nx, h, t, a);
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
      draw: chartPainter((numeric, timeMs, still, w, h, t) => {
        let a: Silhouette | undefined = kind;
        let b = kind,
          blend = 0;
        if (kind === 'cycle') {
          const hold = numeric.holdMs as number,
            step = hold + (numeric.blendMs as number),
            i = Math.floor(timeMs / step);
          a = sequence[i % 3];
          b = sequence[(i + 1) % 3] ?? 'bars';
          blend = still
            ? 0
            : smooth(((timeMs % step) - hold) / (numeric.blendMs as number));
        }
        // Reuse numeric scratch within this frame, never an emitted dot or caller data.
        const firstStyle: ChartStyle = [0, 0, 0, 0],
          secondStyle: ChartStyle = [0, 0, 0, 0];
        const amplitude = numeric.amplitude ?? (numeric.sway ?? 0.06) * 4,
          sx = w + 80 - ((t * 145) % (w + 180));
        const style = (
          variant: Silhouette | undefined,
          x: number,
          base: import('./chart-field.js').ChartStyle,
          c: number,
          n: number,
          distance: number,
          out: ChartStyle,
        ): import('./chart-field.js').ChartStyle => {
          if (variant === 'scan') {
            const band = Math.exp(
                -(((x - sx) / (numeric.bandWidth as number)) ** 2),
              ),
              trail =
                x > sx ? Math.exp(-(x - sx) / (numeric.trail as number)) : 0;
            return styleValues(
              out,
              0.045 +
                c * (0.2 + 0.6 * Math.max(band, trail * 0.65)) +
                band * 0.1,
              band > 0.3 && c > 0.5,
            );
          }
          if (variant === 'terrain') {
            const land = clamp(0.5 + distance / (h * 0.35));
            return styleValues(
              out,
              // Relief deepens the shaded land below the crest.
              0.08 +
                0.27 * land * (numeric.relief as number) * (0.45 + 0.55 * n) +
                c * 0.45,
              base[3],
            );
          }
          if (variant === 'bars') {
            const cw = w / 10,
              column = clamp(((0.38 - Math.abs((x % cw) / cw - 0.5)) * cw) / 5),
              fill = clamp(distance / 7 + 0.5) * column;
            return styleValues(
              out,
              0.045 + fill * (0.23 + n * 0.16) + c * column * 0.3,
              c * column > 0.6,
            );
          }
          if (variant === 'scatter') {
            // Cycle's schema contains timing only; use Scatter's built-in geometry.
            const cw = w / 10,
              radius = numeric.radius ?? 13,
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
          }
          return base;
        };
        return [
          (x) =>
            mix(
              crest(x, w, h, t, a, amplitude),
              crest(x, w, h, t, b, amplitude),
              blend,
            ),
          (x, base, c, n, distance) => {
            const first = style(a, x, base, c, n, distance, firstStyle),
              second = blend
                ? style(b, x, base, c, n, distance, secondStyle)
                : first;
            // The selected schema has populated and bounded each recipe-specific number.
            for (let i = 0; i < 3; i++)
              first[i] = mix(first[i] as number, second[i] as number, blend);
            return first;
          },
        ];
      }),
    }),
    schema,
  );
}
