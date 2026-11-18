import { expect, test } from '@playwright/test';
import type {} from '../m2/catalog-client';

test.beforeEach(async ({ page }) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
});

test('unchanged frame membership reuses one bounded snapshot', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { frames } = await import(String('/pkg/dist/internal/frames.js'));
    const request = window.requestAnimationFrame;
    const cancel = window.cancelAnimationFrame;
    const iterator = Set.prototype[Symbol.iterator];
    const queued = new Map<number, FrameRequestCallback>();
    let id = 0,
      snapshots = 0,
      ticks = 0;
    window.requestAnimationFrame = (fn) => {
      queued.set(++id, fn);
      return id;
    };
    window.cancelAnimationFrame = (key) => {
      queued.delete(key);
    };
    Set.prototype[Symbol.iterator] = function () {
      snapshots++;
      return iterator.call(this);
    };
    try {
      const release = frames(document.createElement('div'), () => ticks++);
      for (let i = 0; i < 10; i++) {
        const entry = queued.entries().next().value;
        if (!entry) throw Error('Missing frame');
        queued.delete(entry[0]);
        entry[1](performance.now());
      }
      release();
      return {
        snapshots,
        ticks,
        queued: queued.size,
        released: !Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
      };
    } finally {
      Set.prototype[Symbol.iterator] = iterator;
      window.requestAnimationFrame = request;
      window.cancelAnimationFrame = cancel;
    }
  });
  expect(result).toEqual({
    snapshots: 1,
    ticks: 10,
    queued: 0,
    released: true,
  });
});

test('frame snapshots retain reentrant add remove and last-client restart ordering', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { frames } = await import(String('/pkg/dist/internal/frames.js'));
    const request = window.requestAnimationFrame,
      cancel = window.cancelAnimationFrame;
    const queued = new Map<number, FrameRequestCallback>();
    let id = 0,
      turn = 0;
    const order: string[] = [];
    window.requestAnimationFrame = (fn) => {
      queued.set(++id, fn);
      return id;
    };
    window.cancelAnimationFrame = (key) => {
      queued.delete(key);
    };
    try {
      const host = document.createElement('div');
      let stopB: () => void, stopC: () => void, stopD: () => void;
      const stopA = frames(host, () => {
        order.push('a');
        if (++turn === 1) {
          stopB();
          stopC = frames(host, () => order.push('c'));
        }
        if (turn === 3) {
          stopA();
          stopC();
          stopD = frames(host, () => {
            order.push('d');
            stopD();
          });
        }
      });
      stopB = frames(host, () => order.push('b'));
      for (let i = 0; i < 4; i++) {
        const entry = queued.entries().next().value;
        if (!entry) throw Error('Missing frame');
        queued.delete(entry[0]);
        entry[1](performance.now());
      }
      return {
        order,
        queued: queued.size,
        released: !Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
      };
    } finally {
      window.requestAnimationFrame = request;
      window.cancelAnimationFrame = cancel;
    }
  });
  expect(result).toEqual({
    order: ['a', 'a', 'c', 'a', 'd'],
    queued: 0,
    released: true,
  });
});

test('Text disconnect clears its pointer once and preserves reconnection', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const host = document.createElement('dotquilt-text-loader');
    const content = document.createElement('span');
    content.setAttribute('data-dotquilt-text-content', '');
    content.textContent = 'Ready';
    host.append(content);
    Reflect.set(host, 'motion', 'paused');
    Reflect.set(host, 'mask', 'Waiting');
    document.body.append(host);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const key = Symbol.for('dotquilt.pointer.v1'),
      original = Reflect.deleteProperty;
    let resets = 0;
    Reflect.deleteProperty = (target, name) => {
      if (target === host && name === key) resets++;
      return original(target, name);
    };
    try {
      host.remove();
    } finally {
      Reflect.deleteProperty = original;
    }
    document.body.append(host);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const reconnected = host.shadowRoot !== null && !Reflect.has(host, key);
    host.remove();
    return { resets, reconnected };
  });
  expect(result).toEqual({ resets: 1, reconnected: true });
});
