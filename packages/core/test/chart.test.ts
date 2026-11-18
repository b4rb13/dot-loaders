import { expect, test } from 'bun:test';
import type {
  AnimationSurface,
  Dot,
  HandoffDefinition,
} from '../src/animations.js';
import { definePreset } from '../src/animations.js';
import type { ChartInput, TargetProvider } from '../src/chart.js';
import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from '../src/chart-animations.js';
import { definitionOf } from '../src/internal/binding.js';
import { chartAppearance } from '../src/internal/chart-appearance.js';
import { defaultRidge } from '../src/internal/chart-definitions.js';
import { chartProjection } from '../src/internal/chart-projection.js';
import type { HandoffPaint, IdlePaint } from '../src/internal/paint.js';
import { renderStatic } from '../src/server.js';
import idleCases from './fixtures/chart-idle-cases.json';

const bounds = Object.freeze({ width: 320, height: 200 });
test('chart geometry snapshots preserve semantic/legacy data, zeroes and bounded synchronous acquisition', () => {
  let calls = 0;
  const input: ChartInput = {
    kind: 'line',
    points: [
      { x: 0, y: 0 },
      { x: 320, y: 100 },
    ],
    baseline: 200,
  };
  const out = chartProjection(
    () => {
      calls++;
      return calls === 1 ? null : input;
    },
    bounds,
    'line',
    () => {},
  );
  expect(calls).toBe(2);
  expect(out).toEqual(input);
  expect(out).not.toBe(input);
  expect(Object.isFrozen(out)).toBe(true);
  if (out.kind !== 'bar') {
    expect(Object.isFrozen(out.points)).toBe(true);
    expect(Object.isFrozen(out.points[0])).toBe(true);
  }
  expect(
    chartProjection(
      () => ({ kind: 'rects', rects: [{ x: 0, y: 0, width: 0, height: 0 }] }),
      bounds,
      'bar',
      () => {},
    ),
  ).toEqual({
    kind: 'bar',
    bars: [{ x: 0, y: 0, width: 0, height: 0 }],
    baseline: 200,
  });
  expect(
    chartProjection(
      () => ({ kind: 'points', points: [{ x: 0, y: 0 }] }),
      bounds,
      'scatter',
      () => {},
    ),
  ).toEqual({ kind: 'scatter', points: [{ x: 0, y: 0 }] });
});
test('null retries twice; errors, promises, invalid or oversized geometry stop once without retained caller data', () => {
  for (const value of [
    undefined,
    Promise.resolve(null),
    { kind: 'line', points: [{ x: NaN, y: 0 }], baseline: 0 },
    { kind: 'bar', bars: [{ x: 0, y: 0, width: -1, height: 1 }], baseline: 0 },
    {
      kind: 'points',
      points: Array.from({ length: 2049 }, () => ({ x: 0, y: 0 })),
    },
    {
      kind: 'unknown',
      points: [],
    },
  ]) {
    let calls = 0;
    const errors: string[] = [];
    const out = chartProjection(
      (() => {
        calls++;
        return value;
      }) as TargetProvider,
      bounds,
      'line',
      (code) => errors.push(code),
    );
    expect(calls).toBe(1);
    expect(out).toEqual({ kind: 'scatter', points: [] });
    expect(errors).toEqual(['invalid-geometry']);
  }
  let calls = 0;
  chartProjection(
    () => {
      calls++;
      return null;
    },
    bounds,
    'line',
    () => {},
  );
  expect(calls).toBe(2);
  calls = 0;
  chartProjection(
    () => {
      calls++;
      throw new Error();
    },
    bounds,
    'line',
    () => {},
  );
  expect(calls).toBe(1);
  const points = Array.from({ length: 2048 }, (_, x) => ({ x, y: 0 }));
  const allowed = chartProjection(
    () => ({ kind: 'points', points }),
    bounds,
    'line',
    () => {},
  );
  expect(allowed.kind === 'line' && allowed.points.length).toBe(2048);
});
const surface: AnimationSurface<'chart'> = Object.freeze({
  family: 'chart',
  ...bounds,
  input: Object.freeze({
    kind: 'line',
    points: Object.freeze([
      { x: 0, y: 30 },
      { x: 320, y: 60 },
    ]),
    baseline: 180,
  }),
  source: Object.freeze(
    Array.from({ length: 60 }, (_, i) =>
      Object.freeze({
        x: (i % 10) * 32,
        y: Math.floor(i / 10) * 30,
        size: 2,
        opacity: 0.5,
        tone: 'base' as const,
      }),
    ),
  ),
  revealTargetIds: Object.freeze([]),
});
test('six silhouettes, option endpoints and static output are finite and distinct; factories reject unknown/invalid options', () => {
  const hashes = new Set<string>();
  for (const factory of [ridge, scan, terrain, bars, scatter, cycle]) {
    const binding = factory(),
      definition = definitionOf(binding) as unknown as { draw: IdlePaint },
      dots: Dot[] = [];
    definition.draw({
      surface,
      options: binding.options,
      timeMs: 1700,
      still: false,
      dot: (d) => dots.push(d),
      deltaMs: 16,
    });
    expect(dots.length).toBeGreaterThan(500);
    expect(dots.length).toBeLessThanOrEqual(4096);
    expect(
      dots.every((d) => [d.x, d.y, d.size, d.opacity].every(Number.isFinite)),
    ).toBe(true);
    hashes.add(JSON.stringify(dots));
    expect(Object.isFrozen(binding.options)).toBe(true);
    expect(() => Reflect.apply(factory, null, [{ surprise: 1 }])).toThrow();
    expect(() => Reflect.apply(factory, null, [{ amplitude: NaN }])).toThrow();
  }
  expect(hashes.size).toBe(5); // cycle is intentionally in its initial Ridge hold at 1700ms.
  expect(ridge({ amplitude: -1 }).options.amplitude).toBe(0);
  expect(scan({ trail: 999 }).options.trail).toBe(240);
  expect(morphWipe({ edge: 0 }).options.edge).toBe(4);
});
test('morph/wipe prepares bounded line/bar/scatter destinations and terminal decoration fully disappears', () => {
  const binding = morphWipe(),
    definition = definitionOf(binding) as HandoffDefinition<
      'chart',
      typeof binding.options,
      unknown
    > & { draw: HandoffPaint };
  for (const input of [
    surface.input,
    {
      kind: 'bar' as const,
      bars: [{ x: 20, y: 40, width: 50, height: 140 }],
      baseline: 180,
    },
    {
      kind: 'scatter' as const,
      points: [
        { x: 80, y: 60 },
        { x: 180, y: 130 },
      ],
    },
  ]) {
    const s = { ...surface, input },
      prepared = definition.prepare(s, binding.options);
    expect(definition.duration(s, binding.options)).toBe(900);
    for (const p of [0, 0.25, 0.5, 0.85, 1]) {
      const dots: Dot[] = [];
      definition.draw({
        surface: s,
        options: binding.options,
        prepared,
        linear: p,
        progress: p,
        duration: 900,
        deltaMs: 16,
        dot: (d) => dots.push(d),
        reveal: () => {},
        revealTarget: () => {},
      });
      expect(
        dots.every((d) => [d.x, d.y, d.size, d.opacity].every(Number.isFinite)),
      ).toBe(true);
      if (p === 1) expect(dots.every((d) => d.opacity === 0)).toBe(true);
    }
  }
  expect(
    definition.duration(
      { ...surface, input: { kind: 'scatter', points: [] } },
      binding.options,
    ),
  ).toBe(150);
});
test('bar and scatter preparation do not scan line-only crest columns', () => {
  const binding = morphWipe();
  const definition = definitionOf(binding) as HandoffDefinition<
    'chart',
    typeof binding.options,
    unknown
  >;
  for (const input of [
    {
      kind: 'bar' as const,
      bars: [{ x: 20, y: 40, width: 50, height: 140 }],
      baseline: 180,
    },
    { kind: 'scatter' as const, points: [{ x: 80, y: 60 }] },
  ]) {
    let reads = 0;
    const source = [
      {
        get x() {
          reads++;
          return 30;
        },
        y: 40,
        size: 2,
        opacity: 0.5,
        tone: 'base' as const,
      },
    ];
    const prepared = definition.prepare(
      { ...surface, input, source },
      binding.options,
    );
    expect(prepared).toBeDefined();
    expect(reads).toBe(input.kind === 'bar' ? 3 : 1);
  }
});

