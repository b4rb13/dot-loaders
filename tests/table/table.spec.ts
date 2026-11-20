import { expect, test } from '@playwright/test';
import type { LoadingRegion } from 'dotquilt/region';
import type { TableLoader } from 'dotquilt/table';
import { capture } from '../capture';
import { expectPaint, paintCount } from '../paint-output';
import type {} from './api.js';

for (const framework of ['table', 'react'])
  for (const mode of ['inline', 'nonce', 'hash', 'external']) {
    test(`${framework} rich rows, content identity and CSP: ${mode}`, async ({
      page,
    }) => {
      await page.goto(`/${framework}?mode=${mode}`);
      await expectPaint(page.locator('#table'));
      expect(await page.evaluate(() => window.tableTest.calls())).toBe(0);
      expect(await page.locator('#table').getAttribute('aria-hidden')).toBe(
        'true',
      );
      const before = await page.locator('#after').boundingBox();
      // Observe the transient phase and its real row effect in one page turn;
      // separate protocol polls can arrive after native completion.
      const observed = await page.evaluate(
        () =>
          new Promise<{
            presentation: string | null;
            rowAnimations: number;
          }>((resolve) => {
            let frame = 0;
            const read = () => ({
              presentation:
                document
                  .getElementById('table-region')
                  ?.getAttribute('data-presentation') ?? null,
              rowAnimations:
                document.getElementById('row-0')?.getAnimations().length ?? 0,
            });
            const finish = () => {
              clearTimeout(timeout);
              cancelAnimationFrame(frame);
              resolve(read());
            };
            const timeout = setTimeout(finish, 5000);
            const sample = () => {
              const value = read();
              if (
                (value.presentation === 'handoff' && value.rowAnimations > 0) ||
                value.presentation === 'ready'
              )
                finish();
              else frame = requestAnimationFrame(sample);
            };
            window.tableTest.ready();
            queueMicrotask(sample);
          }),
      );
      expect(observed.presentation).toBe('handoff');
      expect(observed.rowAnimations).toBeGreaterThan(0);
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(
        await page.evaluate(() => ({
          errors: window.tableTest.errors,
          csp: window.tableTest.violations,
          identity: window.tableTest.identity(),
          calls: window.tableTest.calls(),
          events: window.tableTest.events.map((e) => e.type),
          react: Reflect.get(window, 'reactErrors') ?? [],
        })),
      ).toEqual({
        errors: [],
        csp: [],
        identity: true,
        calls: 1,
        events: ['dotquilt-handoff-start', 'dotquilt-handoff-end'],
        react: [],
      });
      expect(await page.locator('#after').boundingBox()).toEqual(before);
      await expect.poll(() => paintCount(page.locator('#table'))).toBe(0);
      expect(
        await page.locator('#row-0').evaluate((e) => e.getAnimations().length),
      ).toBe(0);
    });
  }
for (const mode of ['null', 'retry', 'throw', 'invalid'])
  test(`bounded provider ${mode}`, async ({ page }) => {
    await page.goto('/table');
    await expectPaint(page.locator('#table'));
    await page.evaluate((m) => {
      window.tableTest.provider(m);
      window.tableTest.ready();
    }, mode);
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.tableTest.calls())).toBe(
      ['null', 'retry'].includes(mode) ? 2 : 1,
    );
    expect(await page.evaluate(() => window.tableTest.identity())).toBe(true);
    if (mode === 'throw' || mode === 'invalid')
      expect(await page.evaluate(() => window.tableTest.errors)).toContain(
        'invalid-geometry',
      );
  });
