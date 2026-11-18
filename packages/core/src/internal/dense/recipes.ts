import type { Dot, RevealFrame } from '../../animations.js';
import type { GlyphCell, Point, Projection } from './projection.js';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const p = clamp(v);
  return p * p * (3 - 2 * p);
};
const glyphs: Record<string, readonly string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};
function glyphPoints(cells: readonly GlyphCell[]): Point[] | null {
  const points: Point[] = [];
  for (const cell of cells) {
    const bitmap = glyphs[cell.character];
    if (!bitmap) return null;
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 5; x++)
        if (bitmap[y]?.[x] === '1')
          points.push({
            x: cell.bounds.x + ((x + 0.5) * cell.bounds.width) / 5,
            y: cell.bounds.y + ((y + 0.5) * cell.bounds.height) / 7,
          });
    if (points.length > 4096) return null;
  }
  return points;
}
/** Deterministic representative recipes, not the complete M4 motion catalog. */
export function prepareRecipe(
  projection: Projection,
  width: number,
  height: number,
) {
  const source: readonly Dot[] = Object.freeze(
    Array.from({ length: 360 }, (_, i) =>
      Object.freeze({
        x: (((i % 30) + 0.5) * width) / 30,
        y: ((Math.floor(i / 30) + 0.5) * height) / 12,
        size: 1.3,
        opacity: 0.3,
        tone: 'base' as const,
      }),
    ),
  );
  let target: readonly Point[] | null = null;
  if (projection.family === 'text')
    target = projection.precise ? glyphPoints(projection.value) : null;
  if (projection.family === 'table')
    target = glyphPoints(projection.cells.flatMap((c) => c.glyphs));
  const linePoint = (
    points: readonly Point[],
    column: number,
  ): Point | undefined => {
    const position = (column / 29) * Math.max(0, points.length - 1);
    const a = points[Math.floor(position)],
      b = points[Math.ceil(position)];
    if (!a || !b) return undefined;
    const t = position - Math.floor(position);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  // Projection geometry is immutable for this preparation; only interpolation changes per frame.
  const chart = projection.family === 'chart' ? projection.input : undefined;
  const line =
    chart?.kind === 'line'
      ? Array.from({ length: 30 }, (_, i) => linePoint(chart.points, i))
      : undefined;
  const destinations = source.map((p, i) => {
    if (!chart) return target?.length ? target[i % target.length] : p;
    const input = chart;
    if (input.kind === 'line') return line?.[i % 30] ?? p;
    if (input.kind === 'scatter')
      return input.points[i % Math.max(1, input.points.length)] ?? p;
    const bar = input.bars[i % Math.max(1, input.bars.length)];
    return bar
      ? {
          x: bar.x + (((i % 5) + 0.5) * bar.width) / 5,
          y: bar.y + (((i % 7) + 0.5) * bar.height) / 7,
        }
      : p;
  });
  return {
    source,
    idle(timeMs: number, dot: (value: Dot) => void, still = false) {
      const columns = new Float64Array(60);
      for (let column = 0; column < 30; column++) {
        const x = source[column]?.x ?? 0;
        columns[column * 2] = still ? 0 : Math.sin(timeMs / 700 + x / 45);
        columns[column * 2 + 1] = still
          ? 0.25
          : 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(x / 50 - timeMs / 600));
      }
      const accent = Math.floor(timeMs / 100) % 30;
      for (let i = 0; i < source.length; i++) {
        const p = source[i];
        if (!p) continue;
        const column = i % 30;
        dot({
          x: p.x,
          y:
            projection.family === 'chart'
              ? p.y + (columns[column * 2] ?? 0) * 6
              : p.y,
          size: p.size,
          opacity: columns[column * 2 + 1] ?? 0,
          tone: !still && column === accent ? 'accent' : 'base',
        });
      }
    },
    handoff(
      progress: number,
      dot: (value: Dot) => void,
      reveal: (value: RevealFrame) => void,
      revealTarget: (id: string, value: RevealFrame) => void,
      targetIds: readonly string[],
    ) {
      const morph = smooth(progress / 0.65),
        front = smooth((progress - 0.48) / 0.52);
      if (projection.family === 'text' && !target) {
        reveal({ opacity: smooth(progress) });
        return;
      }
      const duplicate = 1 - smooth(progress / 0.65);
      for (let i = 0; i < source.length; i++) {
        const p = source[i],
          end = destinations[i];
        if (!p || !end) continue;
        const x = p.x + (end.x - p.x) * morph,
          y = p.y + (end.y - p.y) * morph;
        const unique = target?.length && i >= target.length ? duplicate : 1;
        dot({
          x,
          y,
          size: p.size,
          opacity:
            0.5 *
            unique *
            (projection.family === 'chart'
              ? clamp((x - front * width) / Math.max(1, width * 0.1))
              : 1 - front),
          tone: 'base',
        });
      }
      if (projection.family === 'chart')
        reveal({ opacity: 1, clipStart: front });
      else if (projection.family === 'table' && targetIds.length) {
        reveal({ opacity: 1 });
        for (const [index, id] of targetIds.entries()) {
          const p = smooth((progress - index * 0.045 - 0.2) / 0.5);
          revealTarget(id, { opacity: p, translateY: (1 - p) * 4 });
        }
      } else reveal({ opacity: front });
    },
  };
}
