import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import type { Dot } from '../src/animations';
import { acquireProjection } from '../src/internal/dense/projection';
import { prepareRecipe } from '../src/internal/dense/recipes';
import { lease } from '../src/internal/dense/resources';
import recipeCommands from './fixtures/recipe-commands.json';

const line = {
  family: 'chart',
  input: {
    kind: 'line',
    points: [
      { x: 0, y: 2 },
      { x: 30, y: 5 },
    ],
    baseline: 20,
  },
};
test('prepared recipes preserve pre-optimization ordered dots and content/row reveal commands', () => {
  for (const fixture of recipeCommands.cases) {
    const projection = acquireProjection(() => fixture.projection);
    if (!projection.value) throw new Error('Missing golden projection');
    const plan = prepareRecipe(projection.value, 320, 160);
    const output: unknown[] = [];
    const dot = (v: Dot) =>
      output.push([
        Math.fround(v.x),
        Math.fround(v.y),
        Math.fround(v.size),
        Math.fround(v.opacity),
        v.tone,
      ]);
    for (const still of [false, true])
      for (const time of [0, 350, 925]) plan.idle(time, dot, still);
    for (const progress of [0, 0.2, 0.55, 0.65, 0.9, 1])
      plan.handoff(
        progress,
        dot,
        (value) => output.push(['content', value]),
        (id, value) => output.push([id, value]),
        ['row'],
      );
    expect(
      createHash('sha256').update(JSON.stringify(output)).digest('hex'),
    ).toBe(fixture.sha256);
  }
});
test('dense projection is copied/frozen and a later caller mutation cannot alter a plan', () => {
  const mutable = structuredClone(line);
  const result = acquireProjection(() => mutable);
  expect(result.attempts).toBe(1);
  expect(result.consumed).toBe(2);
  if (result.value?.family !== 'chart' || result.value.input.kind !== 'line')
    throw new Error('Missing projection');
  const x = mutable.input.points[0]?.x;
  if (mutable.input.points[0]) mutable.input.points[0].x = 25;
  expect(result.value.input.points[0]?.x).toBe(x);
  expect(Object.isFrozen(result.value.input.points)).toBe(true);
});
test('provider acquisition is bounded, fails closed and does not disclose callback errors', () => {
  let attempts = 0;
  const missing = acquireProjection(() => {
    attempts++;
    return null;
  });
  expect(attempts).toBe(2);
  expect(missing.attempts).toBe(2);
  let errors = 0;
  const thrown = acquireProjection(() => {
    errors++;
    throw new Error('private provider payload');
  });
  expect(errors).toBe(1);
  expect(thrown.issue).toBe('provider-failed');
  const over = acquireProjection(() => ({
    family: 'chart',
    input: {
      kind: 'scatter',
      points: Array.from({ length: 2049 }, () => ({ x: 0, y: 0 })),
    },
  }));
  expect(over.value).toBe(null);
  expect(over.consumed).toBe(0);
});
test('all three chart shapes validate and nonfinite geometry fails', () => {
  for (const input of [
    { kind: 'line', points: [{ x: 1, y: 2 }], baseline: 10 },
    { kind: 'bar', bars: [{ x: 1, y: 2, width: 3, height: 4 }], baseline: 10 },
    { kind: 'scatter', points: [{ x: 1, y: 2 }] },
  ])
    expect(
      acquireProjection(() => ({ family: 'chart', input })).value,
    ).not.toBe(null);
  expect(
    acquireProjection(() => ({
      family: 'chart',
      input: { kind: 'line', points: [{ x: Number.NaN, y: 1 }], baseline: 10 },
    })).value,
  ).toBe(null);
});
test('nested table glyphs count against the same 2048 item limit', () => {
  const glyph = { character: '2', bounds: { x: 0, y: 0, width: 5, height: 7 } };
  const cell = {
    bounds: glyph.bounds,
    text: '2',
    baseline: 7,
    tone: 'base',
    rowId: 'row',
    rowIndex: 0,
    columnIndex: 0,
    kind: 'number',
    glyphs: Array.from({ length: 2048 }, () => glyph),
  };
  const result = acquireProjection(() => ({ family: 'table', cells: [cell] }));
  expect(result.value).toBe(null);
  expect(result.consumed).toBe(2048);
});
test('unsupported or oversized precise text uses generic presentation without changing application text', () => {
  const glyph = { character: 'א', bounds: { x: 0, y: 0, width: 5, height: 7 } };
  const r = acquireProjection(() => ({
    family: 'text',
    mask: [glyph],
    value: [glyph],
    precise: true,
  }));
  expect(r.value?.family === 'text' && r.value.precise).toBe(false);
  expect(glyph.character).toBe('א');
  const long = acquireProjection(() => ({
    family: 'text',
    mask: Array.from({ length: 257 }, () => ({ ...glyph, character: '2' })),
    value: [],
    precise: true,
  }));
  expect(long.value?.family === 'text' && long.value.precise).toBe(false);
});
test('document resource admission accounts compatible leases and transient capacity before growth', () => {
  const doc = {} as Document;
  const issues: string[] = [];
  const a = lease(doc, (c) => issues.push(c)),
    b = lease(doc, (c) => issues.push(c));
  expect(a.set('dots', 4096)).toBe(true);
  expect(a.set('dots', 4097)).toBe(false);
  expect(a.set('bytes', 262144)).toBe(true);
  expect(a.set('bytes', 262145)).toBe(false);
  expect(a.set('pixels', 1048576)).toBe(true);
  expect(b.set('pixels', 1048576)).toBe(true);
  a.close();
  a.close();
  expect(a.set('dots', 1)).toBe(false);
  b.close();
  expect(Reflect.has(doc, Symbol.for('dotquilt.v1.dot-ledger'))).toBe(false);
  expect(issues).toEqual(['dots-limit', 'bytes-limit']);
});
test('representative recipe is deterministic and its source is immutable, bounded and finite', () => {
  const result = acquireProjection(() => line);
  if (!result.value) throw new Error('Missing fixture');
  const plan = prepareRecipe(result.value, 320, 160);
  expect(plan.source.length).toBe(360);
  expect(Object.isFrozen(plan.source)).toBe(true);
  const points: unknown[] = [];
  plan.handoff(
    0.55,
    (dot) => points.push(dot),
    () => {},
    () => {},
    [],
  );
  expect(points.length).toBe(360);
  expect(JSON.stringify(points)).not.toContain('null');
});

test('line convergence stays on supplied segments, including descending and vertical data', () => {
  const projection = acquireProjection(() => ({
    family: 'chart',
    input: {
      kind: 'line',
      baseline: 40,
      points: [
        { x: 30, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 30 },
      ],
    },
  }));
  if (!projection.value) throw new Error('Missing line projection');
  const plan = prepareRecipe(projection.value, 320, 160);
  let count = 0;
  plan.handoff(
    0.65,
    (dot) => {
      count++;
      expect(dot.x).toBeGreaterThanOrEqual(10 - 1e-10);
      expect(dot.x).toBeLessThanOrEqual(30 + 1e-10);
      expect(dot.y).toBeGreaterThanOrEqual(10 - 1e-10);
      expect(dot.y).toBeLessThanOrEqual(30 + 1e-10);
      expect(Math.abs(dot.y - 10) < 1e-10 || Math.abs(dot.x - 10) < 1e-10).toBe(
        true,
      );
    },
    () => {},
    () => {},
    [],
  );
  expect(count).toBe(360);
});
