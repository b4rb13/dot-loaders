import { expect, test } from '@playwright/test';
import { catalog, parseCatalogQuery } from '../../apps/website/lib/catalog';

async function openSearch(page: import('@playwright/test').Page) {
  await page
    .getByRole('link', { name: 'Search documentation', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Search', exact: true }),
  ).toBeFocused();
}

test('local search is on demand, covers dynamic controls and does not transmit queries', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/docs/components/chart-loader');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  expect(requests.some((url) => url.includes('/docs/search-index'))).toBe(
    false,
  );
  await openSearch(page);
  expect(requests.some((url) => url.includes('/docs/search-index'))).toBe(
    false,
  );
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('pointerResponse');
  await expect(page.locator('[role="listbox"]')).toContainText(
    'pointerResponse',
  );
  await expect(page.locator('[role="dialog"]')).toContainText('0.0.0-m2.0');
  expect(
    requests.filter((url) => url.includes('/docs/search-index')).length,
  ).toBe(1);
  expect(requests.filter((url) => url.includes('pointerResponse'))).toEqual([]);
  expect(
    requests.filter(
      (url) => new URL(url).origin !== new URL(page.url()).origin,
    ),
  ).toEqual([]);
  for (const query of [
    'dotquilt-handoff-cancel',
    '--dotquilt-dot-gap',
    'scrambleWords',
    'readiness',
  ]) {
    await page
      .getByRole('combobox', { name: 'Search', exact: true })
      .fill(query);
    await expect(page.locator('[role="option"]').first()).toBeVisible();
  }
});

test('component names and selected integration links resolve to the complete supported schema', async ({
  page,
}) => {
  await page.goto('/docs/components');
  await openSearch(page);
  await page
    .getByRole('combobox', { name: 'Search integration' })
    .selectOption('native');
  for (const item of catalog) {
    await page
      .getByRole('combobox', { name: 'Search', exact: true })
      .fill(item.name);
    const link = page
      .locator(`.docs-search-result[href^="/docs/components/${item.slug}?"]`)
      .first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    const url = new URL(href ?? '', page.url());
    const parsed = parseCatalogQuery(url.search, item.slug);
    expect(parsed.notice).toBe('');
    expect(parsed.settings.integration).toBe('native');
  }
});

