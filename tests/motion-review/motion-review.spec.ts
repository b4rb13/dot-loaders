import type { ChartLoader } from '@dotquilt-internal/core/chart';
import type { TableLoader } from '@dotquilt-internal/core/table';
import { expect, type Page, test } from '@playwright/test';

const failures = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on('pageerror', (e) => errors.push(String(e)));
  // WebKit's native select UI emits parser-time style CSP events even with
  // enhancement disabled. These tests use the fixture API, not its review UI.
  // Remove only that unrelated controls section; keep the original CSP intact.
  await page.route('http://127.0.0.1:4197/table?*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /<section id="table-controls".*?<\/section>/s,
        '',
      ),
    });
  });
  await page.addInitScript(() => {
    Reflect.set(window, 'motionViolations', []);
    document.addEventListener('securitypolicyviolation', (e) =>
      Reflect.get(window, 'motionViolations').push({
        directive: e.violatedDirective,
        uri: e.blockedURI,
      }),
    );
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) return;
  expect(failures.get(page)).toEqual([]);
  const csp = await page.evaluate(() =>
    Reflect.get(window, 'motionViolations'),
  );
  await info.attach('csp-events', {
    body: JSON.stringify(csp),
    contentType: 'application/json',
  });
  expect(
    csp.filter(
      (e: { directive: string; uri: string }) =>
        !(
          e.directive === 'img-src' &&
          e.uri === new URL('/favicon.ico', page.url()).href
        ),
    ),
  ).toEqual([]);
  await page.evaluate(() => {
    if (window.shared) window.shared.remove();
    else
      for (const host of document.querySelectorAll(
        '[data-dotquilt-surface],dotquilt-text-loader,dotquilt-region,dotquilt-chart-loader,dotquilt-table-loader,dotquilt-typing-dots',
      ))
        host.remove();
  });
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      effects: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, effects: 0 });
});

test('Cycle low hold reaches Scatter and wraps without invalid dots, including a paused Scatter frame', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/chart?mode=external');
  await expect(page.locator('#chart')).toHaveAttribute('data-moving', '');
  await page.evaluate(() =>
    window.m4Chart.recipe('cycle', { holdMs: 800, blendMs: 200 }),
  );
  await page.clock.runFor(2450);
  expect(await page.evaluate(() => window.m4Chart.errors)).toEqual([]);
  await page.evaluate(() => window.m4Chart.update({ motion: 'paused' }));
  await page.clock.runFor(50);
  await expect(page.locator('#chart')).not.toHaveAttribute('data-moving', '');
  expect(await page.evaluate(() => window.m4Chart.errors)).toEqual([]);
  await page.evaluate(() => window.m4Chart.update({ motion: 'system' }));
  await page.clock.runFor(850);
  expect(await page.evaluate(() => window.m4Chart.errors)).toEqual([]);
  await page.evaluate(() => window.m4Chart.ready());
  await page.clock.runFor(1000);
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Chart.identity())).toBe(true);
});

for (const family of ['chart', 'table'] as const)
  for (const profile of ['plain', 'padded', 'scaled'] as const)
    test(`${family} ${profile}: pointer lift aligns with the painted content coordinates`, async ({
      page,
    }) => {
      await page.clock.install();
      const origin =
        family === 'chart' ? 'http://127.0.0.1:4194' : 'http://127.0.0.1:4197';
      await page.route(`${origin}/review-geometry.css`, (route) =>
        route.fulfill({
          contentType: 'text/css',
          body: `#${family}{box-sizing:border-box;width:360px;height:${family === 'chart' ? 240 : 200}px;${profile === 'plain' ? '' : 'border:5px solid;padding:15px;'}${profile === 'scaled' ? 'transform:scale(.75,1.25);transform-origin:top left;' : ''}}`,
        }),
      );
      await page.goto(`${origin}/${family}?mode=external`);
      await page.evaluate(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/review-geometry.css';
        document.head.append(link);
      });
      await page.waitForFunction(() =>
        [
          ...document.querySelectorAll<HTMLLinkElement>(
            'link[href="/review-geometry.css"]',
          ),
        ].every((link) => link.sheet),
      );
      await page.locator(`#${family}`).evaluate((host) => {
        (host as ChartLoader | TableLoader).pointerResponse = 'lift';
        (host as ChartLoader | TableLoader).refresh();
      });
      await page.clock.runFor(100);
      const svg = page.locator(`#${family} svg[data-dotquilt-painter]`);
      await expect(svg).toBeVisible();
      const point = await svg.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.x + r.width * 0.25, y: r.y + r.height * 0.4 };
      });
      const geometry = await page
        .locator(`#${family}`)
        .evaluate((host, family) => {
          const surface = Reflect.get(
            host,
            Symbol.for('dotquilt.surface.v1'),
          ).call(host, family);
          return { width: surface.width, height: surface.height };
        }, family);
      await page.mouse.move(point.x, point.y);
      await page.clock.runFor(32);
      const pointer = await page
        .locator(`#${family}`)
        .evaluate((host) =>
          Reflect.get(host, Symbol.for('dotquilt.pointer.v1')),
        );
      expect(pointer?.x).toBeCloseTo(geometry.width * 0.25, 2);
      expect(pointer?.y).toBeCloseTo(geometry.height * 0.4, 2);
      await page.mouse.move(850, 650);
      await page.clock.runFor(32);
      expect(
        await page
          .locator(`#${family}`)
          .evaluate((host) =>
            Reflect.get(host, Symbol.for('dotquilt.pointer.v1')),
          ),
      ).toBeUndefined();
    });

