import { describe, expect, test } from 'bun:test';
import { defineAnimation } from '../src/animations.js';
import { definitionOf } from '../src/internal/binding.js';
import { renderStatic, skeletonStyles } from '../src/server.js';
import { dissolve, pulse } from '../src/skeleton-animations.js';
import { LoaderConfigurationError } from '../src/types.js';

describe('pure package contracts', () => {
  test('server output is escaped, deterministic and under the primitive raw ceiling', () => {
    expect(renderStatic({ kind: 'skeleton-block' })).toBe(
      renderStatic({ kind: 'skeleton-block' }),
    );
    expect(
      new TextEncoder().encode(renderStatic({ kind: 'skeleton-block' })).length,
    ).toBeLessThanOrEqual(1024);
    expect(
      renderStatic({ kind: 'region', label: '<a "x"> &', state: 'pending' }),
    ).toContain('&lt;a &quot;x&quot;&gt; &amp;');
    expect(
      renderStatic({
        kind: 'skeleton-block',
        stylePolicy: { mode: 'inline', nonce: '"><script>' },
      }),
    ).not.toContain('"><script>');
    expect(() =>
      renderStatic({
        kind: 'skeleton-block',
        stylePolicy: { mode: 'external', href: 'javascript:evil()' },
      }),
    ).toThrow();
    expect(skeletonStyles.join('')).not.toContain('unsafe-inline');
  });
  test('bindings copy and freeze normalized data, reject malformed authoring', () => {
    const mutable = { amplitude: 0.2 };
    const factory = defineAnimation({
      contractVersion: 1,
      id: 'test/custom',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => mutable },
      frame() {},
      still() {},
    });
    const binding = factory();
    mutable.amplitude = 0.8;
    expect(binding.options.amplitude).toBe(0.2);
    expect(Object.isFrozen(binding.options)).toBe(true);
    expect(() => pulse({ periodMs: Number.NaN })).toThrow();
    expect(() => defineAnimation({ contractVersion: 2 } as never)).toThrow();
    expect(dissolve().options).toEqual({ duration: 300, fallPx: 5 });
    expect(dissolve({ fallPx: 99 }).options.fallPx).toBe(8);
    expect(dissolve({ fallPx: -1 }).options.fallPx).toBe(0);
    expect(() => dissolve({ fallPx: Number.NaN })).toThrow();
    expect(Object.isFrozen(dissolve().options)).toBe(true);
  });
  test('all general and browser entries can be imported with no DOM globals or registration', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    for (const entry of [
      'index',
      'skeleton',
      'region',
      'animations',
      'server',
      'chart',
      'chart-animations',
      'register-all',
      'text',
      'text-animations',
      'table',
      'table-animations',
      'typing',
    ])
      await import(`../src/${entry}.ts`);
    const { registerAll } = await import('../src/register-all.js');
    expect(() => registerAll()).toThrow('Registration requires a browser');
  });
});

test('malformed animation definitions fail during setup with a typed configuration diagnostic', () => {
  const valid = {
    contractVersion: 1,
    id: 'test/invalid-schema',
    family: 'skeleton',
    phase: 'idle',
    frame() {},
    still() {},
  };
  for (const input of [
    null,
    undefined,
    { ...valid, options: { parse: 1 } },
    { ...valid, options: { parse: 'callback' } },
  ]) {
    let error: unknown;
    try {
      defineAnimation(input as never);
    } catch (failure) {
      error = failure;
    }
    expect(error).toBeInstanceOf(LoaderConfigurationError);
    expect((error as LoaderConfigurationError).code).toBe('invalid-definition');
  }
});

test('server requests keep nonce policies isolated and never serialize application callbacks', async () => {
  const output = await Promise.all(
    ['first', 'second'].map(async (nonce) =>
      renderStatic({
        kind: 'region',
        state: 'pending',
        stylePolicy: { mode: 'inline', nonce },
        placeholder: {
          kind: 'skeleton-block',
          stylePolicy: { mode: 'inline', nonce },
        },
      }),
    ),
  );
  expect(output[0]).toContain('nonce="first"');
  expect(output[0]).not.toContain('second');
  expect(output[1]).toContain('nonce="second"');
  expect(output[1]).not.toContain('first');
  expect(() =>
    renderStatic({ kind: 'region', state: 'error' } as never),
  ).toThrow();
  expect(() => renderStatic({ kind: 'unknown' } as never)).toThrow();
});

test('authoring adapters retain frozen captured callbacks and revoke late reveal commands', () => {
  const calls: string[] = [];
  let late: (() => void) | undefined;
  const definition = {
    contractVersion: 1 as const,
    id: 'test/captured-handoff',
    family: 'chart' as const,
    phase: 'handoff' as const,
    options: { parse: () => ({ gain: 0.5 }) },
    duration: () => 500,
    prepare: () => Object.freeze({ count: 1 }),
    frame(
      ctx: import('../src/animations.js').HandoffContext<
        'chart',
        { count: number }
      >,
    ): undefined {
      calls.push('captured');
      expect(Object.isFrozen(ctx)).toBe(true);
      expect(Object.isFrozen(ctx.frame)).toBe(true);
      expect(ctx.frame).toEqual({
        timeMs: 250,
        deltaMs: 16,
        linearProgress: 0.5,
        progress: 0.4,
        static: false,
      });
      late = () => {
        ctx.reveal({ opacity: 1 });
        ctx.revealTarget('one', { opacity: 1 });
      };
      ctx.reveal({ opacity: 0.4 });
      ctx.revealTarget('one', { opacity: 0.4 });
    },
  };
  const factory = defineAnimation(definition);
  definition.frame = () => {
    calls.push('mutated');
  };
  definition.options.parse = () => ({ gain: 99 });
  const binding = factory();
  expect(binding.options).toEqual({ gain: 0.5 });
  const captured = definitionOf(binding) as unknown as {
    draw: import('../src/internal/paint.js').HandoffPaint;
  };
  const surface = Object.freeze({
    family: 'chart' as const,
    width: 100,
    height: 100,
    input: Object.freeze({
      kind: 'scatter' as const,
      points: Object.freeze([]),
    }),
    source: Object.freeze([]),
    revealTargetIds: Object.freeze(['one']),
  });
  captured.draw({
    surface,
    options: binding.options,
    prepared: Object.freeze({ count: 1 }),
    linear: 0.5,
    progress: 0.4,
    duration: 500,
    deltaMs: 16,
    dot: () => {},
    reveal: () => {
      calls.push('reveal');
    },
    revealTarget: () => {
      calls.push('target');
    },
  });
  late?.();
  expect(calls).toEqual(['captured', 'reveal', 'target']);
});