test('missing targets fall back; custom definitions share cancellation and revoked commands', async ({
  page,
}) => {
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() => {
    window.tableTest.targets('missing');
    window.tableTest.ready();
  });
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.locator('#row-0').evaluate((e) => e.getAnimations().length),
  ).toBe(0);
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() => window.tableTest.custom());
  await expect
    .poll(() => page.evaluate(() => window.tableTest.customFrames()))
    .toBeGreaterThan(0);
  await page.evaluate(() => window.tableTest.ready(600));
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => window.tableTest.pending('supersede'));
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => window.tableTest.stale());
  expect(
    await page.evaluate(() => window.tableTest.events.map((e) => e.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-cancel']);
  expect(await page.evaluate(() => window.tableTest.identity())).toBe(true);
  expect(await page.evaluate(() => window.tableTest.errors)).toEqual([]);
});
for (const restriction of ['reduced', 'pause', 'hidden', 'offscreen'])
  test(`restriction ${restriction} reveals current content immediately`, async ({
    page,
  }) => {
    if (restriction === 'reduced')
      await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/table');
    if (restriction !== 'reduced') await expectPaint(page.locator('#table'));
    if (restriction === 'pause')
      await page
        .locator('#table-region')
        .evaluate((e) => ((e as LoadingRegion).motion = 'paused'));
    if (restriction === 'hidden')
      await page
        .locator('#table-region')
        .evaluate((e) => e.setAttribute('hidden', ''));
    if (restriction === 'offscreen')
      await page
        .locator('#table-region')
        .evaluate((e) => e.setAttribute('data-dotquilt-offscreen', ''));
    await expect(page.locator('#table')).not.toHaveAttribute('data-moving', '');
    await page.evaluate(() => window.tableTest.ready());
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => window.tableTest.events.at(-1)?.reason),
    ).toBe('immediate');
    expect(
      await page.locator('#row-0').evaluate((e) => e.getAnimations().length),
    ).toBe(0);
  });
// Decision 3: after the 4-second window the idle stays still, but the rows
// handoff still plays.
test('after the motion window the idle stops and the rows still hand off', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.clock.runFor(4100);
  await expect(page.locator('#table')).not.toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.tableTest.ready());
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.clock.runFor(1200);
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => window.tableTest.events.at(-1)?.reason),
  ).toBe('complete');
});
test('pause, focus, row changes and competing effects settle without stale styles', async ({
  page,
}) => {
  for (const action of ['pause', 'focus', 'remove', 'reorder', 'conflict']) {
    await page.goto('/table');
    await expectPaint(page.locator('#table'));
    await page.evaluate(() => window.tableTest.ready(1500));
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.evaluate((action) => {
      const region = document.getElementById('table-region') as LoadingRegion,
        row = document.getElementById('row-0') as HTMLElement;
      if (action === 'pause') region.motion = 'paused';
      if (action === 'focus') {
        row.tabIndex = -1;
        row.focus();
      }
      if (action === 'remove') {
        row.remove();
        region.revealTargets = [];
      }
      if (action === 'reorder') window.tableTest.targets('reverse');
      if (action === 'conflict')
        row.animate({ opacity: [0, 1] }, { duration: 1000 });
    }, action);
    if (action === 'reorder') {
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      await page
        .locator('#table-region')
        .evaluate((e) => ((e as LoadingRegion).motion = 'paused'));
    }
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    if (action !== 'remove')
      expect(
        await page.locator('#row-0').evaluate((e) => e.getAttribute('style')),
      ).toBeNull();
    expect(await page.evaluate(() => window.tableTest.events.length)).toBe(2);
    await page.evaluate(() => window.tableTest.detach());
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      ),
    ).toBeUndefined();
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      ),
    ).toBeUndefined();
  }
});
test('pre-upgrade properties, table caps and fine-pointer cleanup', async ({
  page,
}) => {
  await page.goto('/table?enhance=0');
  await page.locator('#table').evaluate((e) => {
    Reflect.set(e, 'rows', 7);
    Reflect.set(e, 'rowHeight', 24);
    Reflect.set(e, 'speed', 0.6);
  });
  await page.evaluate(() => import(String('/table.js')));
  await expectPaint(page.locator('#table'));
  expect(
    await page
      .locator('#table')
      .evaluate((e) => [
        (e as TableLoader).rows,
        (e as TableLoader).rowHeight,
        (e as TableLoader).speed,
      ]),
  ).toEqual([7, 24, 0.6]);
  await page.locator('#table').evaluate((e) => {
    const t = e as TableLoader;
    t.columns = Array.from({ length: 25 }, () => ({ kind: 'text' }));
    t.rows = 100;
    t.refresh();
  });
  expect(
    await page
      .locator('#table')
      .evaluate((e) => [
        (e as TableLoader).rows,
        (e as TableLoader).columns.length,
      ]),
  ).toEqual([50, 20]);
  expect(await paintCount(page.locator('#table'))).toBeLessThanOrEqual(4096);
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() =>
    window.tableTest.update({ pointerResponse: 'lift' }),
  );
  const b = await page.locator('#table').boundingBox();
  if (!b) throw new Error();
  await page.mouse.move(b.x + 40, b.y + 40);
  await expect
    .poll(() =>
      page
        .locator('#table')
        .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
    )
    .toEqual({ x: 40, y: 40 });
  await page.evaluate(() => window.tableTest.ready());
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page
      .locator('#table')
      .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
});
test('zero duration and removal in the start handler release the owned painter', async ({
  page,
}) => {
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() => window.tableTest.ready(0));
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => window.tableTest.events.map((e) => e.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() => {
    document
      .getElementById('table-region')
      ?.addEventListener(
        'dotquilt-handoff-start',
        () => document.getElementById('table')?.remove(),
        { once: true },
      );
    window.tableTest.ready();
  });
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toBeUndefined();
});

