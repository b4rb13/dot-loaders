import { expect, test } from 'bun:test';
import type { AnimationSurface, Dot } from '../src/animations.js';
import { defineAnimation, definePreset } from '../src/animations.js';
import { definitionOf } from '../src/internal/binding.js';
import type { HandoffPaint, IdlePaint } from '../src/internal/paint.js';
import { tableCellStyles } from '../src/internal/table-factory.js';
import {
  tableCells,
  tableColumns,
  tableRows,
} from '../src/internal/table-model.js';
import { tableProjection } from '../src/internal/table-projection.js';
import { renderStatic } from '../src/server.js';
import type { TableInput, TableTargetProvider } from '../src/table.js';
import { rows, tableShimmer, typeOn } from '../src/table-animations.js';

const bounds = { width: 320, height: 160 };
const sample: TableInput = {
  kind: 'table',
  cells: [
    {
      bounds: { x: 0, y: 0, width: 100, height: 32 },
      text: 'A',
      baseline: 24,
      tone: 'accent',
      rowId: 'a',
      rowIndex: 0,
      columnIndex: 0,
      kind: 'text',
      glyphs: [
        { character: 'A', bounds: { x: 5, y: 5, width: 12, height: 18 } },
      ],
    },
  ],
};
test('table admits columns first, clamps rows/product and never reads excess column getters', () => {
  let reads = 0;
  const columns = Array.from({ length: 21 }, (_, i) =>
    i === 20
      ? {
          get kind() {
            reads++;
            throw new Error();
          },
        }
      : { kind: 'text', width: 1 },
  ) as never;
  const out = tableColumns(columns);
  expect(out).toHaveLength(20);
  expect(reads).toBe(0);
  expect(tableRows(100, 20)).toBe(50);
  expect(tableCells(320, 50, 32, out).cells).toHaveLength(1000);
  expect(Object.isFrozen(out[0])).toBe(true);
  expect(tableColumns([{ kind: 'text', width: Infinity }])).toHaveLength(3);
  const huge = tableCells(
    320,
    5,
    32,
    tableColumns([
      { kind: 'text', width: 1e308 },
      { kind: 'text', width: 1e308 },
    ]),
  );
  expect(huge.cells[0]?.bounds.width).toBe(160);
});
test('semantic geometry is copied/frozen, null alone permits a second attempt and legacy inputs remain accepted', () => {
  let calls = 0;
  const s = tableProjection(
    () => (++calls === 1 ? null : sample),
    bounds,
    () => {},
  );
  expect(calls).toBe(2);
  expect(s).toEqual(sample);
  expect(s).not.toBe(sample);
  expect(Object.isFrozen(s.cells[0]?.glyphs[0]?.bounds)).toBe(true);
  for (const input of [
    { kind: 'points', points: [{ x: 0, y: 0 }] },
    { kind: 'rects', rects: [{ x: 0, y: 0, width: 0, height: 0 }] },
  ]) {
    const errors: string[] = [];
    expect(
      tableProjection((() => input) as TableTargetProvider, bounds, (c) =>
        errors.push(c),
      ).cells,
    ).toEqual([]);
    expect(errors).toEqual([]);
  }
});
test('malformed, unsupported, async and oversized nested geometry fail once before copying excess data', () => {
  const invalid = [
    Promise.resolve(sample),
    { kind: 'table', cells: [{ ...sample.cells[0], text: '漢字' }] },
    { kind: 'table', cells: Array(1001).fill(sample.cells[0]) },
    {
      kind: 'table',
      cells: [
        {
          ...sample.cells[0],
          glyphs: Array(2048).fill(sample.cells[0]?.glyphs[0]),
        },
      ],
    },
    {
      kind: 'table',
      cells: [
        { ...sample.cells[0], bounds: { x: NaN, y: 0, width: 10, height: 10 } },
      ],
    },
  ];
  for (const v of invalid) {
    let calls = 0;
    const errors: string[] = [];
    expect(
      tableProjection(
        (() => {
          calls++;
          return v;
        }) as TableTargetProvider,
        bounds,
        (c) => errors.push(c),
      ).cells,
    ).toEqual([]);
    expect(calls).toBe(1);
    expect(errors).toEqual(['invalid-geometry']);
  }
});
test('typed built-in options clamp finite numbers, reject every unknown own key and capture getters once', () => {
  expect(typeOn({ cadenceMs: 0, cellStyle: 'badge-text' }).options).toEqual({
    cadenceMs: 250,
    cellStyle: 'badge-text',
  });
  expect(rows({ settlePx: 99, staggerMs: -1 }).options).toEqual({
    settlePx: 8,
    staggerMs: 0,
  });
  for (const value of [
    { typo: 1 },
    { cadenceMs: NaN },
    { cellStyle: 'invalid' },
    { [Symbol('extra')]: 1 },
    Object.defineProperty({}, 'extra', { value: 1 }),
    null,
  ])
    expect(() => typeOn(value as never)).toThrow();
  let reads = 0;
  const b = typeOn({
    get cadenceMs() {
      reads++;
      return 600;
    },
  });
  expect(reads).toBe(1);
  expect(Object.isFrozen(b.options)).toBe(true);
  expect(definePreset({ kind: 'table', animations: { idle: b } }).kind).toBe(
    'table',
  );
});
test('every idle/style draws bounded finite static and moving commands with distinct temporal output', () => {
  const surface: AnimationSurface<'table'> = {
    family: 'table',
    ...bounds,
    input: tableCells(320, 5, 32, tableColumns(undefined)),
    source: [],
    revealTargetIds: [],
  };
  for (const factory of [typeOn, tableShimmer])
    for (const cellStyle of tableCellStyles) {
      const binding = factory({ cellStyle: cellStyle as 'auto' }),
        def = definitionOf(binding) as unknown as { draw: IdlePaint };
      const draw = (t: number, still = false) => {
        const dots: Dot[] = [];
        def.draw({
          surface,
          options: binding.options,
          timeMs: t,
          still,
          dot: (d) => dots.push(d),
          deltaMs: 0,
        });
        return dots;
      };
      const a = draw(0),
        b = draw(750);
      expect(a.length).toBeGreaterThan(0);
      expect(a.length).toBeLessThanOrEqual(4096);
      expect(a).not.toEqual(b);
      expect(draw(0, true)).toEqual(draw(999, true));
      expect(
        a.every((d) =>
          Object.values(d)
            .filter((v) => typeof v === 'number')
            .every(Number.isFinite),
        ),
      ).toBe(true);
    }
});
test('row choreography converges into supplied glyphs, fades decoration, reveals targets and preserves total/fallback timing', () => {
  const surface: AnimationSurface<'table'> = {
    family: 'table',
    ...bounds,
    input: sample,
    source: [{ x: 12, y: 15, size: 2, opacity: 0.5, tone: 'base' }],
    revealTargetIds: ['a'],
  };
  const binding = rows(),
    def = definitionOf(binding) as unknown as {
      duration: (s: typeof surface, o: object) => number;
      prepare: (s: typeof surface, o: object) => unknown;
      draw: HandoffPaint;
    };
  expect(def.duration(surface, binding.options)).toBe(615);
  const plan = def.prepare(surface, binding.options);
  expect(Object.isFrozen(plan)).toBe(true);
  const dots: Dot[] = [],
    targets: object[] = [];
  def.draw({
    surface,
    options: binding.options,
    prepared: plan,
    linear: 1,
    progress: 1,
    duration: 615,
    deltaMs: 0,
    dot: (d) => dots.push(d),
    reveal: () => {},
    revealTarget: (id, f) => targets.push({ id, ...f }),
  });
  expect(targets).toEqual([{ id: 'a', opacity: 1, translateY: 0 }]);
  expect(dots.every((d) => d.opacity === 0)).toBe(true);
  expect(
    def.duration({ ...surface, revealTargetIds: [] }, binding.options),
  ).toBe(150);
});
test('static output is bounded, decorative, DOM-free and never serializes providers or content', () => {
  for (const d of [
    { kind: 'table-loader' as const },
    {
      kind: 'table-loader' as const,
      rows: 100,
      columns: Array.from({ length: 20 }, () => ({ kind: 'text' as const })),
    },
  ]) {
    const html = renderStatic(d);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('undefined');
    expect(
      Buffer.byteLength(html.replace(/<style[\s\S]*?<\/style>/g, '')),
    ).toBeLessThan(2048);
  }
  const custom = defineAnimation({
    contractVersion: 1,
    id: 'test/table',
    family: 'table',
    phase: 'idle',
    options: { parse: () => ({}) },
    still() {},
    frame(ctx) {
      const cells = ctx.surface.input.cells;
      void cells;
    },
  });
  expect(custom().family).toBe('table');
});

