import { expect, test } from '@playwright/test';
import {
  catalog,
  catalogDefaults,
  catalogQuery,
} from '../../apps/website/lib/catalog';

test('catalog index and all nine canonical references provide useful static sections', async ({
  page,
}) => {
  await page.goto('/docs/components');
  await expect(
    page.getByRole('heading', { name: 'Loading, composed.' }),
  ).toBeVisible();
  for (const item of catalog) {
    await page.goto(`/docs/components/${item.slug}`);
    await expect(
      page.getByRole('heading', { name: item.name, exact: true }),
    ).toBeVisible();
    for (const id of [
      'overview',
      'api',
      'motion',
      'accessibility',
      'rendering',
    ])
      await expect(page.locator(`#${id}`)).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeEnabled();
  }
});
for (const item of catalog)
  test(`${item.name}: actual loading, configuration identity, refresh and outcomes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`/playground/components/${item.slug}`);
    const owner = page
      .locator(
        item.family === 'text' ? 'dotquilt-text-loader' : 'dotquilt-region',
      )
      .first();
    await expect(owner).toHaveAttribute('state', 'ready');
    await owner.evaluate((el) => {
      el.setAttribute('data-test-identity', 'original');
      (window as unknown as { owner: Element }).owner = el;
    });
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'pending');
    const cycle = await owner.getAttribute('cycle');
    await page
      .getByRole('combobox', { name: 'Code integration', exact: true })
      .selectOption('native');
    await page
      .getByRole('combobox', { name: 'Idle speed', exact: true })
      .selectOption('2');
    await expect(owner).toHaveAttribute('cycle', cycle ?? '');
    expect(
      await owner.evaluate(
        (el) => el === (window as unknown as { owner: Element }).owner,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'ready');
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    await page
      .getByRole('button', { name: 'Refresh content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'refreshing');
    expect(
      await owner.evaluate(
        (el) => el === (window as unknown as { owner: Element }).owner,
      ),
    ).toBe(true);
    await page
      .getByText('Request outcomes and measurement refresh', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Cancel request', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Request cancelled');
    await expect(owner).toHaveAttribute('state', 'ready');
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Simulate failure', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Request failed');
    await expect(owner).toHaveAttribute('state', 'ready');
    expect(errors).toEqual([]);
  });
test('rich recipe selections drive genuine native handoff events and all chart geometries', async ({
  page,
}) => {
  for (const slug of ['text-loader', 'chart-loader', 'table-loader'] as const) {
    const item = catalog.find((x) => x.slug === slug);
    if (!item) throw new Error('missing model');
    await page.goto(`/playground/components/${slug}`);
    const owner = page
      .locator(
        slug === 'text-loader' ? 'dotquilt-text-loader' : 'dotquilt-region',
      )
      .first();
    await owner.evaluate((el) => {
      (window as unknown as { events: string[] }).events = [];
      el.addEventListener('dotquilt-handoff-start', (event) =>
        (window as unknown as { events: string[] }).events.push(
          (event as CustomEvent).detail.animation,
        ),
      );
    });
    await page
      .getByRole('combobox', { name: 'Idle recipe', exact: true })
      .selectOption(item.idles.at(-1) ?? 'default');
    await page
      .getByRole('combobox', { name: 'Reveal recipe', exact: true })
      .selectOption(item.reveals.at(-1) ?? 'default');
    for (const variant of slug === 'chart-loader'
      ? ['line', 'bar', 'scatter']
      : ['line']) {
      if (slug === 'chart-loader')
        await page
          .getByRole('combobox', { name: 'Chart geometry', exact: true })
          .selectOption(variant);
      await page
        .getByRole('button', { name: 'Start loading', exact: true })
        .click();
      await expect(owner).toHaveAttribute('state', 'pending');
      await page.waitForTimeout(100);
      await page
        .getByRole('button', { name: 'Reveal content', exact: true })
        .click();
      await expect(owner).toHaveAttribute('data-presentation', 'ready');
    }
    const events = await page.evaluate(
      () => (window as unknown as { events: string[] }).events,
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events.join(' ')).toMatch(
      slug === 'chart-loader'
        ? /morph/
        : slug === 'table-loader'
          ? /rows/
          : /fade/,
    );
  }
});
test('bounded shared state opens ready, survives reload, and rejects unsupported settings', async ({
  page,
}) => {
  const settings = {
    ...catalogDefaults('chart-loader'),
    variant: 'bar' as const,
    idle: 'terrain',
    reveal: 'morphWipe',
    integration: 'native' as const,
  };
  await page.goto(
    `/playground/components/chart-loader?${catalogQuery(settings)}`,
  );
  await expect(
    page.getByRole('combobox', { name: 'Chart geometry', exact: true }),
  ).toHaveValue('bar');
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'state',
    'ready',
  );
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('scan');
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Idle recipe', exact: true }),
  ).toHaveValue('scan');
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'state',
    'ready',
  );
  await page.goto('/playground/components/chart-loader?schema=2&state=pending');
  await expect(page.getByRole('status').first()).toContainText(
    'unsupported settings',
  );
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Idle recipe', exact: true }),
  ).toHaveValue('default');
});
test('global pause, system reduction, zero and international text remain useful', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/playground/components/text-loader');
  await page
    .getByRole('combobox', { name: 'Text sample', exact: true })
    .selectOption('zero');
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(page.locator('dotquilt-text-loader').first()).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator('dotquilt-text-loader').first()).toContainText('0');
  await page
    .getByRole('combobox', { name: 'Text sample', exact: true })
    .selectOption('international');
  await expect(page.locator('dotquilt-text-loader').first()).toContainText(
    'こんにちは世界',
  );
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Motion paused' }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('clipboard denial exposes selected complete configuration text', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    }),
  );
  await page.goto('/playground/components/table-loader');
  await page
    .getByRole('button', { name: 'Copy configuration link', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Copy manually', exact: true }),
  ).toHaveValue(/component=table-loader/);
});
test('320px controls and property tables stay reachable without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const slug of ['text-loader', 'chart-loader', 'table-loader']) {
    await page.goto(`/docs/components/${slug}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(
      page
        .locator(
          slug === 'text-loader' ? 'dotquilt-text-loader' : 'dotquilt-region',
        )
        .first(),
    ).toHaveAttribute('state', 'pending');
  }
});
test('all catalog references keep useful content and complete default files without JavaScript', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('A website baseURL is required');
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  for (const item of catalog) {
    await page.goto(`/docs/components/${item.slug}`);
    await expect(
      page.getByRole('heading', { name: item.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Complete example · all files', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeDisabled();
    await expect(page.getByTestId('preview-fallback')).toBeVisible();
  }
  await context.close();
});

test('documentation opens the current configuration in a static playground', async ({
  page,
}) => {
  await page.goto('/docs/components/chart-loader');
  await page
    .getByRole('combobox', { name: 'Chart geometry', exact: true })
    .selectOption('bar');
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('terrain');
  await page
    .getByRole('combobox', { name: 'Code integration', exact: true })
    .selectOption('native');
  await page
    .getByRole('link', {
      name: 'Open this configuration in playground',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/playground\/components\/chart-loader/);
  await expect(
    page.getByRole('combobox', { name: 'Chart geometry', exact: true }),
  ).toHaveValue('bar');
  await expect(
    page.getByRole('combobox', { name: 'Idle recipe', exact: true }),
  ).toHaveValue('terrain');
  await expect(
    page.getByRole('combobox', { name: 'Code integration', exact: true }),
  ).toHaveValue('native');
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'state',
    'ready',
  );
});
test('LoadingRegion reference describes the owner and its handoff-only map', async ({
  page,
}) => {
  await page.goto('/docs/components/loading-region');
  await expect(page.locator('#overview')).toContainText(
    'LoadingRegion is the loading owner',
  );
  await expect(page.locator('#motion')).toContainText(
    'no idle recipe of its own',
  );
  await expect(page.locator('#motion')).toContainText(
    'not to the region animation map',
  );
});