test('chart presets and static helpers are data-only, escaped, no provider serialization or DOM globals', () => {
  expect(
    definePreset({ kind: 'chart', variant: 'bar', speed: 0.6 }).variant,
  ).toBe('bar');
  expect(() =>
    definePreset({ kind: 'chart', variant: 'oops' } as never),
  ).toThrow();
  const html = renderStatic({
    kind: 'chart-loader',
    variant: 'scatter',
    stylePolicy: { mode: 'external', href: '/chart.css' },
  });
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('variant="scatter"');
  expect(html).not.toContain('targetProvider');
  expect(() =>
    renderStatic({ kind: 'chart-loader', variant: 'oops' } as never),
  ).toThrow();
});

test('selective default Ridge emits identical ordered commands to the public configurable Ridge', () => {
  const aDefinition = definitionOf(defaultRidge) as unknown as {
      draw: IdlePaint;
    },
    binding = ridge(),
    bDefinition = definitionOf(binding) as unknown as { draw: IdlePaint };
  for (const timeMs of [0, 500, 1700, 3500])
    for (const still of [true, false]) {
      const a: Dot[] = [],
        b: Dot[] = [];
      aDefinition.draw({
        surface,
        options: defaultRidge.options,
        timeMs,
        still,
        dot: (d) => a.push(d),
        deltaMs: 16,
      });
      bDefinition.draw({
        surface,
        options: binding.options,
        timeMs,
        still,
        dot: (d) => b.push(d),
        deltaMs: 16,
      });
      expect(a).toEqual(b);
    }
});
const factories = { ridge, scan, terrain, bars, scatter, cycle };
type IdleCase = (typeof idleCases.cases)[number];
/** Draws one idle case; `during` runs after the first dot to probe reentrancy. */
function drawIdle(row: IdleCase, during?: () => void): Dot[] {
  const binding = Reflect.apply(Reflect.get(factories, row.name), undefined, [
    row.options,
  ]);
  const definition = definitionOf(binding) as unknown as { draw: IdlePaint };
  const dots: Dot[] = [];
  definition.draw({
    surface: Object.freeze({
      ...surface,
      [chartAppearance]: Object.freeze({ pitch: row.pitch, scale: row.scale }),
    }),
    options: binding.options,
    timeMs: row.time,
    still: row.still,
    dot: (dot) => {
      dots.push(dot);
      if (dots.length === 1) during?.();
    },
    deltaMs: 16,
  });
  return dots;
}
/** One readable line per case, so a snapshot diff shows which recipe changed and how. */
function summarize(dots: readonly Dot[]): string {
  const round = (value: number) => Math.round(value * 100) / 100;
  const range = (pick: (dot: Dot) => number) => {
    const values = dots.map(pick);
    return `${round(Math.min(...values))}..${round(Math.max(...values))}`;
  };
  const meanOpacity =
    dots.reduce((sum, dot) => sum + dot.opacity, 0) / dots.length;
  const accent = dots.filter((dot) => dot.tone === 'accent').length;
  return `${dots.length} dots; x ${range((d) => d.x)}; y ${range((d) => d.y)}; size ${range((d) => d.size)}; opacity ${range((d) => d.opacity)} mean ${round(meanOpacity)}; accent ${accent}`;
}
test('chart idle recipes draw finite, bounded, deterministic dots for every case', () => {
  const summaries: Record<string, string> = {};
  for (const row of idleCases.cases) {
    const dots = drawIdle(row);
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(Number.isFinite(dot.x) && Number.isFinite(dot.y)).toBe(true);
      expect(dot.size).toBeGreaterThan(0);
      // Opacity may overshoot slightly; the painter clamps it to 0..1.
      expect(Number.isFinite(dot.opacity)).toBe(true);
      expect(dot.x).toBeGreaterThanOrEqual(-dot.size);
      expect(dot.x).toBeLessThanOrEqual(bounds.width + dot.size);
      expect(dot.y).toBeGreaterThanOrEqual(-dot.size);
      expect(dot.y).toBeLessThanOrEqual(bounds.height + dot.size);
    }
    expect(drawIdle(row)).toEqual(dots);
    summaries[
      `${row.name} ${JSON.stringify(row.options)} t=${row.time}${row.still ? ' still' : ''} pitch=${row.pitch} scale=${row.scale}`
    ] = summarize(dots);
  }
  // Review changes with `bun test --update-snapshots` and a diff of the .snap file.
  expect(summaries).toMatchSnapshot();
});