test('sparse and inconsistent row identities are rejected before specialized preparation', () => {
  const c = sample.cells[0];
  if (!c) throw new Error();
  for (const cells of [
    Array(2),
    [{ ...c }, { ...c, columnIndex: 1, rowId: 'other' }],
    [{ ...c }, { ...c, rowIndex: 1 }],
  ]) {
    const errors: string[] = [];
    expect(
      tableProjection(
        () => ({ kind: 'table', cells }),
        bounds,
        (c) => errors.push(c),
      ).cells,
    ).toEqual([]);
    expect(errors).toEqual(['invalid-geometry']);
  }
});
test('unmatched outgoing dots fade instead of vanishing at the first frame', () => {
  const surface: AnimationSurface<'table'> = {
    family: 'table',
    ...bounds,
    input: sample,
    source: [{ x: 200, y: 100, size: 2, opacity: 0.5, tone: 'base' }],
    revealTargetIds: ['a'],
  };
  const binding = rows(),
    def = definitionOf(binding) as unknown as {
      prepare: (s: typeof surface) => unknown;
      draw: HandoffPaint;
    };
  const plan = def.prepare(surface),
    dots: Dot[] = [];
  def.draw({
    surface,
    options: binding.options,
    prepared: plan,
    linear: 0,
    progress: 0,
    duration: 615,
    deltaMs: 0,
    dot: (d) => dots.push(d),
    reveal: () => {},
    revealTarget: () => {},
  });
  expect(
    dots.some((d) => d.x === 200 && d.y === 100 && d.opacity === 0.5),
  ).toBe(true);
});
