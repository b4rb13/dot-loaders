import { expect, type Page, test } from '@playwright/test';
import { catalogKeys } from '../react/catalog';

declare global {
  interface Window {
    nextCatalogBefore: Record<string, Element>;
  }
}
const owners = catalogKeys.map((key) =>
  key === 'text' ? '#catalog-text' : `#owner-${key}`,
);
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  return errors;
}
async function hydrated(page: Page) {
  await page.waitForFunction(() => !!window.catalogTest);
}
async function phase(page: Page, value: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (selectors) =>
          selectors.map((selector) =>
            document.querySelector(selector)?.getAttribute('data-presentation'),
          ),
        owners,
      ),
    )
    .toEqual(owners.map(() => value));
}

async function quiet(page: Page) {
  expect(await page.evaluate(() => window.catalogTest.errors)).toEqual([]);
  expect(await page.evaluate(() => window.nextViolations)).toEqual([]);
  await page.evaluate(() => window.catalogTest.remove());
  await expect
    .poll(() =>
      page.evaluate(() => ({
        frames:
          Reflect.get(document, Symbol.for('dotquilt.frames.v1')) === undefined,
        dots:
          Reflect.get(document, Symbol.for('dotquilt.dots.v1')) === undefined,
        effects: document.getAnimations().length,
      })),
    )
    .toEqual({ frames: true, dots: true, effects: 0 });
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1100 });
});
for (const mode of ['nonce', 'external']) {
  test(`production full catalog ${mode}: RSC boundary, streaming, hydration and committed property resets`, async ({
    page,
  }) => {
    const errors = watch(page);
    await page.goto(`/catalog?state=pending&mode=${mode}`);
    await hydrated(page);
    await expect(page.locator('#server-detail')).toHaveText(
      'Deferred account detail',
    );
    await phase(page, 'pending');
    expect(
      await page.evaluate(() =>
        Object.entries(window.nextCatalogBefore).every(
          ([id, node]) => document.getElementById(id) === node,
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        Object.values(window.catalogTest.refs).every(
          (node) => typeof Reflect.get(node, 'update') === 'function',
        ),
      ),
    ).toBe(true);
    const rect = await page.locator('#catalog').boundingBox();
    await page.evaluate(() =>
      window.catalogTest.update({ alternate: true, presets: true }),
    );
    expect(await page.locator('#catalog-chart').getAttribute('variant')).toBe(
      'scatter',
    );
    await expect(page.locator('#catalog-table')).toHaveAttribute('rows', '3');
    await expect(page.locator('#catalog-multiline')).toHaveAttribute(
      'lines',
      '4',
    );
    await page.evaluate(() =>
      window.catalogTest.update({
        alternate: false,
        presets: false,
        state: 'ready',
        duration: 0,
      }),
    );
    await phase(page, 'ready');
    expect(
      await page
        .locator('#catalog-chart')
        .evaluate((node) => Reflect.get(node, 'variant')),
    ).toBe('line');
    expect(
      await page
        .locator('#catalog-table')
        .evaluate((node) => Reflect.get(node, 'rows')),
    ).toBe(5);
    expect(await page.locator('#catalog').boundingBox()).toEqual(rect);
    expect(
      await page.evaluate(() =>
        window.nextShifts.reduce((sum, e) => sum + e.value, 0),
      ),
    ).toBeLessThanOrEqual(0.01);
    expect(errors).toEqual([]);
    await quiet(page);
  });
  test(`full catalog navigation keeps the original document ${mode} policy and tears down old owners`, async ({
    page,
  }) => {
    const errors = watch(page);
    await page.goto(`/catalog?mode=${mode}`);
    await hydrated(page);
    await page.locator('#layout-counter').click();
    const initial = await page.locator('#catalog-table').evaluate((node) => ({
      nonce: (
        node.shadowRoot?.querySelector('style') as HTMLStyleElement | null
      )?.nonce,
      href: node.shadowRoot?.querySelector('link')?.getAttribute('href'),
    }));
    await page.evaluate(() =>
      window.catalogTest.update({ state: 'pending', cycle: 'navigation' }),
    );
    await phase(page, 'pending');
    await page.evaluate(() =>
      window.catalogTest.update({ state: 'ready', duration: 1600 }),
    );
    await phase(page, 'handoff');
    const old = await page.evaluateHandle(() => window.catalogTest);
    await page.locator('#catalog-navigate').click();
    await expect(page.locator('#catalog-other-detail')).toBeVisible();
    await phase(page, 'ready');
    await hydrated(page);
    await expect(page.locator('#layout-counter')).toHaveText('Layout count 1');
    expect(
      await old.evaluate((api) =>
        Object.values(api.refs).every((node) => !node.isConnected),
      ),
    ).toBe(true);
    for (const key of catalogKeys)
      expect(
        await old.evaluate(
          (api, key) =>
            api.events.filter((e) => e.key === key).map((e) => e.type),
          key,
        ),
      ).toEqual(['start', 'cancel']);
    expect(
      await page.locator('#catalog-table').evaluate((node) => ({
        nonce: (
          node.shadowRoot?.querySelector('style') as HTMLStyleElement | null
        )?.nonce,
        href: node.shadowRoot?.querySelector('link')?.getAttribute('href'),
      })),
    ).toEqual(initial);
    if (mode === 'external') expect(initial.href).toBe('/dotquilt/table.css');
    await old.dispose();
    expect(errors).toEqual([]);
    await quiet(page);
  });
}
test('full catalog delayed framework enhancement retains edits, focus and live content identity', async ({
  page,
}) => {
  const errors = watch(page);
  let resume = () => {};
  const waiting = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route('**/_next/static/**/*.js', async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page.goto('/catalog?state=pending&mode=nonce', {
      waitUntil: 'commit',
    });
    await expect(page.locator('#input-table')).toBeVisible();
    await page.locator('#input-table').fill('Before Next hydration');
    await page.locator('#input-table').focus();
    resume();
    await hydrated(page);
    await phase(page, 'pending');
    await expect(page.locator('#owner-table')).toBeFocused();
    await page.evaluate(() =>
      window.catalogTest.update({ state: 'ready', duration: 0 }),
    );
    await phase(page, 'ready');
    await expect(page.locator('#input-table')).toHaveValue(
      'Before Next hydration',
    );
    expect(
      await page.evaluate(
        () =>
          document.getElementById('input-table') ===
          window.nextCatalogBefore['input-table'],
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await quiet(page);
  } finally {
    resume();
  }
});
test('full catalog no/failed framework JavaScript preserves static cues, semantic outcomes and application recovery', async ({
  browser,
  baseURL,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  for (const state of ['ready', 'pending', 'refreshing']) {
    await noJs.goto(`${baseURL}/catalog?state=${state}&mode=external`);
    await expect(noJs.locator('#input-table')).toBeVisible();
    await expect(
      noJs.locator('#catalog-table [data-dotquilt-static]'),
    ).toHaveCount(1);
    if (state === 'pending')
      await expect(
        noJs.locator('#catalog-text [data-dotquilt-text-content]'),
      ).toBeHidden();
  }
  await noJs.locator('#catalog-navigate').click();
  await expect(noJs.locator('#catalog-other-detail')).toBeVisible();
  await context.close();
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/catalog?state=pending&mode=external');
  await expect(page.locator('#input-chart')).toBeVisible();
  await expect(
    page.locator('#catalog-table [data-dotquilt-static]'),
  ).toBeVisible();
  expect(
    await page.evaluate(() => !!customElements.get('dotquilt-table-loader')),
  ).toBe(false);
});
test('full catalog concurrent requests keep nonce isolation and actual streamed shells', async ({
  baseURL,
}) => {
  async function read(state: string) {
    const response = await fetch(
      `${baseURL}/catalog?state=${state}&mode=nonce`,
    );
    const chunks: string[] = [];
    if (!response.body) throw Error('Missing stream');
    for await (const bytes of response.body)
      chunks.push(new TextDecoder().decode(bytes));
    return {
      nonce: response.headers
        .get('content-security-policy')
        ?.match(/nonce-([^']+)/)?.[1],
      chunks,
      html: chunks.join(''),
    };
  }
  const [a, b] = await Promise.all([read('pending'), read('ready')]);
  for (const [current, other] of [
    [a, b],
    [b, a],
  ] as const) {
    expect(current.nonce).toBeTruthy();
    expect(current.nonce).not.toBe(other.nonce);
    expect(current.html).not.toContain(other.nonce);
    expect(current.chunks.length).toBeGreaterThan(1);
    const shell = current.chunks.find((c) =>
      c.includes('catalog-stream-fallback'),
    );
    expect(shell).toBeTruthy();
    expect(current.html).toContain('Deferred account detail');
    for (const tag of [
      'skeleton-block',
      'skeleton-line',
      'skeleton-circle',
      'skeleton-text',
      'typing-dots',
      'chart-loader',
      'table-loader',
      'text-loader',
      'region',
    ])
      expect(current.html).toContain(`<dotquilt-${tag}`);
  }
});
