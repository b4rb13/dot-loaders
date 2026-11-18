import { expect, test } from 'bun:test';
import type { AnimationSurface } from '../src/animations.js';
import {
  nativeSurface,
  readSurface,
  surface,
} from '../src/internal/surface.js';

test('native surface dispatch preserves receiver, arguments and snapshot identity', () => {
  const ids = Object.freeze(['row']);
  const snapshot = Object.freeze({
    family: 'chart',
    width: 320.125,
    height: 180.375,
  }) as AnimationSurface<'chart'>;
  const calls: unknown[][] = [];
  const host = {
    [readSurface](this: unknown, family: string, targets: readonly string[]) {
      calls.push([this, family, targets]);
      return snapshot;
    },
  } as unknown as HTMLElement;
  expect(nativeSurface(host, 'chart', ids)).toBe(snapshot);
  expect(surface(host, 'chart', ids)).toBe(snapshot);
  expect(calls).toEqual([
    [host, 'chart', ids],
    [host, 'chart', ids],
  ]);
});

test('fallback surface retains fractional geometry and frozen copies', () => {
  const host = {
    getBoundingClientRect: () => ({ width: 320.125, height: 180.375 }),
  } as unknown as HTMLElement;
  const ids = ['row'];
  const snapshot = surface(host, 'skeleton', ids);
  ids.push('late');
  expect(snapshot.width).toBe(320.125);
  expect(snapshot.input.shapes).toEqual([
    { x: 0, y: 0, width: 320.125, height: 180.375 },
  ]);
  expect(snapshot.revealTargetIds).toEqual(['row']);
  expect(
    [
      snapshot,
      snapshot.input,
      snapshot.input.shapes,
      snapshot.input.shapes[0],
      snapshot.source,
      snapshot.revealTargetIds,
    ].every(Object.isFrozen),
  ).toBe(true);
});
