import type { ChartInput, ChartVariant } from '@dotquilt-internal/core/chart';
export const reportRows = [
  { id: 'canvas', name: 'Canvas', status: 'Ready', value: '24' },
  { id: 'grid', name: 'Grid', status: 'Queued', value: '16' },
  { id: 'chart', name: 'Chart', status: 'Ready', value: '32' },
] as const;
export const values = [0.2, 0.45, 0.36, 0.75, 0.62, 0.92] as const;
export function chartGeometry(
  { width, height }: { width: number; height: number },
  variant: ChartVariant,
): ChartInput {
  const points = values.map((value, index) => ({
    x: width * (0.08 + index * 0.16),
    y: height * (0.9 - value * 0.8),
  }));
  return variant === 'bar'
    ? {
        kind: 'bar',
        baseline: height * 0.9,
        bars: points.map((p) => ({
          x: p.x - width * 0.035,
          y: p.y,
          width: width * 0.07,
          height: height * 0.9 - p.y,
        })),
      }
    : variant === 'line'
      ? { kind: 'line', baseline: height * 0.9, points }
      : { kind: 'scatter', points };
}
export function rowName(index: number, international: boolean) {
  return international && index === 0
    ? 'Café 東京'
    : (reportRows[index]?.name ?? '');
}
