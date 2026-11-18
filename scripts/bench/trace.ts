/** Chromium trace analysis. Trace durations are wall-time work estimates, not hardware CPU counters. */
export interface TraceEvent {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  tdur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}
export interface Span {
  start: number;
  end: number;
  name: string;
  url?: string;
  cpuUs?: number;
}
export type Category = 'script' | 'style' | 'layout' | 'paint' | 'other';
export interface Bin {
  startMs: number;
  endMs: number;
  script: number;
  style: number;
  layout: number;
  paint: number;
  other: number;
  busy: number;
  render: number;
  cpuLower: number;
  cpuUpper: number;
  missingCpuTasks: number;
}
export function nearestRank(values: readonly number[], percentile: number) {
  if (
    !values.length ||
    percentile <= 0 ||
    percentile > 1 ||
    values.some((v) => !Number.isFinite(v))
  )
    throw new Error('Invalid percentile input');
  return [...values].sort((a, b) => a - b)[
    Math.ceil(percentile * values.length) - 1
  ] as number;
}
export function layoutScore(
  entries: readonly {
    value: number;
    startTime: number;
    hadRecentInput: boolean;
  }[],
) {
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
const taskNames = new Set(['RunTask', 'ThreadControllerImpl::RunTask']);
function category(name: string): Category | undefined {
  if (
    /^(UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation)$/.test(
      name,
    )
  )
    return 'style';
  if (/^(Layout|UpdateLayout)$/.test(name)) return 'layout';
  if (
    /^(Paint|PrePaint|PaintImage|CompositeLayers|Layerize|UpdateLayerTree)$/.test(
      name,
    )
  )
    return 'paint';
  if (
    /^(FunctionCall|EvaluateScript|EventDispatch|FireAnimationFrame|TimerFire|RunMicrotasks|CompileScript|v8\.|V8\.|MajorGC|MinorGC)/.test(
      name,
    )
  )
    return 'script';
  if (taskNames.has(name)) return 'other';
  return undefined;
}
export function spans(
  events: readonly TraceEvent[],
  pid: number,
  tid: number,
): Span[] {
  const output: Span[] = [],
    stack: TraceEvent[] = [];
  for (const e of events
    .filter((e) => e.pid === pid && e.tid === tid)
    .sort((a, b) => a.ts - b.ts)) {
    const data = e.args?.data as
      | { url?: string; scriptName?: string }
      | undefined;
    const url = data?.url ?? data?.scriptName;
    if (e.ph === 'X' && e.dur !== undefined && e.dur > 0)
      output.push({
        start: e.ts,
        end: e.ts + e.dur,
        name: e.name,
        ...(url ? { url } : {}),
        ...(e.tdur === undefined ? {} : { cpuUs: e.tdur }),
      });
    if (e.ph === 'B') stack.push(e);
    if (e.ph === 'E') {
      const begin = stack.pop();
      if (begin && e.ts > begin.ts)
        output.push({ start: begin.ts, end: e.ts, name: begin.name });
    }
  }
  return output;
}
export function analyzeTrace(
  events: readonly TraceEvent[],
  windowMs: number,
  frameMs: number,
) {
  if (
    !Number.isFinite(windowMs) ||
    !Number.isFinite(frameMs) ||
    windowMs <= 0 ||
    frameMs <= 0
  )
    throw new Error('Invalid measurement window');
  const mark = (name: string) => {
    const matches = events.filter((e) => e.name === `dq:${name}`);
    if (matches.length !== 1)
      throw new Error(`Missing/ambiguous trace mark ${name}`);
    return matches[0] as TraceEvent;
  };
  const start = mark('active:start'),
    end = mark('active:end');
  if (end.pid !== start.pid || end.tid !== start.tid)
    throw new Error('Incomparable phase');
  if (end.ts + 1 < start.ts + windowMs * 1000)
    throw new Error('Truncated active window');
  const all = spans(events, start.pid, start.tid);
  if (!all.some((s) => taskNames.has(s.name)))
    throw new Error('No renderer main-thread task coverage');
  // RunTask wraps ThreadController tasks; charge only outermost tasks, including for long-task checks.
  const tasks: Span[] = [];
  for (const task of all
    .filter((s) => taskNames.has(s.name))
    .sort((a, b) => a.start - b.start || b.end - a.end)) {
    const prior = tasks.at(-1);
    if (!prior || task.start >= prior.end) tasks.push(task);
    else if (task.end > prior.end)
      throw new Error('Overlapping main-thread task coverage');
  }
  const cpuRange = (low: number, high: number) => {
    let lower = 0,
      upper = 0,
      missing = 0;
    for (const task of tasks) {
      const overlap = Math.max(
        0,
        Math.min(high, task.end) - Math.max(low, task.start),
      );
      if (!overlap) continue;
      const wall = task.end - task.start;
      if (task.cpuUs === undefined) {
        upper += overlap;
        missing++;
        continue;
      }
      const cpu = Math.max(0, Math.min(wall, task.cpuUs));
      // Exact for an enclosed task; clipped tasks have bounds, never uniform-time interpolation.
      lower += Math.max(0, cpu - (wall - overlap));
      upper += Math.min(cpu, overlap);
    }
    return { lower: lower / 1000, upper: upper / 1000, missing };
  };
  const partition = (from: number, to: number, binMs: number): Bin[] => {
    const relevant = all.filter(
      (s) => category(s.name) && s.start < to && s.end > from,
    );
    const bins: Bin[] = [];
    for (let low = from; low < to - 0.001; low += binMs * 1000) {
      const high = Math.min(to, low + binMs * 1000);
      const overlapping = relevant.filter((s) => s.start < high && s.end > low);
      const boundaries = [
        ...new Set([
          low,
          high,
          ...overlapping.flatMap((s) => [
            Math.max(low, s.start),
            Math.min(high, s.end),
          ]),
        ]),
      ].sort((a, b) => a - b);
      const result: Bin = {
        startMs: (low - from) / 1000,
        endMs: (high - from) / 1000,
        script: 0,
        style: 0,
        layout: 0,
        paint: 0,
        other: 0,
        busy: 0,
        render: 0,
        cpuLower: 0,
        cpuUpper: 0,
        missingCpuTasks: 0,
      };
      for (let i = 1; i < boundaries.length; i++) {
        const a = boundaries[i - 1] as number,
          b = boundaries[i] as number;
        // Innermost classified event owns each interval. Toplevel tasks fill unclassified gaps.
        const owner = overlapping
          .filter((s) => s.start < b && s.end > a)
          .sort(
            (a, b) =>
              a.end - a.start - (b.end - b.start) ||
              Number(category(a.name) === 'other') -
                Number(category(b.name) === 'other'),
          )[0];
        if (owner) result[category(owner.name) as Category] += (b - a) / 1000;
      }
      result.render =
        result.script + result.style + result.layout + result.paint;
      result.busy = result.render + result.other;
      const cpu = cpuRange(low, high);
      result.cpuLower = cpu.lower;
      result.cpuUpper = cpu.upper;
      result.missingCpuTasks = cpu.missing;
      bins.push(result);
    }
    return bins;
  };
  const phase = (name: string) => {
    const a = mark(`${name}:start`),
      b = mark(`${name}:end`);
    if (
      a.pid !== start.pid ||
      a.tid !== start.tid ||
      b.pid !== start.pid ||
      b.tid !== start.tid ||
      b.ts < a.ts
    )
      throw new Error('Incomparable phase');
    const bins = partition(a.ts, b.ts, Math.max(0.001, (b.ts - a.ts) / 1000));
    return {
      elapsedMs: (b.ts - a.ts) / 1000,
      busyMs: bins.reduce((sum, b) => sum + b.busy, 0),
      renderMs: bins.reduce((sum, b) => sum + b.render, 0),
      threadCpuLowerMs: bins.reduce((sum, b) => sum + b.cpuLower, 0),
      threadCpuUpperMs: bins.reduce((sum, b) => sum + b.cpuUpper, 0),
      missingCpuTasks: bins.reduce((sum, b) => sum + b.missingCpuTasks, 0),
    };
  };
  const bins = partition(start.ts, start.ts + windowMs * 1000, frameMs);
  const longTasks = tasks
    .filter(
      (s) =>
        s.end - s.start >= 50000 &&
        s.end > mark('init:start').ts &&
        s.start < mark('teardown:end').ts,
    )
    .map((s) => ({
      relativeStartMs: (s.start - start.ts) / 1000,
      durationMs: (s.end - s.start) / 1000,
      packageScripts: [
        ...new Set(
          all
            .filter(
              (inner) =>
                inner.start >= s.start &&
                inner.end <= s.end &&
                inner.url?.includes('/pkg/dist/'),
            )
            .map((inner) => inner.url),
        ),
      ],
      attribution:
        'suspected fixture-associated; compare paired raw traces, never waived by percentiles',
    }));
  return {
    clock:
      'trace event wall duration; conservative main-thread work proxy, not measured thread CPU',
    mainThread: { pid: start.pid, tid: start.tid },
    frameMs,
    windowMs,
    bins,
    phases: {
      initialization: phase('init'),
      setup: phase('setup'),
      teardown: phase('teardown'),
    },
    longTasks,
    eventNames: [...new Set(all.map((s) => s.name))].sort(),
  };
}
export function comparePair(
  animated: ReturnType<typeof analyzeTrace>,
  baseline: ReturnType<typeof analyzeTrace>,
  limits: { p95: number; p99: number },
) {
  if (
    animated.bins.length !== baseline.bins.length ||
    animated.frameMs !== baseline.frameMs ||
    animated.windowMs !== baseline.windowMs
  )
    throw new Error('Incomparable paired bins');
  const differences = animated.bins.map((a, index) => {
    const s = baseline.bins[index] as Bin;
    return {
      startMs: a.startMs,
      endMs: a.endMs,
      signedRenderMs: a.render - s.render,
      additionalRenderMs: Math.max(0, a.render - s.render),
      signedBusyMs: a.busy - s.busy,
      additionalBusyMs: Math.max(0, a.busy - s.busy),
      signedCpuLowerMs: a.cpuLower - s.cpuUpper,
      signedCpuUpperMs: a.cpuUpper - s.cpuLower,
      additionalCpuUpperMs: Math.max(0, a.cpuUpper - s.cpuLower),
    };
  });
  const values = differences.map((d) => d.additionalRenderMs);
  const p95 = nearestRank(values, 0.95),
    p99 = nearestRank(values, 0.99);
  return {
    differences,
    p95,
    p99,
    maximum: Math.max(...values),
    threadCpuAdditionalUpperP95: nearestRank(
      differences.map((d) => d.additionalCpuUpperMs),
      0.95,
    ),
    threadCpuAdditionalUpperP99: nearestRank(
      differences.map((d) => d.additionalCpuUpperMs),
      0.99,
    ),
    passesBoth: p95 <= limits.p95 && p99 <= limits.p99,
    longTaskGate: animated.longTasks.length
      ? 'unresolved-or-fail: >=50ms tasks require attribution review'
      : 'no >=50ms task observed',
    animatedLongTasks: animated.longTasks,
    baselineLongTasks: baseline.longTasks,
  };
}
export function summarizePairs(
  pairs: ReturnType<typeof comparePair>[],
  limits: { p95: number; p99: number },
  requiredRuns = 20,
) {
  if (!pairs.length) throw new Error('Missing pairs');
  const pooled = pairs.flatMap((p) =>
    p.differences.map((d) => d.additionalRenderMs),
  );
  const p95 = nearestRank(pooled, 0.95),
    p99 = nearestRank(pooled, 0.99);
  const cpuBounds = pairs.flatMap((p) =>
    p.differences.map((d) => d.additionalCpuUpperMs),
  );
  return {
    validPairs: pairs.length,
    requiredRuns,
    passingBoth: pairs.filter((p) => p.passesBoth).length,
    minimumPassingBoth: Math.ceil(requiredRuns * 0.9),
    pooledP95: p95,
    pooledP99: p99,
    maximum: Math.max(...pooled),
    pooledAdditionalCpuUpperP95: nearestRank(cpuBounds, 0.95),
    pooledAdditionalCpuUpperP99: nearestRank(cpuBounds, 0.99),
    numericRenderingPass:
      pairs.length === requiredRuns &&
      pairs.filter((p) => p.passesBoth).length >=
        Math.ceil(requiredRuns * 0.9) &&
      p95 <= limits.p95 &&
      p99 <= limits.p99,
    independentLongTaskGate: pairs.some((p) => p.animatedLongTasks.length)
      ? 'unresolved-or-fail'
      : 'none observed',
    qualification:
      'unverified: local diagnostic, trace wall-time proxy, provisional workload and no approved reference hardware',
  };
}