test('a nested chart paint during drawing leaves the outer output unchanged', () => {
  const nested = cycle({ holdMs: 800, blendMs: 200 });
  const nestedDefinition = definitionOf(nested) as unknown as {
    draw: IdlePaint;
  };
  for (const row of idleCases.cases)
    expect(
      drawIdle(row, () =>
        nestedDefinition.draw({
          surface,
          options: nested.options,
          timeMs: 1900,
          still: false,
          dot: () => {},
          deltaMs: 16,
        }),
      ),
    ).toEqual(drawIdle(row));
});

test('presets expose implemented surface controls while keeping chart variant family-specific', () => {
  expect(definePreset({ kind: 'skeleton', speed: 0.5 }).speed).toBe(0.5);
  expect(
    definePreset({ kind: 'text', pointerResponse: 'lift' }).pointerResponse,
  ).toBe('lift');
  expect(() =>
    definePreset({ kind: 'skeleton', variant: 'line' } as never),
  ).toThrow();
  expect(() =>
    definePreset({ kind: 'text', variant: 'bar' } as never),
  ).toThrow();
});

test('numeric chart factories snapshot getters once and reject invalid plain-data inputs', () => {
  let reads = 0;
  const input = {
    get amplitude() {
      reads++;
      return 0.3;
    },
  };
  const binding = ridge(input);
  expect(reads).toBe(1);
  expect(binding.options.amplitude).toBe(0.3);
  expect(Object.isFrozen(binding)).toBe(true);
  expect(Object.isFrozen(binding.options)).toBe(true);
  for (const bad of [
    null,
    [],
    new Date(),
    { amplitude: Infinity },
    { amplitude: '0.3' },
    { extra: 1 },
    { [Symbol('unsupported')]: { mutable: true } },
    Object.defineProperty({}, 'extra', { value: 1 }),
  ])
    expect(() => Reflect.apply(ridge, undefined, [bad])).toThrow(TypeError);
});

