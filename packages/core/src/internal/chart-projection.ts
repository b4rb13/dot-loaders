import type { ChartInput, ChartVariant, TargetProvider } from '../chart.js';
/** At most two synchronous attempts; only null permits a second attempt. */
export function chartProjection(
  provider: TargetProvider | undefined,
  bounds: Readonly<{ width: number; height: number }>,
  variant: ChartVariant,
  report: (code: string) => void,
): ChartInput {
  if (!provider) return emptyChartInput;
  try {
    let raw = provider(bounds);
    if (raw === null) raw = provider(bounds);
    if (raw === null) return emptyChartInput;
    if (!raw || typeof raw !== 'object') throw new TypeError();
    const value = raw;
    const rects = value.kind === 'rects' || value.kind === 'bar';
    const items = rects
      ? 'rects' in value
        ? value.rects
        : value.bars
      : 'points' in value
        ? value.points
        : undefined;
    if (!Array.isArray(items) || items.length > 2048) throw new TypeError();
    const kind =
      value.kind === 'points'
        ? variant === 'scatter'
          ? 'scatter'
          : 'line'
        : value.kind === 'rects'
          ? 'bar'
          : value.kind;
    if (!['line', 'bar', 'scatter'].includes(kind)) throw new TypeError();
    const copied = Object.freeze(
      Array.from(items, (item) => {
        if (!item || typeof item !== 'object') throw new TypeError();
        const x = finiteNumber(item.x),
          y = finiteNumber(item.y);
        if (rects) {
          const width = finiteNumber(item.width),
            height = finiteNumber(item.height);
          if (width < 0 || height < 0) throw new TypeError();
          return Object.freeze({ x, y, width, height });
        }
        return Object.freeze({ x, y });
      }),
    );
    return Object.freeze({
      kind,
      [kind === 'bar' ? 'bars' : 'points']: copied,
      ...(kind === 'scatter'
        ? {}
        : {
            baseline: finiteNumber(
              'baseline' in value ? value.baseline : bounds.height,
            ),
          }),
    }) as ChartInput;
  } catch {
    report('invalid-geometry');
    return emptyChartInput;
  }
}

export const emptyChartSource: readonly never[] = /* @__PURE__ */ Object.freeze(
  [],
);
export const emptyChartInput = /* @__PURE__ */ Object.freeze({
  kind: 'scatter' as const,
  points: emptyChartSource,
});

function finiteNumber(n: unknown) {
  if (!Number.isFinite(n)) throw new TypeError();
  return n as number;
}
