import { expect, type Page, test } from '@playwright/test';
import { paintCount } from '../paint-output';
import type { Family } from './scene';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (e) => list.push(String(e)));
  page.on('console', (message) => {
    if (message.type() === 'error') list.push(message.text());
  });
  await page.addInitScript(() => {
    Reflect.set(window, 'copyCSP', []);
    document.addEventListener('securitypolicyviolation', (event) =>
      Reflect.get(window, 'copyCSP').push(event.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    await info.attach('browser-errors', {
      body: JSON.stringify({
        browser: errors.get(page),
        runtime: await page.evaluate(() =>
          window.copies
            ? {
                errors: window.copies.errors,
                events: window.copies.events,
                plans: window.copies.plans,
              }
            : null,
        ),
      }),
      contentType: 'application/json',
    });
    return;
  }
  expect(errors.get(page)).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, 'copyCSP'))).toEqual([]);
  await page.evaluate(() => window.copies.remove());
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      animations: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, animations: 0 });
});
async function open(
  page: Page,
  framework: string,
  family: Family,
  order = 'one',
) {
  await page.clock.install();
  await page.goto(`/${framework}?family=${family}&order=${order}`);
  await page.waitForFunction(() => !!window.copies);
  await page.clock.runFor(100);
  // External sheets and layout must have settled before ordinary completion tests.
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll(
        'dotquilt-region,dotquilt-chart-loader,dotquilt-table-loader,dotquilt-text-loader,dotquilt-skeleton-block',
      ),
    ].every((host) =>
      [...(host.shadowRoot?.querySelectorAll('link') ?? [])].every(
        (link) => (link as HTMLLinkElement).sheet,
      ),
    ),
  );
  expect(
    await page.evaluate(
      () => window.copies.separate && window.copies.identity(),
    ),
  ).toBe(true);
}
async function ready(page: Page, i: number) {
  await page.evaluate(
    (i) => window.copies.update(i, { state: 'ready', motion: 'system' }),
    i,
  );
  await page.clock.runFor(80);
}
const presentation = (page: Page, i: number, value: string) =>
  expect(page.locator(`#owner-${i}`)).toHaveAttribute(
    'data-presentation',
    value,
  );

for (const framework of ['native', 'react'])
  for (const order of ['one', 'two'])
    for (const family of [
      'skeleton',
      'region',
      'text',
      'chart',
      'table',
    ] as const) {
      test(`${framework}/${order}/${family}: foreign custom binding and preset execute, capture options and preserve independent roots`, async ({
        page,
      }) => {
        await open(page, framework, family, order);
        await page.evaluate(() =>
          window.copies.configure({ preset: true, lift: 7 }),
        );
        await ready(page, 0);
        await presentation(page, 0, 'handoff');
        await presentation(page, 1, 'pending');
        await page.evaluate(() => window.copies.configure({ lift: 19 }));
        await page.clock.runFor(80);
        expect(
          await page.evaluate(() =>
            window.copies.plans
              .filter((p) => p.index === 0)
              .map((p) => ({ lift: p.lift, frozen: p.frozen })),
          ),
        ).toEqual([{ lift: 7, frozen: true }]);
        await ready(page, 1);
        await presentation(page, 1, 'handoff');
        expect(
          await page.evaluate(() =>
            window.copies.plans.filter((p) => p.index === 1).map((p) => p.lift),
          ),
        ).toEqual([19]);
        await page.clock.runFor(700);
        await presentation(page, 0, 'ready');
        await presentation(page, 1, 'ready');
        expect(
          await page.evaluate(() => ({
            events: window.copies.events.map((e) => [e.index, e.type]),
            identity: window.copies.identity(),
            errors: window.copies.errors,
            finite: window.copies.frames.every(
              (f) => f.progress >= 0 && f.progress <= 1 && f.delta >= 0,
            ),
          })),
        ).toEqual({
          events: [
            [0, 'start'],
            [1, 'start'],
            [0, 'end'],
            [1, 'end'],
          ],
          identity: true,
          errors: [],
          finite: true,
        });
        if (family !== 'text')
          expect(await page.locator('#input-0').inputValue()).toBe('retained');
        const before = await page.locator('#owner-1').innerHTML();
        await page.evaluate(() => {
          window.copies.remove(0);
          window.copies.stale();
        });
        await page.clock.runFor(80);
        expect(await page.locator('#owner-1').innerHTML()).toBe(before);
      });
    }
