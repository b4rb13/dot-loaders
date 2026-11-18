import { expect, test } from '@playwright/test';
import { kinds } from './kinds';

// Loaders must not redo layout or rebuild their drawing when unrelated parts
// of the page change. Apps animate inline styles and toggle classes all the
// time (progress bars, transitions, framer-motion); before the fix every such
// change made every loader on the page re-measure and redraw.
async function layoutReads(
  page: import('@playwright/test').Page,
  mode: 'sibling' | 'ancestor',
) {
  return page.evaluate(async (mode) => {
    const frames = (count: number) =>
      new Promise<void>((resolve) => {
        const step = () => (--count ? requestAnimationFrame(step) : resolve());
        requestAnimationFrame(step);
      });
    await frames(10);
    // Count forced layout and style reads: the actual cost of invalidation.
    // (The painter skips unchanged writes, so DOM mutations hide the work.)
    let count = 0;
    const spy = <T extends object>(target: T, key: keyof T) => {
      const original = target[key] as unknown as (
        ...args: unknown[]
      ) => unknown;
      Object.defineProperty(target, key, {
        configurable: true,
        value(this: unknown, ...args: unknown[]) {
          count++;
          return original.apply(this, args);
        },
      });
      return () =>
        Object.defineProperty(target, key, {
          configurable: true,
          value: original,
        });
    };
    const restore = [
      spy(Element.prototype, 'getBoundingClientRect'),
      spy(Range.prototype, 'getBoundingClientRect'),
      spy(Range.prototype, 'getClientRects'),
      spy(window, 'getComputedStyle'),
    ];
    const unrelated = document.getElementById('unrelated') as HTMLElement;
    for (let i = 0; i < 30; i++) {
      if (mode === 'sibling') {
        unrelated.style.width = `${40 + i}px`;
        unrelated.classList.toggle('flash');
      } else document.body.classList.toggle('busy');
      await frames(1);
    }
    await frames(5);
    for (const undo of restore) undo();
    return count;
  }, mode);
}

for (const kind of kinds) {
  test(`${kind}: changes to unrelated elements cause no loader work`, async ({
    page,
  }) => {
    await page.goto(`/?component=${kind}&motion=paused`);
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    expect(await layoutReads(page, 'sibling')).toBe(0);
  });

  test(`${kind}: ancestor class changes cost a bounded check, not a rebuild`, async ({
    page,
  }) => {
    // An ancestor class can hide or restyle the loader, so each change may be
    // re-checked, but with a few reads (visibility, font), not re-measuring
    // every glyph or rebuilding the drawing. 30 changes, at most 6 reads each.
    await page.goto(`/?component=${kind}&motion=paused`);
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    expect(await layoutReads(page, 'ancestor')).toBeLessThanOrEqual(180);
  });
}

test('a loader still reacts when its own container is hidden', async ({
  page,
}) => {
  await page.goto('/?component=chart-loader');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const events = await page.evaluate(async () => {
    const stage = document.getElementById('stage') as HTMLElement;
    const frames = (count: number) =>
      new Promise<void>((resolve) => {
        const step = () => (--count ? requestAnimationFrame(step) : resolve());
        requestAnimationFrame(step);
      });
    await frames(5);
    const surface = () =>
      window.e2e.decoration.shadowRoot?.querySelector('svg, canvas');
    const before = !!surface();
    stage.hidden = true;
    await frames(5);
    stage.hidden = false;
    await frames(5);
    return { before, after: !!surface() };
  });
  expect(events).toEqual({ before: true, after: true });
});
