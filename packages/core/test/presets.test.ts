import { describe, expect, test } from 'bun:test';
import { definePreset } from '../src/animations.js';
import { renderStatic } from '../src/server.js';
import { pulse } from '../src/skeleton-animations.js';
import { LoaderConfigurationError } from '../src/types.js';

describe('family presets', () => {
  test('captures caller getters once before validating or storing defaults', () => {
    let reads = 0;
    const preset = definePreset({
      kind: 'chart',
      get speed() {
        reads++;
        return reads === 1 ? 0.7 : Number.NaN;
      },
    });
    expect(reads).toBe(1);
    expect(preset.speed).toBe(0.7);
  });
  test('server output resolves preset geometry and rejects cross-family configuration', () => {
    const typing = definePreset({ kind: 'typing', count: 5 });
    expect(
      renderStatic({ kind: 'typing-dots', preset: typing }).match(
        /class="dot"/g,
      ),
    ).toHaveLength(5);
    expect(
      renderStatic({ kind: 'typing-dots', preset: typing, count: 2 }).match(
        /class="dot"/g,
      ),
    ).toHaveLength(2);
    expect(
      renderStatic({
        kind: 'chart-loader',
        preset: definePreset({ kind: 'chart', variant: 'scatter' }),
      }),
    ).toContain('variant="scatter"');
    expect(() =>
      renderStatic({ kind: 'typing-dots', preset: { kind: 'chart' } } as never),
    ).toThrow(LoaderConfigurationError);
    expect(
      definePreset({
        kind: 'text',
        timing: { easing: 'cubic-bezier(.2, -1, .8, 2)' },
      }).timing?.easing,
    ).toBe('cubic-bezier(.2, -1, .8, 2)');
  });
  test('supports only relevant controls for all six families', () => {
    expect(
      definePreset({ kind: 'skeleton', speed: 0.6, pointerResponse: 'lift' })
        .speed,
    ).toBe(0.6);
    expect(
      definePreset({ kind: 'text', speed: 0.7, timing: { duration: 240 } })
        .timing?.duration,
    ).toBe(240);
    expect(
      definePreset({
        kind: 'region',
        timing: { easing: 'linear' },
        motion: 'paused',
      }).motion,
    ).toBe('paused');
    expect(definePreset({ kind: 'typing', count: 5, speed: 0.8 }).count).toBe(
      5,
    );
    expect(
      definePreset({ kind: 'chart', variant: 'scatter', speed: 0.5 }).variant,
    ).toBe('scatter');
    expect(
      definePreset({ kind: 'table', pointerResponse: 'lift' }).pointerResponse,
    ).toBe('lift');
  });

  test('captures immutable configuration without mutating the source', () => {
    const timing = { duration: 240, easing: 'linear' };
    const source = { kind: 'text' as const, timing, speed: 0.7 };
    const preset = definePreset(source);
    timing.duration = 500;
    source.speed = 2;
    expect(preset.timing?.duration).toBe(240);
    expect(preset.speed).toBe(0.7);
    expect(Object.isFrozen(preset)).toBe(true);
    expect(Object.isFrozen(preset.timing)).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
    const animations = { idle: pulse() };
    const skeleton = definePreset({ kind: 'skeleton', animations });
    expect(Object.isFrozen(skeleton.animations)).toBe(true);
    expect(skeleton.animations?.idle).toBe(animations.idle);
  });

  for (const value of [
    { kind: 'region', speed: 1 },
    { kind: 'typing', pointerResponse: 'lift' },
    { kind: 'skeleton', variant: 'line' },
    { kind: 'text', timing: { duration: -1 } },
    { kind: 'text', timing: { easing: 'url(unsafe)' } },
    { kind: 'text', timing: { easing: 'cubic-bezier(nope)' } },
    { kind: 'text', timing: { easing: 'cubic-bezier(2,0,0,1)' } },
    { kind: 'text', timing: { duration: 10, nonce: 'request' } },
    { kind: 'typing', count: 9 },
    { kind: 'chart', speed: Number.NaN },
    { kind: 'chart', motion: 'always' },
    {
      kind: 'skeleton',
      animations: { idle: { family: 'skeleton', phase: 'idle' } },
    },
    { kind: 'region', animations: { idle: pulse() } },
    ...[
      'state',
      'cycle',
      'stylePolicy',
      'targetProvider',
      'revealTargets',
      'onHandoffStart',
    ].map((key) => ({ kind: 'chart', [key]: 'forbidden' })),
  ]) {
    test(`rejects unsupported or invalid data: ${JSON.stringify(value)}`, () => {
      expect(() => definePreset(value as never)).toThrow(
        LoaderConfigurationError,
      );
    });
  }
});

// Optional authoring and stripped component consumers must enforce the same
// family keys; accepting an unknown own key would make those paths disagree.
test('preset keys include nonenumerable and symbol properties before capture', () => {
  for (const kind of [
    'skeleton',
    'region',
    'text',
    'chart',
    'table',
    'typing',
  ]) {
    for (const key of ['unrecognized', Symbol('unrecognized')]) {
      const value = Object.defineProperty({ kind }, key, { value: true });
      expect(() => definePreset(value as never)).toThrow(
        LoaderConfigurationError,
      );
    }
  }
});

test('nested preset getters are captured once and copied before freezing', () => {
  let durationReads = 0,
    bindingReads = 0;
  const idle = pulse();
  const timing = {
    get duration() {
      durationReads++;
      return 230;
    },
  };
  const animations = {
    get idle() {
      bindingReads++;
      return idle;
    },
  };
  const text = definePreset({ kind: 'text', timing });
  const skeleton = definePreset({ kind: 'skeleton', animations });
  expect(durationReads).toBe(1);
  expect(bindingReads).toBe(1);
  expect(text.timing?.duration).toBe(230);
  expect(skeleton.animations?.idle).toBe(idle);
  expect(Object.isFrozen(text.timing)).toBe(true);
  expect(Object.isFrozen(skeleton.animations)).toBe(true);
  expect(Object.isFrozen(timing)).toBe(false);
  expect(Object.isFrozen(animations)).toBe(false);
});

test('preset family identity never coerces caller objects into a known kind', () => {
  let coercions = 0;
  for (const kind of [
    null,
    undefined,
    false,
    1,
    [],
    Symbol('chart'),
    {
      toString() {
        coercions++;
        return 'chart';
      },
    },
  ])
    expect(() => definePreset({ kind } as never)).toThrow(
      LoaderConfigurationError,
    );
  expect(coercions).toBe(0);
});