test('both idles and seven treatments: frozen convergence captures and natural-speed row reveal', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4197',
    viewport: { width: 640, height: 480 },
    reducedMotion: 'no-preference',
    recordVideo: {
      dir: info.outputPath('table-motion'),
      size: { width: 640, height: 480 },
    },
  });
  try {
    const live = await context.newPage();
    for (const idle of ['typeOn', 'tableShimmer'] as const) {
      await live.goto('/table');
      await expectPaint(live.locator('#table'));
      await live.evaluate((n) => window.tableTest.recipe(n), idle);
      await live.waitForTimeout(300);
      await live.evaluate(() => window.tableTest.ready());
      await expect(live.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await live.evaluate(() => window.tableTest.errors)).toEqual([]);
    }
  } finally {
    await context.close();
  }
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  for (const idle of ['typeOn', 'tableShimmer'] as const)
    for (const cellStyle of [
      'auto',
      'text',
      'number',
      'badge',
      'date',
      'badge-text',
      'text-badge',
    ]) {
      await page.goto('/table');
      await page.clock.runFor(50);
      await page.evaluate(
        ({ idle, cellStyle }) => window.tableTest.recipe(idle, { cellStyle }),
        { idle, cellStyle },
      );
      await page.clock.runFor(200);
      await capture(page, {
        path: info.outputPath(`${idle}-${cellStyle}-idle.png`),
      });
      // Keep the compositor and mocked RAF clocks on the same capture timeline.
      // Real-speed coverage above still runs with native animation clocks.
      await page.evaluate(() => {
        window.tableTest.ready(900);
        queueMicrotask(() => {
          for (const animation of document
            .getElementById('table-region')
            ?.shadowRoot?.getAnimations() ?? [])
            if (animation.effect?.getTiming().duration === 900) {
              animation.pause();
              animation.currentTime = 0;
            }
        });
      });
      expect(
        await page.evaluate(() =>
          (
            document
              .getElementById('table-region')
              ?.shadowRoot?.getAnimations() ?? []
          )
            .filter(
              (animation) => animation.effect?.getTiming().duration === 900,
            )
            .map((animation) => animation.playState),
        ),
      ).toEqual(['paused', 'paused']);
      await page.clock.runFor(450);
      await page.evaluate(() => {
        const region = document.getElementById('table-region');
        for (const animation of region?.shadowRoot?.getAnimations() ?? [])
          if (animation.effect?.getTiming().duration === 900)
            animation.currentTime = 450;
        Reflect.get(region as HTMLElement, 'frame').call(region);
        for (const animation of new Set([
          ...document.getAnimations(),
          ...(region?.shadowRoot?.getAnimations() ?? []),
        ]))
          if (animation.effect?.getTiming().duration === 1) {
            animation.pause();
            animation.currentTime = 1;
          }
      });
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      expect(
        await page
          .locator('#row-0')
          .evaluate((e) => +getComputedStyle(e).opacity),
      ).toBeGreaterThan(0);
      await capture(page, {
        path: info.outputPath(`${idle}-${cellStyle}-mid.png`),
      });
      await page.clock.runFor(550);
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.tableTest.errors)).toEqual([]);
    }
});

