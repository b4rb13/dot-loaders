import type { Dot } from '../animations.js';
import type { PaintEntry, Painter } from './painter.js';
export function capturePoints(
  points: readonly PaintEntry[],
  limit = 4096,
): readonly Dot[] {
  return Object.freeze(
    points.slice(0, limit).map((point) =>
      Object.freeze({
        x: (point[0] ?? 0) + 0,
        y: (point[1] ?? 0) + 0,
        size: point[2] ?? 0,
        opacity: point[3] ?? 0,
        tone: point[4] ? ('accent' as const) : ('base' as const),
        ...(point[5] ? { angle: point[5] } : {}),
      }),
    ),
  );
}
export function capturePainter(
  painter: Painter | undefined,
  limit?: number,
): readonly Dot[] {
  return (
    painter?.capture?.(limit) ?? capturePoints(painter?.points ?? [], limit)
  );
}