for (const framework of ['native', 'react'])
  for (const family of ['chart', 'table'] as const) {
    for (const variant of family === 'chart'
      ? ['line', 'bar', 'scatter']
      : ['semantic'])
      test(`${framework}/${family}/${variant}: cross-copy providers are sampled once and copied into frozen custom surfaces`, async ({
        page,
      }) => {
        await open(page, framework, family);
        if (family === 'chart')
          await page.evaluate((variant) => {
            for (const i of [0, 1])
              window.copies.update(i, {
                variant: variant as 'line' | 'bar' | 'scatter',
              });
          }, variant);
        await ready(page, 0);
        await ready(page, 1);
        expect(await page.evaluate(() => window.copies.calls)).toEqual([1, 1]);
        expect(
          await page.evaluate(() =>
            window.copies.plans.map((p) => ({
              kind: p.kind,
              count: p.count,
              frozen: p.frozen,
            })),
          ),
        ).toEqual(
          [0, 1].map(() => ({
            kind: family === 'table' ? 'table' : variant,
            count: family === 'table' ? 2 : variant === 'bar' ? 1 : 3,
            frozen: true,
          })),
        );
        await page.clock.runFor(700);
        await presentation(page, 0, 'ready');
        await presentation(page, 1, 'ready');
      });
    test(`${framework}/${family}: invalid, asynchronous, null and reentrant providers recover without stale handoffs`, async ({
      page,
    }) => {
      await open(page, framework, family);
      for (const mode of [
        'null',
        'retry',
        'throw',
        'invalid',
        'promise',
        'reentrant',
        'valid',
      ]) {
        await page.evaluate((mode) => {
          window.copies.mode(mode);
          for (const i of [0, 1])
            window.copies.update(i, { state: 'pending', cycle: mode });
        }, mode);
        await page.clock.runFor(80);
        const oldEvents = await page.evaluate(
          () => window.copies.events.length,
        );
        await ready(page, 0);
        await ready(page, 1);
        await page.clock.runFor(700);
        expect(await page.evaluate(() => window.copies.calls)).toEqual(
          mode === 'null' || mode === 'retry' ? [2, 2] : [1, 1],
        );
        await presentation(page, 0, mode === 'reentrant' ? 'pending' : 'ready');
        await presentation(page, 1, mode === 'reentrant' ? 'pending' : 'ready');
        if (mode === 'reentrant')
          expect(await page.evaluate(() => window.copies.events.length)).toBe(
            oldEvents,
          );
      }
      expect(await page.evaluate(() => window.copies.errors)).toEqual([
        { index: 0, code: 'invalid-geometry' },
        { index: 1, code: 'invalid-geometry' },
      ]);
    });
    test(`${framework}/${family}: first-party variants retain nondefault CSS across independent copies`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.locator('[id^=source-]').evaluateAll((elements) => {
        for (const element of elements) element.classList.add('appearance');
      });
      const variants =
        family === 'chart'
          ? ['ridge', 'scan', 'terrain', 'bars', 'scatter', 'cycle']
          : ['typeOn', 'tableShimmer'];
      for (const variantName of variants) {
        await page.evaluate(
          (variantName) =>
            window.copies.configure({
              recipe: 'first-party',
              variantName,
              preset: true,
            }),
          variantName,
        );
        await page.clock.runFor(80);
        const snapshots = await page.evaluate(() => [
          window.copies.snapshot(0),
          window.copies.snapshot(1),
        ]);
        expect(snapshots[0]?.length).toBeGreaterThan(0);
        expect(snapshots[1]).toEqual(snapshots[0]);
      }
    });
  }
for (const family of ['region', 'text', 'chart', 'table'] as const)
  for (const failure of ['duration', 'prepare', 'frame'])
    test(`native/${family}: foreign ${failure} failure settles meaningful content and a later cycle recovers`, async ({
      page,
    }) => {
      await open(page, 'native', family, 'two');
      await page.evaluate((failure) => window.copies.failure(failure), failure);
      await ready(page, 1);
      await page.clock.runFor(700);
      await presentation(page, 1, 'ready');
      expect(
        await page.evaluate(() =>
          window.copies.errors.some(
            (e) => e.index === 1 && e.code === 'animation-failed',
          ),
        ),
      ).toBe(true);
      await page.evaluate(() => {
        window.copies.failure('');
        window.copies.update(1, { state: 'pending', cycle: 'recovered' });
      });
      await page.clock.runFor(80);
      await ready(page, 1);
      await page.clock.runFor(700);
      await presentation(page, 1, 'ready');
      expect(
        await page.evaluate(() => window.copies.events.at(-1)?.cycle),
      ).toBe('recovered');
    });

