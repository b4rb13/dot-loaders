import { expect, test } from 'bun:test';
import {
  analyzeTrace,
  comparePair,
  layoutScore,
  nearestRank,
  summarizePairs,
  type TraceEvent,
} from '../../scripts/bench/trace';

const event = (
  name: string,
  ts: number,
  dur?: number,
  ph = 'X',
): TraceEvent => ({
  name,
  ts,
  pid: 1,
  tid: 2,
  ph,
  ...(dur === undefined ? {} : { dur }),
});
const marks = (windowMs = 10): TraceEvent[] => [
  event('dq:init:start', -2000, undefined, 'R'),
  event('dq:init:end', -1000, undefined, 'R'),
  event('dq:setup:start', 0, undefined, 'R'),
  event('dq:setup:end', 500, undefined, 'R'),
  event('dq:active:start', 0, undefined, 'R'),
  event('dq:active:end', windowMs * 1000, undefined, 'R'),
  event('dq:teardown:start', windowMs * 1000, undefined, 'R'),
  event('dq:teardown:end', windowMs * 1000 + 1000, undefined, 'R'),
];
test('nearest-rank uses the nineteenth of twenty values and retains maxima', () => {
  expect(
    nearestRank(
      Array.from({ length: 20 }, (_, i) => i + 1),
      0.95,
    ),
  ).toBe(19);
  expect(nearestRank([1, 2, 100], 0.99)).toBe(100);
  expect(() => nearestRank([], 0.95)).toThrow();
});
test('nested script/style/layout/paint are partitioned once and unrelated threads excluded', () => {
  const trace = [
    ...marks(),
    event('RunTask', 0, 10000),
    event('FunctionCall', 1000, 8000),
    event('UpdateLayoutTree', 2000, 2000),
    event('Layout', 3000, 3000),
    event('Paint', 7000, 1000),
    { ...event('Layout', 0, 10000), tid: 99 },
  ];
  const analysis = analyzeTrace(trace, 10, 2);
  expect(analysis.bins.reduce((v, b) => v + b.busy, 0)).toBe(10);
  expect(analysis.bins.reduce((v, b) => v + b.render, 0)).toBe(8);
  for (const bin of analysis.bins)
    expect(bin.busy).toBeLessThanOrEqual(bin.endMs - bin.startMs + 1e-10);
});
test('B/E spans and a late end do not pad the active window with a static tail', () => {
  const trace = [
    ...marks(),
    event('RunTask', 0, undefined, 'B'),
    event('FunctionCall', 1000, undefined, 'B'),
    event('', 9000, undefined, 'E'),
    event('', 20000, undefined, 'E'),
  ].map((e) => (e.name === 'dq:active:end' ? { ...e, ts: 30000 } : e));
  expect(analyzeTrace(trace, 10, 5).bins.reduce((v, b) => v + b.busy, 0)).toBe(
    10,
  );
});
test('missing marks, truncated windows and missing task coverage are instrumentation failures', () => {
  expect(() =>
    analyzeTrace(
      marks().filter((e) => e.name !== 'dq:active:start'),
      10,
      5,
    ),
  ).toThrow();
  expect(() =>
    analyzeTrace([...marks(5), event('RunTask', 0, 10000)], 10, 5),
  ).toThrow('Truncated');
  expect(() => analyzeTrace(marks(), 10, 5)).toThrow('coverage');
});
test('signed per-bin differences are preserved before clamping; sorted percentile subtraction is not used', () => {
  const a = analyzeTrace(
      [...marks(), event('RunTask', 0, 10000), event('FunctionCall', 0, 2000)],
      10,
      5,
    ),
    s = analyzeTrace(
      [
        ...marks(),
        event('RunTask', 0, 10000),
        event('FunctionCall', 5000, 3000),
      ],
      10,
      5,
    );
  const pair = comparePair(a, s, { p95: 4, p99: 8 });
  expect(pair.differences.map((d) => d.signedRenderMs)).toEqual([2, -3]);
  expect(pair.differences.map((d) => d.additionalRenderMs)).toEqual([2, 0]);
  expect(pair.maximum).toBe(2);
});
test('a task at exactly 50ms is retained independently of rendering percentiles', () => {
  const a = analyzeTrace([...marks(60), event('RunTask', 0, 50000)], 60, 10),
    s = analyzeTrace([...marks(60), event('RunTask', 0, 49999)], 60, 10);
  const pair = comparePair(a, s, { p95: 4, p99: 8 });
  expect(pair.passesBoth).toBe(true);
  expect(pair.animatedLongTasks).toHaveLength(1);
  expect(pair.baselineLongTasks).toHaveLength(0);
  expect(
    summarizePairs(
      Array.from({ length: 20 }, () => pair),
      { p95: 4, p99: 8 },
    ).independentLongTaskGate,
  ).toBe('unresolved-or-fail');
});
test('paired windows must be comparable and a smoke sample cannot qualify a full protocol', () => {
  const a = analyzeTrace([...marks(), event('RunTask', 0, 10000)], 10, 5),
    b = analyzeTrace([...marks(), event('RunTask', 0, 10000)], 10, 2);
  expect(() => comparePair(a, b, { p95: 4, p99: 8 })).toThrow('Incomparable');
  const pair = comparePair(a, a, { p95: 4, p99: 8 });
  expect(summarizePairs([pair], { p95: 4, p99: 8 }).numericRenderingPass).toBe(
    false,
  );
});
test('both tails and pooled results must pass; slow valid runs are never discarded', () => {
  const baseline = analyzeTrace(
      [...marks(100), event('RunTask', 0, 100000)],
      100,
      10,
    ),
    fast = comparePair(baseline, baseline, { p95: 4, p99: 8 }),
    slow = comparePair(
      analyzeTrace(
        [
          ...marks(100),
          event('RunTask', 0, 100000),
          event('FunctionCall', 0, 100000),
        ],
        100,
        10,
      ),
      baseline,
      { p95: 4, p99: 8 },
    );
  expect(
    summarizePairs(
      [...Array.from({ length: 17 }, () => fast), slow, slow, slow],
      { p95: 4, p99: 8 },
    ).numericRenderingPass,
  ).toBe(false);
  expect(
    summarizePairs(
      Array.from({ length: 20 }, () => fast),
      { p95: 4, p99: 8 },
    ).numericRenderingPass,
  ).toBe(true);
});

