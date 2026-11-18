/** Admit counts before creating arrays or nodes. The same rule is used by static output. */
export function boundedCount(
  value: unknown,
  fallback: number,
  maximum: number,
): number {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number > 0
    ? Math.min(number, maximum)
    : fallback;
}
export function lineWidths(
  lines: number,
  supplied: readonly number[] = [],
): readonly number[] {
  return Object.freeze(
    Array.from({ length: lines }, (_, index) => {
      const value = supplied[index];
      return typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0 &&
        value <= 1
        ? value
        : lines > 1 && index === lines - 1
          ? 0.6
          : 1;
    }),
  );
}