for (const framework of ['native', 'react']) {
  for (const family of ['chart', 'table'] as const) {
    test(`${framework}/${family}: projection snapshots survive mutation of provider-owned data`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await ready(page, 0);
      await ready(page, 1);
      expect(await page.evaluate(() => window.copies.providerBounds)).toEqual([
        true,
        true,
      ]);
      const before = await page.evaluate(() =>
        JSON.stringify(window.copies.projections),
      );
      await page.evaluate(() => window.copies.mutateProjection());
      expect(
        await page.evaluate(() => JSON.stringify(window.copies.projections)),
      ).toBe(before);
      await page.clock.runFor(700);
      await presentation(page, 0, 'ready');
      await presentation(page, 1, 'ready');
    });
    test(`${framework}/${family}: first-party handoff settles across copies with supplied geometry and targets`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.evaluate(() =>
        window.copies.configure({ recipe: 'first-party', preset: true }),
      );
      await ready(page, 0);
      await ready(page, 1);
      await presentation(page, 0, 'handoff');
      await presentation(page, 1, 'handoff');
      for (const i of [0, 1])
        expect(await paintCount(page.locator(`#source-${i}`))).toBeGreaterThan(
          0,
        );
      await page.clock.runFor(1400);
      await presentation(page, 0, 'ready');
      await presentation(page, 1, 'ready');
      expect(await page.evaluate(() => window.copies.errors)).toEqual([]);
    });
  }
  for (const family of ['chart', 'table', 'text'] as const)
    test(`${framework}/${family}: removing one copy's owner preserves the other copy's active clock and revokes old commands`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await ready(page, 0);
      await ready(page, 1);
      await page.evaluate(() => {
        Reflect.set(
          window,
          'copyClock',
          Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
        );
        Reflect.set(
          window,
          'copyLedger',
          Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
        );
        window.copies.remove(0);
      });
      const before = await page.locator('#owner-1').innerHTML();
      await page.evaluate(() => window.copies.stale());
      expect(await page.locator('#owner-1').innerHTML()).toBe(before);
      await presentation(page, 1, 'handoff');
      expect(
        await page.evaluate(() => ({
          sameClock:
            !!Reflect.get(window, 'copyClock') &&
            Reflect.get(window, 'copyClock') ===
              Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
          sameLedger:
            !!Reflect.get(window, 'copyLedger') &&
            Reflect.get(window, 'copyLedger') ===
              Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
        })),
      ).toEqual({ sameClock: true, sameLedger: true });
      await page.clock.runFor(700);
      await presentation(page, 1, 'ready');
      expect(
        await page.evaluate(() =>
          window.copies.events.filter((e) => e.index === 1).map((e) => e.type),
        ),
      ).toEqual(['start', 'end']);
    });
  for (const family of ['skeleton', 'text', 'chart', 'table'] as const)
    test(`${framework}/${family}: foreign idle exception stops callbacks and a new binding recovers`, async ({
      page,
    }) => {
      await open(page, framework, family);
      await page.evaluate(async () => {
        window.copies.failure('idle');
        await window.copies.configure({ lift: 6 });
      });
      await page.clock.runFor(80);
      expect(
        await page.evaluate(() =>
          window.copies.errors.some((e) => e.code === 'animation-failed'),
        ),
      ).toBe(true);
      const count = await page.evaluate(() => window.copies.frames.length);
      await page.evaluate(async () => {
        window.copies.failure('');
        await window.copies.configure({ lift: 8 });
      });
      await page.clock.runFor(80);
      expect(
        await page.evaluate(() => window.copies.frames.length),
      ).toBeGreaterThan(count);
    });
}
for (const order of ['one', 'two'])
  test(`native/${order}: compatible custom painters share the document admission cap and release reservations`, async ({
    page,
  }) => {
    await open(page, 'native', 'chart', order);
    const result = await page.evaluate(async () => {
      const libraries = await Promise.all(
        ['one', 'two'].map((name) => import(`/copy-${name}/index.js`)),
      );
      const hosts: HTMLElement[] = [];
      const diagnostics: string[] = [];
      for (let i = 0; i < 5; i++) {
        const library = libraries[i % 2];
        const draw = ({
          dot,
        }: import('@dotquilt-internal/core').DrawContext<'chart'>) => {
          for (let n = 0; n < 4096; n++)
            dot({
              x: n % 64,
              y: Math.floor(n / 64),
              size: 1,
              opacity: 0.5,
              tone: 'base',
            });
          return undefined;
        };
        const binding = library.defineAnimation({
          contractVersion: 1,
          id: 'fixture/cap',
          family: 'chart',
          phase: 'idle',
          options: { parse: () => ({}) },
          frame: draw,
          still: draw,
        })();
        const host = document.createElement(
          'dotquilt-chart-loader',
        ) as import('@dotquilt-internal/core').ChartLoader;
        host.className = 'pressure';
        host.stylePolicy = { mode: 'external', href: '/styles/chart.css' };
        host.motion = 'paused';
        host.animations = { idle: binding };
        host.addEventListener('dotquilt-error', (event) =>
          diagnostics.push((event as CustomEvent).detail.code),
        );
        document.body.append(host);
        hosts.push(host);
      }
      Reflect.set(window, 'pressureHosts', hosts);
      Reflect.set(window, 'pressureErrors', diagnostics);
    });
    expect(result).toBeUndefined();
    await page.clock.runFor(160);
    expect(
      await page.evaluate(() => ({
        dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')).dots,
        reported: Reflect.get(window, 'pressureErrors').includes(
          'document-dot-limit',
        ),
        maximum: Math.max(
          ...Reflect.get(window, 'pressureHosts').map(
            (host: HTMLElement) =>
              host.shadowRoot?.querySelectorAll('circle').length ?? 0,
          ),
        ),
      })),
    ).toEqual({ dots: 16384, reported: true, maximum: 4096 });
    await page.evaluate(() => {
      for (const host of Reflect.get(window, 'pressureHosts')) host.remove();
    });
  });

