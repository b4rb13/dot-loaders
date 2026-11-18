import { expect, test } from 'bun:test';
import type { AnimationSurface, Dot } from '../src/animations.js';
import { definitionOf } from '../src/internal/binding.js';
import type { TextDraw } from '../src/internal/text-definitions.js';
import { renderStatic } from '../src/server.js';
import {
  type ScrambleOptions,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from '../src/text-animations.js';
import { LoaderConfigurationError } from '../src/types.js';

type Idle = ReturnType<typeof scramble>;
const textSurface = (text: string, precise = true): AnimationSurface<'text'> =>
  Object.freeze({
    family: 'text',
    width: text.length * 10,
    height: 20,
    input: Object.freeze({
      precise,
      shapes: [],
      value: [],
      mask: Object.freeze(
        Array.from(text, (character, i) =>
          Object.freeze({
            character,
            bounds: Object.freeze({ x: i * 10, y: 0, width: 10, height: 20 }),
          }),
        ),
      ),
    }),
    source: [],
    revealTargetIds: [],
  });
function draw(
  binding: Idle,
  text: string,
  timeMs: number,
  precise = true,
  still = false,
) {
  const dots: Dot[] = [];
  const recipe = definitionOf(binding) as unknown as {
    frame(context: TextDraw, options: ScrambleOptions): void;
    still(context: TextDraw, options: ScrambleOptions): void;
  };
  recipe[still ? 'still' : 'frame'](
    { surface: textSurface(text, precise), timeMs, dot: (d) => dots.push(d) },
    binding.options,
  );
  return dots;
}
function cells(dots: Dot[]) {
  const result: string[] = [];
  for (let i = 0; i < dots.length; i += 35)
    result.push(JSON.stringify(dots.slice(i, i + 35)));
  return result;
}
test('optional scramble factories validate frozen cadence options without changing the default', () => {
  expect(scramble().id).toBe('dotquilt/scramble');
  for (const factory of [scrambleCharacters, scrambleWords]) {
    const binding = factory();
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(binding.options)).toBe(true);
    expect(binding.options.changesPerSecond).toBe(2.8);
    expect(factory({ changesPerSecond: 0 }).options.changesPerSecond).toBe(0.5);
    expect(factory({ changesPerSecond: 100 }).options.changesPerSecond).toBe(4);
    for (const invalid of [
      null,
      [],
      { unexpected: 1 },
      { changesPerSecond: NaN },
      { changesPerSecond: Infinity },
    ])
      expect(() => factory(invalid as never)).toThrow(LoaderConfigurationError);
  }
});
test('characters change on independent phases, deterministically and without changing spacing or punctuation', () => {
  const text = 'ABCDEFGHIJ 0123456789!';
  const binding = scrambleCharacters({ changesPerSecond: 1 });
  let previous = cells(draw(binding, text, 0));
  const transitions: number[][] = [];
  for (let t = 10; t <= 2100; t += 10) {
    const next = cells(draw(binding, text, t));
    const changed = next.flatMap((s, i) => (s === previous[i] ? [] : [i]));
    if (changed.length) transitions.push(changed);
    expect(next[10]).toBe(previous[10]);
    expect(next[21]).toBe(previous[21]);
    previous = next;
  }
  expect(transitions.length).toBeGreaterThan(15);
  expect(transitions.every((changed) => changed.length < 20)).toBe(true);
  expect(new Set(transitions.flat()).size).toBe(20);
  expect(draw(binding, text, 1234)).toEqual(draw(binding, text, 1234));
  // Seeking backward does not depend on previously rendered frames or Math.random.
  const first = draw(binding, text, 0);
  draw(binding, text, 99999);
  expect(draw(binding, text, 0)).toEqual(first);
});
test('words update one whitespace-delimited group per step, then wrap, retaining other groups', () => {
  const text = '  ALPHA  BRAVO! 123  ';
  const binding = scrambleWords({ changesPerSecond: 2 });
  let previous = cells(draw(binding, text, 0));
  const groups = [
    [2, 3, 4, 5, 6],
    [9, 10, 11, 12, 13],
    [16, 17, 18],
  ];
  for (let step = 1; step <= 9; step++) {
    const next = cells(draw(binding, text, step * 500 + 1));
    const changed = next.flatMap((s, i) => (s === previous[i] ? [] : [i]));
    const expected = groups[(step - 1) % groups.length] ?? [];
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every((i) => expected.includes(i))).toBe(true);
    previous = next;
  }
});
test('both variants retain the original still frame, generic fallback and finite bounded commands', () => {
  for (const factory of [scrambleCharacters, scrambleWords])
    for (const text of [
      '',
      '   ',
      'A',
      '$000,000',
      'Hello world!',
      'A'.repeat(100),
    ]) {
      expect(draw(factory(), text, 999, false)).toEqual([]);
      expect(draw(factory(), text, 999, true, true)).toEqual(
        draw(scramble(), text, 0, true, true),
      );
      for (const rate of [0.5, 4])
        for (const time of [0, 1, 249, 1000, 3999, 1e9]) {
          const dots = draw(factory({ changesPerSecond: rate }), text, time);
          expect(dots.length).toBeLessThanOrEqual(3500);
          expect(
            dots.every(
              (dot) =>
                [dot.x, dot.y, dot.size, dot.opacity].every(Number.isFinite) &&
                dot.opacity >= 0 &&
                dot.opacity <= 1,
            ),
          ).toBe(true);
        }
    }
  const html = renderStatic({
    kind: 'text-loader',
    text: 'Actual content',
    mask: 'Loading words',
    state: 'pending',
  });
  expect(html).toContain(
    'data-dotquilt-text-placeholder aria-hidden="true" inert',
  );
  expect(html).toContain('Actual content');
});
