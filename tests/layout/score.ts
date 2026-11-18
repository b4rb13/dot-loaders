export interface LayoutShift {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
}

/**
 * Cumulative Layout Shift: the largest session window of shifts without recent
 * input. A window ends after a 1 s gap or once it spans 5 s.
 */
export function layoutScore(entries: readonly LayoutShift[]): number {
  let start: number | undefined,
    previous = 0,
    session = 0,
    maximum = 0;
  for (const entry of [...entries].sort((a, b) => a.startTime - b.startTime)) {
    if (entry.hadRecentInput) continue;
    if (
      start === undefined ||
      entry.startTime - previous >= 1000 ||
      entry.startTime - start >= 5000
    ) {
      start = entry.startTime;
      session = 0;
    }
    session += entry.value;
    maximum = Math.max(maximum, session);
    previous = entry.startTime;
  }
  return maximum;
}