for (const order of ['one', 'two'])
  for (const handoff of ['custom', 'rows'])
    for (const cancel of [false, true])
      test(`native/${order}/${handoff}/${cancel}: mixed foreign rich sources coordinate while a nested owner remains independent`, async ({
        page,
      }) => {
        await open(page, 'native', 'chart', order);
        await page.evaluate(
          async ({ order, handoff }) => {
            const owner = document.getElementById(
              'owner-0',
            ) as import('@dotquilt-internal/core').LoadingRegion;
            const chart = document.getElementById(
              'source-0',
            ) as import('@dotquilt-internal/core').ChartLoader;
            const wrapper = document.createElement('div');
            wrapper.slot = 'placeholder';
            chart.removeAttribute('slot');
            owner.prepend(wrapper);
            wrapper.append(chart);
            owner.append(document.getElementById('root-1') as HTMLElement);
            const name = order === 'one' ? 'two' : 'one';
            const library = await import(`/copy-${name}/index.js`);
            const recipes = await import(`/copy-${name}/table-animations.js`);
            const table = document.createElement(
              'dotquilt-table-loader',
            ) as import('@dotquilt-internal/core').TableLoader;
            table.id = 'mixed-table';
            table.stylePolicy = { mode: 'external', href: '/styles/table.css' };
            table.motion = 'system';
            table.update({ rows: 2, columns: [{ kind: 'text', width: 1 }] });
            Reflect.set(window, 'mixedCalls', 0);
            Reflect.set(window, 'mixedPlans', []);
            table.targetProvider = (bounds) => {
              Reflect.set(
                window,
                'mixedCalls',
                Reflect.get(window, 'mixedCalls') + 1,
              );
              return {
                kind: 'table',
                cells: [0, 1].map((rowIndex) => ({
                  rowId: `row-0-${rowIndex}`,
                  rowIndex,
                  columnIndex: 0,
                  kind: 'text',
                  text: 'A',
                  bounds: {
                    x: 0,
                    y: rowIndex * 32,
                    width: bounds.width,
                    height: 32,
                  },
                  baseline: rowIndex * 32 + 24,
                  tone: 'base',
                  glyphs: [
                    {
                      character: 'A',
                      bounds: {
                        x: 5,
                        y: rowIndex * 32 + 5,
                        width: 8,
                        height: 16,
                      },
                    },
                  ],
                })),
              };
            };
            const custom = library.defineAnimation({
              contractVersion: 1,
              id: 'fixture/copy-shared-id',
              family: 'table',
              phase: 'handoff',
              options: { parse: () => ({}) },
              duration: () => 750,
              prepare(
                surface: import('@dotquilt-internal/core').AnimationSurface<'table'>,
              ) {
                Reflect.get(window, 'mixedPlans').push({
                  family: surface.family,
                  rows: surface.input.cells.map((cell) => cell.rowId),
                  frozen: Object.isFrozen(surface.input),
                });
                return {};
              },
              frame({
                dot,
                reveal,
                revealTarget,
                surface,
              }: import('@dotquilt-internal/core').HandoffContext<
                'table',
                object
              >) {
                dot({ x: 10, y: 10, size: 2, opacity: 0.5, tone: 'accent' });
                reveal({ opacity: 0.5 });
                for (const id of surface.revealTargetIds)
                  revealTarget(id, { opacity: 0.5 });
                return undefined;
              },
            })();
            table.preset = library.definePreset({
              kind: 'table',
              animations: {
                idle: recipes.tableShimmer({ cellStyle: 'badge-text' }),
                handoff:
                  handoff === 'custom'
                    ? custom
                    : recipes.rows({ staggerMs: 25 }),
              },
            });
            wrapper.append(table);
            // Moving the native nodes disconnects their old providers. Reapply supported
            // configuration before starting either cycle; no private lifecycle shortcut.
            await window.copies.configure({ lift: 9, claimTargets: false });
          },
          { order, handoff },
        );
        await page.clock.runFor(160);
        await page.waitForFunction(() =>
          [
            ...(document
              .querySelector('#mixed-table')
              ?.shadowRoot?.querySelectorAll('link') ?? []),
          ].every((link) => (link as HTMLLinkElement).sheet),
        );
        await ready(page, 0);
        await presentation(page, 0, 'handoff');
        await presentation(page, 1, 'pending');
        expect(
          await page.evaluate(() => ({
            chart: window.copies.calls,
            table: Reflect.get(window, 'mixedCalls'),
          })),
        ).toEqual({ chart: [1, 0], table: 1 });
        for (const id of ['source-0', 'mixed-table'])
          expect(await paintCount(page.locator(`#${id}`))).toBeGreaterThan(0);
        if (handoff === 'custom')
          expect(
            await page.evaluate(() => Reflect.get(window, 'mixedPlans')),
          ).toEqual([
            { family: 'table', rows: ['row-0-0', 'row-0-1'], frozen: true },
          ]);
        await ready(page, 1);
        await presentation(page, 1, 'handoff');
        if (cancel) {
          await page.evaluate(() =>
            window.copies.update(0, {
              state: 'pending',
              cycle: 'superseded-mixed',
            }),
          );
          await page.clock.runFor(60);
          await presentation(page, 0, 'pending');
          await presentation(page, 1, 'ready');
        }
        await page.clock.runFor(1000);
        await presentation(page, 0, cancel ? 'pending' : 'ready');
        await presentation(page, 1, 'ready');
        expect(
          await page.evaluate(() =>
            window.copies.events
              .filter((e) => e.index === 1)
              .map((e) => e.type),
          ),
        ).toEqual(['start', 'end']);
        expect(await page.evaluate(() => window.copies.errors)).toEqual([]);
        // Native nested ownership remains explicit. Remove the nested root first so
        // the fixture's individual root teardown is valid after its parent disappears.
        await page.evaluate(() => window.copies.remove(1));
      });