for (const framework of ['native', 'react'])
  test(`${framework}: accelerated Cycle remains finite in automatic shared choreography`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(`http://127.0.0.1:4202/${framework}?family=region`);
    await page.waitForFunction(() => !!window.shared);
    await page.clock.runFor(100);
    await page.evaluate(() => {
      window.shared.repertoire('line', 'tableShimmer', 'text-badge', 5);
      window.shared.patch('chart', { speed: 4 });
    });
    await page.clock.runFor(2400);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    await page.evaluate(() => window.shared.patch('owner', { state: 'ready' }));
    await page.clock.runFor(1100);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => ({
        errors: window.shared.errors,
        identity: window.shared.identity(),
        events: window.shared.events.map((e) => e.type),
      })),
    ).toEqual({
      errors: [],
      identity: true,
      events: ['dotquilt-handoff-start', 'dotquilt-handoff-end'],
    });
  });

for (const family of [
  'skeleton',
  'chart',
  'table',
  'shared-native',
  'shared-react',
] as const)
  test(`${family}: normal-speed idle, pointer leave, reveal and preserved content`, async ({
    page,
  }) => {
    const url =
      family === 'skeleton'
        ? '/native?mode=external'
        : family === 'chart'
          ? '/chart?mode=external'
          : family === 'table'
            ? 'http://127.0.0.1:4197/table?mode=external'
            : `http://127.0.0.1:4202/${family === 'shared-react' ? 'react' : 'native'}?family=region`;
    await page.goto(url);
    const selector =
      family === 'skeleton'
        ? '#region'
        : family === 'chart'
          ? '#chart-region'
          : family === 'table'
            ? '#table-region'
            : '#owner';
    await expect(page.locator(selector)).toHaveAttribute(
      'data-presentation',
      'pending',
    );
    await page.evaluate(() => {
      const hosts = document.querySelectorAll<ChartLoader | TableLoader>(
        'dotquilt-chart-loader,dotquilt-table-loader',
      );
      for (const host of hosts) host.pointerResponse = 'lift';
    });
    await page.waitForTimeout(700);
    await page.locator(selector).hover();
    await page.mouse.move(850, 650);
    await page.evaluate((family) => {
      if (family === 'skeleton') window.m4.ready();
      else if (family === 'chart') window.m4Chart.ready();
      else if (family === 'table') window.tableTest.ready();
      else window.shared.patch('owner', { state: 'ready' });
    }, family);
    await expect(page.locator(selector)).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(
        (family) =>
          family === 'skeleton'
            ? window.m4.identity()
            : family === 'chart'
              ? window.m4Chart.identity()
              : family === 'table'
                ? window.tableTest.identity()
                : window.shared.identity(),
        family,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        (family) =>
          family === 'skeleton'
            ? window.m4.diagnostics
            : family === 'chart'
              ? window.m4Chart.errors
              : family === 'table'
                ? window.tableTest.errors
                : window.shared.errors,
        family,
      ),
    ).toEqual([]);
  });