test('invalid target ownership, target limits and unsupported text preserve current content', async ({
  page,
}) => {
  for (const mode of ['outside', 'nested', 'limit', 'unicode']) {
    await page.goto('/table');
    await expectPaint(page.locator('#table'));
    await page.evaluate((mode) => {
      const region = document.getElementById('table-region') as LoadingRegion,
        row = document.getElementById('row-0') as HTMLElement;
      if (mode === 'outside') window.tableTest.targets('outside');
      if (mode === 'nested') {
        const nested = document.createElement('dotquilt-region');
        row.parentElement?.append(nested);
        nested.append(row);
        region.revealTargets = [{ id: 'row-0', element: row }];
      }
      if (mode === 'limit')
        region.revealTargets = Array.from({ length: 101 }, (_, i) => ({
          id: String(i),
          element: row,
        }));
      if (mode === 'unicode')
        (document.querySelector('td') as HTMLElement).textContent = '漢字';
      window.tableTest.ready();
    }, mode);
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect.poll(() => paintCount(page.locator('#table'))).toBe(0);
    expect(
      await page.evaluate(() => window.tableTest.errors.length),
    ).toBeGreaterThan(0);
  }
});
test('geometry/font invalidation and supersession from the start event cancel obsolete work', async ({
  page,
}) => {
  for (const action of ['font', 'resize', 'reentrant']) {
    await page.goto('/table');
    await expectPaint(page.locator('#table'));
    if (action === 'reentrant')
      await page.evaluate(() =>
        document
          .getElementById('table-region')
          ?.addEventListener(
            'dotquilt-handoff-start',
            () => window.tableTest.pending('reentrant'),
            { once: true },
          ),
      );
    await page.evaluate(() => window.tableTest.ready(1600));
    if (action === 'reentrant') {
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'pending',
      );
      expect(
        await page.evaluate(() => window.tableTest.events.map((e) => e.type)),
      ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-cancel']);
      continue;
    }
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    if (action === 'font')
      await page.evaluate(() =>
        document.fonts.dispatchEvent(new Event('loadingdone')),
      );
    if (action === 'resize')
      await page
        .locator('#table-content')
        .evaluate((e) => e.setAttribute('class', 'larger'));
    if (action === 'resize')
      await page.addStyleTag({ content: '#table-content{height:200px}' });
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.locator('#row-0').evaluate((e) => e.getAnimations().length),
    ).toBe(0);
  }
});
test('option endpoints, captured options/timing and explicit easing stay inside one total', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  for (const cadenceMs of [250, 1200]) {
    await page.goto('/table');
    await page.clock.runFor(80);
    await page.evaluate((cadenceMs) => {
      window.tableTest.recipe('tableShimmer', {
        cadenceMs,
        cellStyle: 'text-badge',
      });
      window.tableTest.recipe('rows', { staggerMs: 50, settlePx: 8 });
      window.tableTest.ready(800, 'linear');
    }, cadenceMs);
    // WAAPI uses the real compositor timeline. Pause only the fixture's
    // presentation effects so CPU contention cannot finish an 800ms animation
    // while the deterministic JS clock has advanced fewer milliseconds.
    await page.locator('#table-region').evaluate((e) => {
      for (const wrapper of e.shadowRoot?.querySelectorAll(
        '[part=content],[part=placeholder]',
      ) ?? [])
        for (const animation of wrapper.getAnimations()) {
          animation.pause();
          animation.currentTime = 300;
        }
    });
    await page.clock.runFor(300);
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.evaluate(() => {
      window.tableTest.recipe('rows', { staggerMs: 0, settlePx: 0 });
      (document.getElementById('table-region') as LoadingRegion).timing = {
        duration: 0,
      };
    });
    await page.locator('#table-region').evaluate((e) => {
      for (const wrapper of e.shadowRoot?.querySelectorAll(
        '[part=content],[part=placeholder]',
      ) ?? [])
        for (const animation of wrapper.getAnimations())
          animation.currentTime = 700;
    });
    await page.clock.runFor(400);
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.clock.runFor(150);
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.tableTest.errors)).toEqual([]);
  }
});

test('absent/failed JavaScript keeps inert static geometry and application recovery available', async ({
  page,
}) => {
  for (const failed of [false, true]) {
    if (failed) await page.route('**/table.js', (route) => route.abort());
    await page.goto(`/table?enhance=${failed ? '1' : '0'}`);
    expect(
      await page.evaluate(() => customElements.get('dotquilt-table-loader')),
    ).toBeUndefined();
    await expect(page.locator('#table [data-dotquilt-static]')).toBeVisible();
    await expect(page.locator('#table-content')).not.toBeVisible();
    expect((await page.locator('#table').boundingBox())?.height).toBe(160);
    await page.locator('#table-recovery').click();
    await expect(
      page.getByRole('heading', { name: 'Current table' }),
    ).toBeVisible();
  }
});
