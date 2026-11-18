import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { LoadingRegion } from '../../packages/core/dist/region';

test('fixed native layout and preliminary discarded-instance collection', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'CDP collection is a Chromium development check, not cross-browser heap qualification',
  );
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  const session = await page.context().newCDPSession(page);
  const init = await page.evaluate(async () => {
    const region = document.getElementById('region') as LoadingRegion;
    const before = region.getBoundingClientRect();
    const start = performance.now();
    const roots: Element[] = [];
    for (let i = 0; i < 6; i++) {
      const group = document.createElement('dotquilt-region');
      group.setAttribute('aria-label', 'Measurement fixture');
      group.state = 'pending';
      group.motion = 'paused';
      group.className = 'example';
      for (let j = 0; j < 4; j++) {
        const block = document.createElement('dotquilt-skeleton-block');
        block.slot = 'placeholder';
        group.append(block);
      }
      group.append(document.createTextNode('Current result'));
      document.body.append(group);
      roots.push(group);
    }
    await Promise.resolve();
    const setupMs = performance.now() - start;
    for (const root of roots) root.remove();
    region.update({ state: 'ready', timing: { duration: 0 } });
    await Promise.resolve();
    const after = region.getBoundingClientRect();
    return {
      fixture:
        'M1-only 24 blocks in six regions; not the full-catalog typical workload',
      setupMs,
      regionBox: {
        before: [before.x, before.y, before.width, before.height],
        after: [after.x, after.y, after.width, after.height],
      },
    };
  });
  expect(init.regionBox.after).toEqual(init.regionBox.before);
  const heaps: number[] = [];
  for (let checkpoint = 0; checkpoint < 3; checkpoint++) {
    await page.evaluate(() => {
      const refs: WeakRef<Element>[] = [];
      Reflect.set(window, 'discardedRefs', refs);
      for (let cycle = 0; cycle < 10; cycle++) {
        const group = document.createElement('dotquilt-region');
        group.state = 'pending';
        group.motion = 'paused';
        for (let j = 0; j < 24; j++) {
          const block = document.createElement('dotquilt-skeleton-block');
          block.slot = 'placeholder';
          group.append(block);
          refs.push(new WeakRef(block));
        }
        document.body.append(group);
        group.remove();
        refs.push(new WeakRef(group));
      }
    });
    await page.waitForTimeout(60);
    await session.send('HeapProfiler.collectGarbage');
    const retained = await page.evaluate(
      () =>
        (Reflect.get(window, 'discardedRefs') as WeakRef<Element>[]).filter(
          (ref) => ref.deref(),
        ).length,
    );
    expect(retained).toBe(0);
    heaps.push((await session.send('Runtime.getHeapUsage')).usedSize);
  }
  await mkdir('.artifacts', { recursive: true });
  await writeFile(
    '.artifacts/m1-resource-observation.json',
    JSON.stringify(
      {
        ...init,
        usedHeapBytes: heaps,
        discardedInstancesRetained: 0,
        limitations: [
          'Local automated Chromium, no physical reference qualification',
          'Three preliminary ten-cycle checkpoints; not the required three independent 100-cycle release experiments',
          'Initialization timing is JS setup, not whole rendering-time budget evidence',
          'Fixed box observation, not a full CLS/SSR/browser matrix',
        ],
      },
      null,
      2,
    ),
  );
});
