import { expect, test } from 'bun:test';
import { subscribe } from '../src/internal/services.js';

/** A document whose IntersectionObserver reports when `intersect` is called. */
function fakeDocument() {
  let report: ((entries: object[]) => void) | undefined;
  const reported: unknown[] = [];
  class Observer {
    constructor(callback?: (entries: object[]) => void) {
      if (this instanceof Intersection) report = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  class Intersection extends Observer {}
  const win = {
    MutationObserver: Observer,
    ResizeObserver: Observer,
    IntersectionObserver: Intersection,
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
    reportError: (error: unknown) => reported.push(error),
  };
  const doc = {
    defaultView: win,
    documentElement: {},
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  };
  return {
    reported,
    host: () =>
      ({ ownerDocument: doc, toggleAttribute() {} }) as unknown as HTMLElement,
    intersect: async (hosts: HTMLElement[]) => {
      report?.(hosts.map((target) => ({ target, intersectionRatio: 1 })));
      await Promise.resolve();
    },
  };
}

test('a loader that throws while notified does not stop notifications for the rest of the page', async () => {
  const { host, reported, intersect } = fakeDocument();
  const broken = host(),
    healthy = host();
  let calls = 0;
  subscribe({
    host: broken,
    changed() {
      throw new Error('broken environment handler');
    },
  });
  subscribe({ host: healthy, changed: () => calls++ });
  await intersect([broken, healthy]);
  await intersect([healthy]);
  expect(calls).toBe(2);
  expect(reported).toHaveLength(1);
});
