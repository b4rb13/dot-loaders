import type { AnimationSurface, Dot } from '../animations.js';
import type { TypeOnOptions } from '../table-animations.js';
import type { Appearance } from './chart-appearance.js';
import { peakOpacity, restOpacity } from './marks.js';
import { clamp } from './math.js';
export const tableAppearance: unique symbol = Symbol(
  'dotquilt.table-appearance',
);
/**
 * The table idle (design/SPEC.md). Each cell shows bars of marks, two rows
 * tall, at the resting opacity; the field breathes ±7% every 3.2 s. The
 * default (`shimmer`) keeps the bars still under a teal glow that drifts
 * across every 2.8 s; type-on grows them instead, with an accent caret.
 * Every mark is the same size. Bounded command generation, no per-frame
 * layout or geometry discovery.
 */
export function tableField(
  surface: AnimationSurface<'table'>,
  options: Readonly<TypeOnOptions>,
  time: number,
  still: boolean,
  dot: (d: Dot) => void,
  shimmer = false,
): undefined {
  const appearance = Reflect.get(surface, tableAppearance) as
      | Appearance
      | undefined,
    pitch = appearance?.pitch ?? 9,
    scale = appearance?.scale ?? 2.2;
  const cells = surface.input.cells;
  const area = cells.reduce(
    (n, c) =>
      n + Math.max(0, c.bounds.width) * Math.max(0, c.bounds.height) * 0.35,
    0,
  );
  const step = Math.max(pitch, Math.sqrt(area / 3000));
  let count = 0;
  const t = (time * 600) / options.cadenceMs,
    seconds = time / 1000,
    breath = still ? 1 : 0.93 + 0.07 * Math.sin((2 * Math.PI * seconds) / 3.2),
    glowAt = -0.5 + 2 * (0.5 - 0.5 * Math.cos(Math.PI * ((seconds / 2.8) % 1))),
    fieldWidth = Math.max(1, surface.width),
    fieldHeight = Math.max(1, surface.height);
  for (const cell of cells) {
    const b = cell.bounds,
      phase =
        (((t - cell.rowIndex * 80 - cell.columnIndex * 60) % 1600) + 1600) %
        1600;
    const run =
      still || shimmer
        ? 0.72
        : 0.12 +
          0.74 * (clamp(phase / 600) - clamp((phase - 1150) / 350) * 0.85);
    const available = Math.max(0, b.width - 12),
      barWidth = available * run,
      kind = options.cellStyle === 'auto' ? cell.kind : options.cellStyle;
    // Two rows of marks centred on the cell, like a line placeholder.
    const middle = b.y + b.height / 2;
    const band = (start: number, w: number) => {
      for (
        let x = start + step / 2;
        x < Math.min(b.x + b.width, start + w);
        x += step
      )
        for (const y of [middle - step / 2, middle + step / 2]) {
          if (++count > 4096) return;
          const caret =
            shimmer || still ? 0 : Math.exp(-(((x - start - w) / 9) ** 2));
          dot({
            x,
            y,
            size: scale,
            opacity: restOpacity * breath + caret * 0.3,
            tone: caret > 0.5 ? 'accent' : 'base',
          });
          if (!shimmer || still) continue;
          const d = (x / fieldWidth) * 0.8 + (y / fieldHeight) * 0.2 - glowAt,
            glow = Math.abs(d / 0.2) > 3.2 ? 0 : Math.exp(-((d / 0.2) ** 2));
          if (glow * peakOpacity >= 0.02 && ++count <= 4096)
            dot({
              x,
              y,
              size: scale,
              opacity: glow * peakOpacity,
              tone: 'accent',
            });
        }
    };
    if (kind === 'badge') band(b.x + 4, available * 0.45);
    else if (kind === 'badge-text') {
      const w = Math.min(24, available * 0.22);
      band(b.x + 4, w);
      band(b.x + w + 12, Math.min(barWidth, Math.max(0, available - w - 8)));
    } else if (kind === 'text-badge') {
      const w = Math.min(barWidth, available * 0.58);
      band(b.x + 4, w);
      band(b.x + w + 12, Math.min(24, Math.max(0, available - w - 8)));
    } else if (kind === 'date') {
      for (let g = 0; g < 3; g++)
        band(b.x + 4 + g * available * 0.24, available * 0.17);
    } else
      band(
        kind === 'number' ? b.x + b.width - barWidth - 4 : b.x + 4,
        barWidth,
      );
  }
}
