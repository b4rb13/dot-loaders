import type { AnimationSurface } from '../animations.js';
import { type Appearance, chartAppearance } from './chart-appearance.js';
import { noise, ridgeHeight } from './chart-math.js';
import { clamp } from './math.js';
import type { IdlePaint } from './paint.js';
export type ChartStyle = [
  opacity: number,
  size: number,
  lift: number,
  accent: number,
];
export type ChartShader = (
  options: Readonly<Record<string, number>>,
  timeMs: number,
  still: boolean,
  w: number,
  h: number,
  t: number,
) => readonly [
  crest: (x: number) => number,
  style: (
    x: number,
    base: ChartStyle,
    c: number,
    n: number,
    distance: number,
  ) => ChartStyle,
];

/**
 * The chart idle (design/SPEC.md): a faint field of marks with a soft ridge
 * line and a shaded area under it. The ridge drifts slowly, the field
 * breathes ±7% every 3.2 s, and a teal glow drifts across every 2.8 s; the
 * glow is drawn as accent marks over the resting ones. Every mark is the same
 * size; the grid starts half a pitch in, like the CSS dot grid.
 */
export function chartPainter(configure?: ChartShader): IdlePaint {
  return ({ surface: rawSurface, options: rawOptions, timeMs, still, dot }) => {
    const surface = rawSurface as AnimationSurface<'chart'>,
      options = rawOptions as Readonly<Record<string, number>>;
    const w = surface.width,
      full = surface.height,
      h = Math.max(0, full - 25),
      t = still ? 0 : timeMs / 1000;
    const {
      pitch = 9,
      rows = pitch,
      scale = 2.2,
    } = (Reflect.get(surface, chartAppearance) as Appearance | undefined) ?? {};
    if (Math.ceil(w / pitch) * Math.ceil(full / rows) > 4096)
      throw new TypeError();
    const shader = configure?.(options, timeMs, still, w, h, t);
    const amplitude = (options.amplitude as number | undefined) ?? 0.24,
      sigma =
        0.2 * (((options.highlightWidth as number | undefined) ?? 90) / 90),
      breath = still ? 1 : 0.93 + 0.07 * Math.sin((2 * Math.PI * t) / 3.2),
      glowAt = -0.5 + 2 * sineInOut((t / 2.8) % 1),
      band = rows * 1.45;
    // Scratch belongs to this invocation: nested paints cannot overwrite it.
    const base: ChartStyle = [0, 0, 0, 0];
    let count = 0;
    for (let x = pitch / 2; x < w; x += pitch) {
      const u = x / Math.max(1, w),
        ridge = shader ? shader[0](x) : ridgeHeight(u, h, t, amplitude);
      for (let y = rows / 2; y < full; y += rows) {
        const distance = y - ridge,
          c = Math.exp(-((distance / band) ** 2)),
          area = distance > 0 && y < h ? 0.26 : 0,
          v = Math.max(c, area),
          // Only custom variants read the noise term.
          n = shader ? noise(x + y * 0.7, t) : 0;
        base[0] = (0.05 + (0.63 - 0.05) * v) * breath;
        base[1] = 1;
        base[2] = 0;
        base[3] = 0;
        const value = shader ? shader[1](x, base, c, n, distance) : base;
        if (value[0] >= 0.012 && ++count <= 4096)
          dot({
            x,
            y: y + value[2],
            size: value[1] * scale,
            opacity: clamp(value[0]),
            tone: value[3] ? 'accent' : 'base',
          });
        if (still || v < 0.02) continue;
        const d = (u * 0.8 + (y / Math.max(1, full)) * 0.2 - glowAt) / sigma;
        if (d < -3.2 || d > 3.2) continue;
        const glow = Math.exp(-d * d) * 0.9 * v;
        if (glow >= 0.02 && ++count <= 4096)
          dot({
            x,
            y: y + value[2],
            size: value[1] * scale,
            opacity: glow,
            tone: 'accent',
          });
      }
    }
  };
}

/** Sine in-out, the curve the spec gives marks and the idle glow. */
function sineInOut(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * p);
}
