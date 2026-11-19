import { expect, test } from 'bun:test';
import type { AnimationSurface, HandoffDefinition } from '../src/animations.js';
import { definitionOf } from '../src/internal/binding.js';
import { renderStatic } from '../src/server.js';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
} from '../src/text-animations.js';
import { LoaderConfigurationError } from '../src/types.js';

const surface: AnimationSurface<'text'> = {
  family: 'text',
  width: 100,
  height: 20,
  input: {
    shapes: [],
    mask: [],
    value: Array.from({ length: 10 }, (_, i) => ({
      character: String(i),
      bounds: { x: i * 10, y: 0, width: 10, height: 20 },
    })),
    precise: true,
  },
  source: [],
  revealTargetIds: [],
};
test('text recipes validate immutable options and preserve approved ranges', () => {
  // design/SPEC.md: a change every 280 ms.
  expect(scramble().options.changesPerSecond).toBe(1000 / 280);
  expect(scramble({ changesPerSecond: 50 }).options.changesPerSecond).toBe(4);
  expect(labelPulse({ travelPxPerSecond: 0 }).options.travelPxPerSecond).toBe(
    20,
  );
  // design/SPEC.md: characters lock left to right, each easing in over 300 ms.
  expect(lock().options).toEqual({
    staggerMs: 40,
    reelMs: 55,
    settleMs: 300,
    pop: 0,
  });
  expect(Object.isFrozen(lock().options)).toBe(true);
  for (const options of [
    { pop: NaN },
    { pop: Infinity },
    { unknown: 1 },
    { toString: 1 },
    [],
    null,
  ])
    expect(() => lock(options as never)).toThrow(LoaderConfigurationError);
});
test('lock and print totals include bounded stagger, reel, settle and tail', () => {
  const get = (binding: ReturnType<typeof lock>) =>
    definitionOf(binding) as unknown as HandoffDefinition<
      'text',
      object,
      unknown
    >;
  // Ten characters: 9 × 40 ms stagger + 55 ms reel + 300 ms lock + 100 ms tail.
  expect(get(lock()).duration(surface, lock().options)).toBe(815);
  expect(get(printText()).duration(surface, printText().options)).toBeCloseTo(
    180 + 815 / 1.5,
  );
  expect(
    get(lock()).duration(
      { ...surface, input: { ...surface.input, precise: false } },
      lock().options,
    ),
  ).toBe(150);
  expect(get(fade()).duration(surface, fade().options)).toBe(150);
});
test('static text is escaped once, decorative masks are inert and zero/empty remain valid', () => {
  const long = 'x'.repeat(10000);
  expect(
    renderStatic({ kind: 'text-loader', text: long, state: 'pending' }).split(
      long,
    ).length,
  ).toBe(2);
  const html = renderStatic({
    kind: 'text-loader',
    text: '<strong>&',
    mask: '$000',
    state: 'pending',
  });
  expect(html).toContain('&lt;strong&gt;&amp;');
  expect(html).toContain(
    'data-dotquilt-text-placeholder aria-hidden="true" inert',
  );
  expect(html).not.toContain('content:attr(mask)');
  expect(renderStatic({ kind: 'text-loader', text: 0 })).toContain('>0</span>');
  expect(renderStatic({ kind: 'text-loader', text: '' })).toContain(
    'data-dotquilt-text-content></span>',
  );
  expect(() => renderStatic({ kind: 'text-loader', text: NaN })).toThrow(
    LoaderConfigurationError,
  );
});

test('first-party command intrinsics stay finite and bounded at every option endpoint', () => {
  type Commands = {
    dot(value: import('../src/animations.js').Dot): void;
    reveal(value: import('../src/animations.js').RevealFrame): void;
  };
  type Recipe = {
    prepare(surface: AnimationSurface<'text'>, options: object): unknown;
    frame(
      context: Commands & {
        surface: AnimationSurface<'text'>;
        prepared: unknown;
        progress: number;
        timeMs: number;
      },
      options: object,
    ): void;
  };
  for (const binding of [
    lock({ staggerMs: 0, reelMs: 0, settleMs: 40, pop: 0 }),
    lock({ staggerMs: 40, reelMs: 100, settleMs: 180, pop: 0.3 }),
    printText({ staggerMs: 0, reelMs: 0, settleMs: 40, pop: 0 }),
    printText({ staggerMs: 40, reelMs: 100, settleMs: 180, pop: 0.3 }),
    fade({ duration: 0 }),
    fade({ duration: 4000 }),
  ]) {
    const recipe = definitionOf(binding) as unknown as Recipe;
    for (const precise of [true, false]) {
      const input = {
        ...surface,
        input: { ...surface.input, precise },
        source: [{ x: 1, y: 1, size: 1, opacity: 0.5, tone: 'base' as const }],
      };
      const prepared = recipe.prepare(input, binding.options);
      for (const progress of [0, 0.01, 0.25, 0.55, 0.8, 0.99, 1]) {
        let dots = 0,
          reveals = 0;
        recipe.frame(
          {
            surface: input,
            prepared,
            progress,
            timeMs: progress * 1800,
            dot(value) {
              dots++;
              expect(
                [value.x, value.y, value.size, value.opacity].every(
                  Number.isFinite,
                ),
              ).toBe(true);
              expect(value.size).toBeGreaterThanOrEqual(0);
              expect(value.size).toBeLessThanOrEqual(32);
              expect(value.opacity).toBeGreaterThanOrEqual(0);
              expect(value.opacity).toBeLessThanOrEqual(1);
            },
            reveal(value) {
              reveals++;
              expect(Number.isFinite(value.opacity)).toBe(true);
              expect(value.opacity).toBeGreaterThanOrEqual(0);
              expect(value.opacity).toBeLessThanOrEqual(1);
              expect(Math.abs(value.translateY ?? 0)).toBeLessThanOrEqual(8);
              expect(value.clipStart ?? 1).toBeGreaterThanOrEqual(0);
              expect(value.clipStart ?? 1).toBeLessThanOrEqual(1);
            },
          },
          binding.options,
        );
        expect(dots).toBeLessThanOrEqual(4096);
        expect(reveals).toBe(1);
      }
    }
  }
});
