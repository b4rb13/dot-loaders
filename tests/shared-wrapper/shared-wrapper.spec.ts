import { expect, type Page, test } from '@playwright/test';

interface Shared {
  events: { type: string; reason?: string; animation?: string }[];
  errors: string[];
  calls: {
    chart: number;
    table: number;
    table2: number;
    idle: number;
    still: number;
    frames: number;
  };
  plans: {
    family: string;
    width: number;
    input: unknown;
    source: number;
    ids: string[];
    frozen: boolean;
    option: number;
  }[];
  patch(id: string, value: object): void;
  provider(mode: string): void;
  source(option?: number, rows?: boolean): void;
  override(option?: number, preset?: boolean): void;
  stale(): void;
  mutateProviderData(): void;
  targets(): { id: string; element: HTMLElement }[];
  identity(): boolean;
  clicks(): number;
  theme(): void;
  remove(): void;
  multi(mode: string): void;
  repertoire(
    variant: 'line' | 'bar' | 'scatter',
    idle: 'typeOn' | 'tableShimmer',
    cellStyle: import('@dotquilt-internal/core/animations/table').TypeOnOptions['cellStyle'],
    index: number,
  ): void;
  idleOnly(): void;
  samples: {
    family: string;
    progress: number;
    linear: number;
    time: number;
    delta: number;
  }[];
}
declare global {
  interface Window {
    shared: Shared;
  }
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (error) => list.push(String(error)));
  await page.addInitScript(() => {
    Reflect.set(window, 'sharedCSP', []);
    document.addEventListener('securitypolicyviolation', (e) =>
      Reflect.get(window, 'sharedCSP').push(e.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) return;
  expect(errors.get(page)).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, 'sharedCSP'))).toEqual(
    [],
  );
  await page.evaluate(() => window.shared.remove());
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      animations: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, animations: 0 });
});
async function open(page: Page, framework: string, family: string) {
  await page.clock.install();
  await page.goto(`/${framework}?family=${family}`);
  await page.waitForFunction(() => !!window.shared);
  await page.clock.runFor(80);
}
async function ready(page: Page) {
  await page.evaluate(() => window.shared.patch('owner', { state: 'ready' }));
  await page.clock.runFor(80);
}
const presentation = (page: Page, value: string) =>
  expect(page.locator('#owner')).toHaveAttribute('data-presentation', value);
