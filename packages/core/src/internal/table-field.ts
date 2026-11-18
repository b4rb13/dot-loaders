import type { AnimationSurface, Dot } from '../animations.js';
import type { TypeOnOptions } from '../table-animations.js';
import type { Appearance } from './chart-appearance.js';
import { clamp } from './math.js';
export const tableAppearance: unique symbol = Symbol(
  'dotquilt.table-appearance',
);
/** Bounded command generation, no per-frame layout or geometry discovery. */
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
    pitch = appearance?.pitch ?? 6,
    scale = appearance?.scale ?? 1;
  const cells = surface.input.cells;
  const area = cells.reduce(
    (n, c) =>
      n + Math.max(0, c.bounds.width) * Math.max(0, c.bounds.height) * 0.35,
    0,
  );
  const step = Math.max(pitch, Math.sqrt(area / 3000));
  let count = 0;
  const t = (time * 600) / options.cadenceMs;
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
      width = available * run,
      kind = options.cellStyle === 'auto' ? cell.kind : options.cellStyle;
    const band = (start: number, w: number, badge = false) => {
      for (let x = start; x < Math.min(b.x + b.width, start + w); x += step)
        for (
          let y = b.y + b.height * (badge ? 0.29 : 0.4);
          y < b.y + b.height * (badge ? 0.72 : 0.65);
          y += step
        ) {
          if (++count > 4096) return;
          const wave = (Math.sin(x * 0.025 + y * 0.01 - t * 0.003) + 1) * 0.5,
            caret = Math.exp(-(((x - start - w) / 9) ** 2));
          dot({
            x,
            y,
            size: (badge ? 2.1 : 1.7) * scale,
            opacity: still ? 0.28 : 0.2 + wave * 0.23 + caret * 0.25,
            tone: caret > 0.5 && !still ? 'accent' : 'base',
          });
        }
    };
    if (kind === 'badge') band(b.x + 4, available * 0.45, true);
    else if (kind === 'badge-text') {
      const w = Math.min(24, available * 0.22);
      band(b.x + 4, w, true);
      band(b.x + w + 12, Math.min(width, Math.max(0, available - w - 8)));
    } else if (kind === 'text-badge') {
      const w = Math.min(width, available * 0.58);
      band(b.x + 4, w);
      band(b.x + w + 12, Math.min(24, Math.max(0, available - w - 8)), true);
    } else if (kind === 'date') {
      for (let g = 0; g < 3; g++)
        band(b.x + 4 + g * available * 0.24, available * 0.17);
    } else band(kind === 'number' ? b.x + b.width - width - 4 : b.x + 4, width);
  }
}
