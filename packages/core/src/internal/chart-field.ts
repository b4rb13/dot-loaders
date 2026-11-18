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

export function chartPainter(configure?: ChartShader): IdlePaint {
  return (rawSurface, rawOptions, timeMs, still, dot) => {
    const surface = rawSurface as AnimationSurface<'chart'>,
      options = rawOptions as Readonly<Record<string, number>>;
    const w = surface.width,
      h = Math.max(0, surface.height - 25),
      t = still ? 0 : timeMs / 1000;
    const { pitch = 6, scale = 1 } =
      (Reflect.get(surface, chartAppearance) as Appearance | undefined) ?? {};
    if (Math.ceil(w / pitch) * Math.ceil(h / pitch) > 4096)
      throw new TypeError();
    const hx = ((t * 72) % (w + 220)) - 110,
      shader = configure?.(options, timeMs, still, w, h, t);
    // Scratch belongs to this invocation: nested paints cannot overwrite it.
    const base: ChartStyle = [0, 0, 0, 0];
    for (let x = 6; x < w; x += pitch) {
      const ridge = shader
          ? shader[0](x)
          : ridgeHeight(x / w, h, t, options.amplitude as number),
        bright = Math.exp(-(((x - hx) / (options.highlightWidth ?? 90)) ** 2));
      for (let y = 8; y < h; y += pitch) {
        const distance = y - ridge,
          c = Math.exp(-((distance / 8) ** 2)),
          below = distance > 0 ? clamp(1 - distance / (h * 0.68)) : 0,
          n = noise(x + y * 0.7, t);
        base[0] =
          0.055 + below * (0.13 + 0.12 * n) + c * (0.54 + 0.22 * bright);
        base[1] = 1.5 + c * (1.6 + 0.6 * bright);
        base[2] = -2 * c;
        base[3] = Number(c > 0.5 && bright > 0.3);
        const value = shader ? shader[1](x, base, c, n, distance) : base;
        dot({
          x,
          y: y + value[2],
          size: value[1] * scale,
          opacity: value[0],
          tone: value[3] ? 'accent' : 'base',
        });
      }
    }
  };
}