async function contentAvailable(page: Page) {
  expect(
    await page.locator('#owner').evaluate((host) => {
      const content =
        host.shadowRoot?.querySelector<HTMLElement>('[part=content]');
      return {
        inert: content?.inert,
        hidden: content?.getAttribute('aria-hidden'),
      };
    }),
  ).toEqual({ inert: false, hidden: null });
  expect(await page.evaluate(() => window.shared.identity())).toBe(true);
}
for (const framework of ['native', 'react']) {
  for (const family of ['chart', 'table', 'skeleton']) {
    test(`${framework}/${family}: custom source shares one owner timeline, bounded immutable input and exact settlement`, async ({
      page,
    }) => {
      await open(page, framework, family);
      const transform = await page
        .locator('#row-a')
        .evaluate((row) => getComputedStyle(row).transform);
      await page.evaluate(() => window.shared.source());
      await ready(page);
      await presentation(page, 'handoff');
      await contentAvailable(page);
      const captured = await page.evaluate(() => ({
        plans: window.shared.plans,
        calls: window.shared.calls,
        events: window.shared.events,
      }));
      expect(captured.plans).toHaveLength(1);
      expect(captured.plans[0]).toMatchObject({
        family,
        ids: ['row-a', 'row-b'],
        frozen: true,
        option: 4,
      });
      expect(captured.plans[0]?.width).toBeGreaterThan(0);
      if (family === 'skeleton')
        expect(captured.plans[0]?.input).toMatchObject({
          shapes: [
            expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number),
            }),
          ],
        });
      else expect(captured.plans[0]?.source).toBeGreaterThan(0);
      if (family !== 'skeleton')
        expect(captured.calls[family as 'chart' | 'table']).toBe(1);
      expect(captured.events.map((e) => e.type)).toEqual([
        'dotquilt-handoff-start',
      ]);
      await expect(page.locator('#typing')).not.toHaveAttribute('data-moving');
      await page.clock.runFor(1000);
      await presentation(page, 'ready');
      await page.evaluate(() => window.shared.stale());
      await page.clock.runFor(30);
      expect(
        await page.locator('#row-a').evaluate((row) => ({
          opacity: getComputedStyle(row).opacity,
          transform: getComputedStyle(row).transform,
          animations: row.getAnimations().length,
        })),
      ).toMatchObject({ opacity: '1', animations: 0 });
      expect(
        await page
          .locator('#row-a')
          .evaluate((row) => getComputedStyle(row).transform),
      ).toBe(transform);
      await page.locator('#keep').click();
      expect(await page.evaluate(() => window.shared.clicks())).toBe(1);
      expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
      expect(
        await page.evaluate(() => window.shared.events.map((e) => e.type)),
      ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    });
  }
  test(`${framework}: explicit region/preset custom override owns mixed rich presentation without sampling children`, async ({
    page,
  }) => {
    await open(page, framework, 'region');
    await page.evaluate(() => {
      window.shared.override(2, true);
      window.shared.override(6);
    });
    await ready(page);
    await presentation(page, 'handoff');
    expect(
      await page.evaluate(() => ({
        chart: window.shared.calls.chart,
        table: window.shared.calls.table,
        plans: window.shared.plans,
      })),
    ).toMatchObject({
      chart: 0,
      table: 0,
      plans: [
        {
          family: 'region',
          source: 0,
          ids: ['row-a', 'row-b'],
          option: 6,
          frozen: true,
        },
      ],
    });
    for (const id of ['block', 'typing', 'chart', 'table'])
      await expect(page.locator(`#${id}`)).not.toHaveAttribute('data-moving');
    await page.locator('#keep').focus();
    await presentation(page, 'ready');
    await expect(page.locator('#keep')).toBeFocused();
    await contentAvailable(page);
    await page.evaluate(() => window.shared.stale());
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    await page.evaluate(() =>
      window.shared.patch('owner', {
        state: 'pending',
        cycle: 'preset-restored',
        animations: undefined,
      }),
    );
    await page.clock.runFor(50);
    await ready(page);
    expect(
      await page.evaluate(() => window.shared.plans.map((plan) => plan.option)),
    ).toEqual([6, 2]);
    expect(
      await page.evaluate(
        () => window.shared.calls.chart + window.shared.calls.table,
      ),
    ).toBe(0);
    await page.clock.runFor(1000);
  });
  for (const family of ['chart', 'table']) {
    test(`${framework}/${family}: exact projection cap and legacy bridge remain bounded within a shared wrapper`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.evaluate(() => {
        window.shared.source();
        window.shared.provider('boundary');
      });
      await ready(page);
      await presentation(page, 'handoff');
      const input = (await page.evaluate(
        () => window.shared.plans[0]?.input,
      )) as {
        kind: string;
        points?: unknown[];
        cells?: { glyphs: unknown[] }[];
      };
      expect(input.kind).toBe(family === 'chart' ? 'scatter' : 'table');
      expect(
        family === 'chart'
          ? input.points?.length
          : input.cells?.reduce((sum, cell) => sum + 1 + cell.glyphs.length, 0),
      ).toBe(2048);
      await page.clock.runFor(1000);
      const modes =
        family === 'table' ? ['nested-overflow', 'legacy'] : ['legacy'];
      for (const mode of modes) {
        await page.evaluate((mode) => {
          window.shared.provider(mode);
          window.shared.patch('owner', { state: 'pending', cycle: mode });
        }, mode);
        await page.clock.runFor(50);
        await ready(page);
        const next = await page.evaluate(
          () => window.shared.plans.at(-1)?.input,
        );
        expect(next).toMatchObject(
          family === 'chart'
            ? { kind: 'bar', bars: [{ x: 10, y: 15, width: 20, height: 40 }] }
            : {
                kind: 'table',
                cells: [
                  { rowId: 'row-0', text: '', glyphs: [] },
                  { rowId: 'row-1', text: '', glyphs: [] },
                ],
              },
        );
        expect(
          await page.evaluate(
            (family) => window.shared.calls[family as 'chart' | 'table'],
            family,
          ),
        ).toBe(1);
        await page.clock.runFor(1000);
        await contentAvailable(page);
      }
      expect(await page.evaluate(() => window.shared.errors)).toEqual(
        family === 'table' ? ['invalid-geometry'] : [],
      );
    });
    test(`${framework}/${family}: built-in rich source retains primitives, one event pair and actual content`, async ({
      page,
    }) => {
      await open(page, framework, family);
      const before = await page
        .locator('#block')
        .evaluate((el) => el.shadowRoot?.querySelector('svg'));
      expect(before).toBeTruthy();
      await ready(page);
      await presentation(page, 'handoff');
      expect(
        await page
          .locator(`#${family}`)
          .locator('[data-dotquilt-painter]')
          .count(),
      ).toBe(1);
      await contentAvailable(page);
      await expect(page.locator('#block')).not.toHaveAttribute('data-moving');
      await page.clock.runFor(1000);
      await presentation(page, 'ready');
      expect(
        await page.evaluate(() => window.shared.events.map((e) => e.type)),
      ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
      expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    });
    test(`${framework}/${family}: provider attempts and invalid output are bounded and later valid input recovers`, async ({
      page,
    }) => {
      await open(page, framework, family);
      for (const mode of ['null', 'throw', 'invalid', 'oversize', 'retry']) {
        await page.evaluate((mode) => {
          window.shared.provider(mode);
          window.shared.patch('owner', { state: 'ready' });
        }, mode);
        await page.clock.runFor(1000);
        await presentation(page, 'ready');
        expect(
          await page.evaluate(
            (family) => window.shared.calls[family as 'chart' | 'table'],
            family,
          ),
        ).toBe(mode === 'null' || mode === 'retry' ? 2 : 1);
        await contentAvailable(page);
        await page.evaluate(
          (mode) =>
            window.shared.patch('owner', { state: 'pending', cycle: mode }),
          mode,
        );
        await page.clock.runFor(50);
      }
      // Bad provider output is a failure while loading: it reports once per
      // loading cycle (AUDIT.md decision 10), here for throw, invalid and
      // oversize.
      expect(await page.evaluate(() => window.shared.errors)).toEqual([
        'invalid-geometry',
        'invalid-geometry',
        'invalid-geometry',
      ]);
    });
    test(`${framework}/${family}: reentrant projection cannot commit an obsolete shared-wrapper reveal`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.evaluate(() => window.shared.provider('reentrant'));
      await ready(page);
      await presentation(page, 'pending');
      await page.clock.runFor(1000);
      await presentation(page, 'pending');
      expect(await page.evaluate(() => window.shared.events)).toEqual([]);
      expect(
        await page
          .locator('#row-a')
          .evaluate((row) => row.getAnimations().length),
      ).toBe(0);
    });
    test(`${framework}/${family}: options remain captured, theme invalidation settles and stale commands stay revoked`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.evaluate(() => window.shared.source(2));
      await ready(page);
      await presentation(page, 'handoff');
      await page.evaluate(() => window.shared.source(7));
      await page.clock.runFor(50);
      await presentation(page, 'handoff');
      expect(
        await page.evaluate(() =>
          window.shared.plans.map((plan) => plan.option),
        ),
      ).toEqual([2]);
      if (family === 'chart') {
        await page.evaluate(() => window.shared.mutateProviderData());
        expect(
          await page.evaluate(() => window.shared.plans[0]?.input),
        ).toMatchObject({
          points: [
            { x: 0, y: 50 },
            { x: 140, y: 10 },
            { x: 280, y: 45 },
          ],
        });
      }
      await page.evaluate(() => window.shared.theme());
      await page.clock.runFor(80);
      await presentation(page, 'ready');
      expect(
        await page
          .locator(`#${family}`)
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue('--dotquilt-color').trim(),
          ),
      ).toBe('#587047');
      await page.evaluate(() => window.shared.stale());
      await contentAvailable(page);
      expect(
        await page
          .locator('#row-a')
          .evaluate((el) => el.getAnimations().length),
      ).toBe(0);
      await page.evaluate(() =>
        window.shared.patch('owner', {
          state: 'pending',
          cycle: 'next-options',
        }),
      );
      await page.clock.runFor(50);
      await ready(page);
      expect(
        await page.evaluate(() =>
          window.shared.plans.map((plan) => plan.option),
        ),
      ).toEqual([2, 7]);
      await page.clock.runFor(1000);
    });
  }
  test(`${framework}: custom wrapper exceptions settle current content without per-frame callback retry`, async ({
    page,
  }) => {
    await open(page, framework, 'region');
    await page.evaluate(() => {
      window.shared.override();
      window.shared.provider('frame-throw');
    });
    await ready(page);
    await presentation(page, 'ready');
    const count = await page.evaluate(() => window.shared.calls.frames);
    await page.clock.runFor(1000);
    expect(await page.evaluate(() => window.shared.calls.frames)).toBe(count);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([
      'animation-failed',
    ]);
    await contentAvailable(page);
  });
  test(`${framework}: target additions wait for next handoff; recycled captured targets settle the wrapper`, async ({
    page,
  }) => {
    await open(page, framework, 'region');
    await page.evaluate(() => window.shared.override());
    await ready(page);
    await presentation(page, 'handoff');
    await page.evaluate(() =>
      window.shared.patch('owner', {
        revealTargets: [
          ...window.shared.targets(),
          { id: 'extra', element: document.getElementById('keep') },
        ],
      }),
    );
    await page.clock.runFor(50);
    await presentation(page, 'handoff');
    expect(
      await page.locator('#keep').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    await page.evaluate(() =>
      document.getElementById('row-a')?.replaceWith(
        Object.assign(document.createElement('div'), {
          id: 'row-a',
          textContent: 'Recycled application row',
        }),
      ),
    );
    await page.clock.runFor(50);
    await presentation(page, 'ready');
    await contentAvailable(page);
    expect(await page.evaluate(() => window.shared.events.at(-1)?.reason)).toBe(
      'geometry-changed',
    );
    expect(
      await page.locator('#row-b').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
  });
  test(`${framework}: competing application target effects survive safe wrapper settlement`, async ({
    page,
  }) => {
    await open(page, framework, 'region');
    await page.evaluate(() => window.shared.override());
    await ready(page);
    await presentation(page, 'handoff');
    await page.locator('#row-a').evaluate((el) => {
      const animation = el.animate(
        { opacity: [0.7, 0.8] },
        { duration: 2000, fill: 'both' },
      );
      animation.pause();
      Reflect.set(window, 'applicationAnimation', animation);
    });
    await page.clock.runFor(50);
    await presentation(page, 'ready');
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(1);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([
      'animation-failed',
    ]);
    await page.evaluate(() =>
      Reflect.get(window, 'applicationAnimation').cancel(),
    );
    await contentAvailable(page);
  });
}
