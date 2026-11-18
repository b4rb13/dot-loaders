import { nearestRank } from './trace';

/** Includes unclassified task overhead; classified rendering remains a separate diagnostic. */
export function wholeWorkSummary(
  runs: readonly { differences: readonly { additionalBusyMs: number }[] }[],
  limits: { p95: number; p99: number },
  requiredRuns = 20,
) {
  if (!runs.length || runs.some((run) => !run.differences.length))
    throw new Error('Missing whole-work samples');
  const perRun = runs.map((run) => {
    const values = run.differences.map((bin) => bin.additionalBusyMs);
    const p95 = nearestRank(values, 0.95),
      p99 = nearestRank(values, 0.99);
    return {
      p95,
      p99,
      maximum: Math.max(...values),
      passesBoth: p95 <= limits.p95 && p99 <= limits.p99,
    };
  });
  const pooled = runs.flatMap((run) =>
    run.differences.map((bin) => bin.additionalBusyMs),
  );
  const p95 = nearestRank(pooled, 0.95),
    p99 = nearestRank(pooled, 0.99);
  const passingBoth = perRun.filter((run) => run.passesBoth).length;
  return {
    metric:
      'additional whole main-thread busy wall-time proxy, including unclassified overhead',
    validPairs: runs.length,
    perRun,
    passingBoth,
    pooledP95: p95,
    pooledP99: p99,
    maximum: Math.max(...pooled),
    numericPass:
      runs.length === requiredRuns &&
      passingBoth >= Math.ceil(requiredRuns * 0.9) &&
      p95 <= limits.p95 &&
      p99 <= limits.p99,
    qualification:
      'unverified; conservative diagnostic proxy, not exact reference CPU',
  };
}