for (const framework of ['native', 'react'])
  for (const variantName of ['scrambleCharacters', 'scrambleWords'])
    test(`${framework}/text: foreign ${variantName} preset shares the clock and retains both roots`, async ({
      page,
    }) => {
      await open(page, framework, 'text');
      await page.evaluate(
        (variantName) =>
          window.copies.configure({
            recipe: 'first-party',
            preset: true,
            variantName,
          }),
        variantName,
      );
      await page.evaluate(() => {
        window.copies.update(0, { motion: 'system' });
        window.copies.update(1, { motion: 'system' });
      });
      await page.clock.runFor(200);
      await expect(page.locator('#owner-0')).toHaveAttribute('data-moving', '');
      await expect(page.locator('#owner-1')).toHaveAttribute('data-moving', '');
      await ready(page, 0);
      await presentation(page, 0, 'handoff');
      await presentation(page, 1, 'pending');
      await page.clock.runFor(700);
      await presentation(page, 0, 'ready');
      await expect(page.locator('#owner-1')).toHaveAttribute('data-moving', '');
      await ready(page, 1);
      await page.clock.runFor(700);
      await presentation(page, 1, 'ready');
      expect(
        await page.evaluate(() => ({
          identity: window.copies.identity(),
          errors: window.copies.errors,
          events: window.copies.events.map((e) => [e.index, e.type]),
        })),
      ).toEqual({
        identity: true,
        errors: [],
        events: [
          [0, 'start'],
          [0, 'end'],
          [1, 'start'],
          [1, 'end'],
        ],
      });
    });