test('scope changes retain query, remove React-only gallery results and preserve ordinary result links', async ({
  page,
}) => {
  await page.goto('/docs/gallery');
  await openSearch(page);
  await expect(
    page.getByRole('combobox', { name: 'Search integration' }),
  ).toHaveValue('react');
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('word');
  const gallery = page
    .locator('.docs-search-result[href*="/docs/gallery/"]')
    .first();
  await expect(gallery).toBeVisible();
  await expect(gallery).toHaveAttribute('href', /\/docs\/gallery\//);
  await page
    .getByRole('combobox', { name: 'Search integration' })
    .selectOption('native');
  await expect(
    page.getByRole('combobox', { name: 'Search', exact: true }),
  ).toHaveValue('word');
  await expect(
    page.locator('.docs-search-result[href*="/docs/gallery/"]'),
  ).toHaveCount(0);
});

test('keyboard shortcut, arrows, Escape and selection retain content identity and focus', async ({
  page,
}) => {
  await page.goto('/docs/components/text-loader');
  const start = page.getByRole('button', {
    name: 'Start loading',
    exact: true,
  });
  await expect(start).toBeEnabled();
  await page
    .locator('dotquilt-text-loader')
    .evaluate((n) => Reflect.set(window, 'searchOwner', n));
  const trigger = page.getByRole('link', {
    name: 'Search documentation',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('combobox', { name: 'Search', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('ChartLoader');
  await expect(page.locator('[role="option"]').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('combobox', { name: 'Search', exact: true }),
  ).toHaveAttribute('aria-activedescendant', /fd-search-option/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page
      .locator('dotquilt-text-loader')
      .evaluate((n) => n === Reflect.get(window, 'searchOwner')),
  ).toBe(true);
  await openSearch(page);
  await page
    .getByRole('combobox', { name: 'Search integration' })
    .selectOption('react');
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('ChartLoader');
  await expect(page.locator('[role="option"]').first()).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .press('Enter');
  await expect(page).toHaveURL(/\/docs\/components\/chart-loader\?/);
  await expect(
    page.getByRole('combobox', { name: 'Code integration', exact: true }),
  ).toHaveValue('react');
});

test('empty queries, unmatched results and bounded input keep browse paths', async ({
  page,
}) => {
  await page.goto('/docs');
  await openSearch(page);
  const input = page.getByRole('combobox', { name: 'Search', exact: true });
  await expect(page.getByRole('dialog')).toContainText(
    'Queries stay in your browser',
  );
  await input.fill('zzzxqvnomatch987654');
  await expect(page.getByRole('dialog')).toContainText(
    'No matching documentation',
  );
  await expect(
    page.getByRole('link', { name: 'Browse all topics' }),
  ).toHaveAttribute('href', '/docs/search');
  await expect(input).toHaveAttribute('maxlength', '160');
  await input.fill('');
  await expect(page.getByRole('dialog')).toContainText(
    'Queries stay in your browser',
  );
});

test('failed local index retains navigation, useful error recovery and the unchanged example', async ({
  page,
}) => {
  await page.route('**/docs/search-index*', (r) => r.abort());
  await page.goto('/docs/components/chart-loader');
  await openSearch(page);
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('chart');
  await expect(page.getByRole('dialog')).toContainText('Search is unavailable');
  await expect(
    page.getByRole('link', { name: 'Browse topics', exact: true }),
  ).toHaveAttribute('href', '/docs/search');
  await page
    .getByRole('button', { name: 'Reload to retry', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'ChartLoader', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
});

test('a failed search UI chunk is contained, leaving the document and native browse path usable', async ({
  page,
}) => {
  await page.goto('/docs/components/text-loader');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  await page.route('**/*.js*', (r) => r.abort());
  await page
    .getByRole('link', { name: 'Search documentation', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Search could not load' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close search notice' }).click();
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'pending',
  );
  await expect(
    page.getByRole('link', { name: 'Search documentation', exact: true }),
  ).toHaveAttribute('href', '/docs/search');
});

test('standard Fumadocs rails stay in place as the article scrolls, with a separately scrollable short sidebar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/docs/components/text-loader');
  const rail = page.locator('[data-sidebar-placeholder]'),
    toc = page.locator('#nd-toc');
  await expect(toc).toBeVisible();
  const before = await rail.boundingBox(),
    beforeTOC = await toc.boundingBox();
  await page.evaluate(() => scrollTo(0, 1400));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
  const after = await rail.boundingBox(),
    afterTOC = await toc.boundingBox();
  expect(Math.abs((before?.y ?? -100) - (after?.y ?? 100))).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs((beforeTOC?.y ?? -100) - (afterTOC?.y ?? 100)),
  ).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1440, height: 420 });
  const viewport = page.locator(
    '#nd-sidebar [data-radix-scroll-area-viewport]',
  );
  expect(await viewport.evaluate((n) => n.scrollHeight > n.clientHeight)).toBe(
    true,
  );
  await viewport.evaluate((n) => (n.scrollTop = n.scrollHeight));
  await expect(
    page
      .locator('#nd-sidebar')
      .getByRole('link', { name: 'Search and browse', exact: true }),
  ).toBeInViewport();
});

test('320px drawer, contents navigation, reduced motion and forced colors remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto('/docs/components/text-loader');
  await page.getByRole('button', { name: 'Open Sidebar', exact: true }).click();
  await expect(page.locator('#nd-sidebar-mobile')).toBeVisible();
  await page
    .locator('#nd-sidebar-mobile')
    .getByRole('link', { name: 'React', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/guides\/react$/);
  await page
    .getByRole('link', { name: 'Search documentation', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('hydration');
  await expect(
    page.getByRole('listbox').getByRole('option').first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test('no-JavaScript documentation search links lead to a complete browsable directory', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    await page.goto('/docs/components/chart-loader');
    await page
      .getByRole('link', { name: 'Search documentation', exact: true })
      .click();
    await expect(page).toHaveURL(/\/docs\/search$/);
    await expect(page.locator('#components li')).toHaveCount(9);
    await page
      .locator('#components')
      .getByRole('link', { name: 'TableLoader', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'TableLoader', exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator('#component-code pre').first()).toContainText(
      'export default function Example',
    );
  } finally {
    await context.close();
  }
});

test('search inherits the live component integration and keeps the scope selector keyboard operable', async ({
  page,
}) => {
  await page.goto('/docs/components/text-loader');
  await page
    .getByRole('combobox', { name: 'Code integration', exact: true })
    .selectOption('native');
  await openSearch(page);
  const scope = page.getByRole('combobox', {
    name: 'Search integration',
    exact: true,
  });
  await expect(scope).toHaveValue('native');
  await scope.focus();
  await scope.press('r');
  await expect(scope).toHaveValue('react');
});

test('short desktop search keeps its close and browse actions inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 420 });
  await page.goto('/docs');
  await openSearch(page);
  await page
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('state');
  await expect(
    page.getByRole('listbox').getByRole('option').first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close Search', exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole('link', { name: 'Browse topics', exact: true }),
  ).toBeInViewport();
});