test('Cycle keeps every hold/blend/wrap phase finite, including Scatter and paused frames', () => {
  for (const options of [
    {},
    { holdMs: 800, blendMs: 200 },
    { holdMs: 3200, blendMs: 600 },
  ]) {
    const binding = cycle(options);
    const definition = definitionOf(binding) as unknown as { draw: IdlePaint };
    const step = binding.options.holdMs + binding.options.blendMs;
    for (const phase of [0, 1, 2, 3, 4, 5])
      for (const offset of [
        0,
        binding.options.holdMs - 1,
        binding.options.holdMs,
        binding.options.holdMs + binding.options.blendMs / 2,
        step - 1,
      ])
        for (const still of [false, true]) {
          const dots: Dot[] = [];
          definition.draw({
            surface,
            options: binding.options,
            timeMs: phase * step + offset,
            still,
            dot: (d) => dots.push(d),
            deltaMs: 16,
          });
          expect(dots.length).toBeGreaterThan(500);
          expect(dots.length).toBeLessThanOrEqual(4096);
          expect(
            dots.every(
              (d) =>
                [d.x, d.y, d.size, d.opacity].every(Number.isFinite) &&
                d.opacity >= 0 &&
                d.size >= 0 &&
                d.size <= 32,
            ),
          ).toBe(true);
        }
  }
});