test('coextensive script and toplevel events retain script attribution', () => {
  const analysis = analyzeTrace(
    [...marks(), event('RunTask', 0, 10000), event('FunctionCall', 0, 10000)],
    10,
    5,
  );
  expect(analysis.bins.reduce((s, b) => s + b.script, 0)).toBe(10);
});

test('thread CPU is exact for enclosed outer tasks and bounded for cuts, without nested double charging', () => {
  const trace = [
    ...marks(),
    { ...event('RunTask', 0, 10000), tdur: 6000 },
    { ...event('ThreadControllerImpl::RunTask', 1000, 8000), tdur: 5000 },
  ];
  const full = analyzeTrace(trace, 10, 10);
  expect(full.bins[0]?.cpuLower).toBe(6);
  expect(full.bins[0]?.cpuUpper).toBe(6);
  const cut = analyzeTrace(trace, 10, 5);
  expect(cut.bins[0]?.cpuLower).toBe(1);
  expect(cut.bins[0]?.cpuUpper).toBe(5);
});
test('missing thread CPU stays unknown with explicit bounds rather than invented zero CPU', () => {
  const a = analyzeTrace([...marks(), event('RunTask', 0, 10000)], 10, 10);
  expect(a.bins[0]?.missingCpuTasks).toBe(1);
  expect(a.bins[0]?.cpuLower).toBe(0);
  expect(a.bins[0]?.cpuUpper).toBe(10);
});

test('invalid frame periods and cross-thread end marks are rejected', () => {
  expect(() => analyzeTrace(marks(), 10, 0)).toThrow('window');
  expect(() =>
    analyzeTrace(
      marks().map((e) => (e.name === 'dq:active:end' ? { ...e, tid: 99 } : e)),
      10,
      5,
    ),
  ).toThrow('Incomparable');
});

test('CLS uses gap/session windows and keeps recent-input shifts out of its score', () => {
  const shift = (startTime: number, value: number, hadRecentInput = false) => ({
    startTime,
    value,
    hadRecentInput,
  });
  expect(
    layoutScore([
      shift(100, 0.01),
      shift(600, 0.02),
      shift(1600, 0.04),
      shift(1700, 10, true),
    ]),
  ).toBe(0.04);
  expect(
    layoutScore([
      shift(900, 0.01),
      shift(1800, 0.01),
      shift(2700, 0.01),
      shift(3600, 0.01),
      shift(4500, 0.01),
      shift(5400, 0.01),
      shift(6000, 0.02),
    ]),
  ).toBeCloseTo(0.06);
});
