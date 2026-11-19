import { expect, type Page, test } from '@playwright/test';

const components = [
  'skeleton',
  'text-loader',
  'chart-loader',
  'table-loader',
  'typing-dots',
  'loading-region',
];
const pages = [
  '/',
  '/docs/',
  '/docs/installation/',
  ...components.map((name) => `/docs/components/${name}/`),
];

/** Records how each handoff on the page ends. */
async function recordHandoffs(page: Page) {
  await page.evaluate(() => {
    const reasons: string[] = [];
    Reflect.set(window, 'handoffs', reasons);
    document.addEventListener(
      'dotquilt-handoff-end',
      (event) =>
        reasons.push((event as CustomEvent<{ reason: string }>).detail.reason),
      true,
    );
  });
  return () => page.evaluate(() => Reflect.get(window, 'handoffs'));
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

for (const path of pages)
  test(`${path} loads without errors and fits a phone`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 375, height: 812 });
    // Google Fonts are the one external request; tests stay offline.
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

// Previews behave like an app: each load is a request that settles on its own
// within the motion window, or at once on Reveal. Every load must end with
// the full handoff, never an instant swap.
test('every preview load hands over with the full animation', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/docs/components/skeleton/');
  const handoffs = await recordHandoffs(page);
  const preview = page.locator('[data-preview]').first();
  const status = preview.getByRole('status');
  const start = preview.getByRole('button', { name: 'Start loading' });
  const reveal = preview.getByRole('button', { name: 'Reveal' });
  const content = preview.getByText('Ada Lovelace');

  // The first load starts in view and settles by itself.
  await expect(status).toHaveText('Loading');
  await expect(start).toBeDisabled();
  await expect(content).toBeHidden();
  await expect(status).toHaveText('Ready', { timeout: 5000 });
  await expect(content).toBeVisible();
  await expect(reveal).toBeDisabled();
  await expect.poll(handoffs).toEqual(['complete']);

  // Start loading runs a new request that settles by itself.
  await start.click();
  await expect(status).toHaveText('Loading');
  await expect(content).toBeHidden();
  await expect(status).toHaveText('Ready', { timeout: 5000 });
  await expect.poll(handoffs).toEqual(['complete', 'complete']);

  // Reveal settles the request at once.
  await start.click();
  await reveal.click();
  await expect(status).toHaveText('Ready');
  await expect(content).toBeVisible();
  await expect.poll(handoffs).toEqual(['complete', 'complete', 'complete']);
  expect(errors).toEqual([]);
});

for (const name of components.slice(1))
  test(`the ${name} preview loads by itself and hands over with the full animation`, async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto(`/docs/components/${name}/`);
    const handoffs = await recordHandoffs(page);
    const status = page.locator('[data-preview]').first().getByRole('status');
    await expect(status).toHaveText('Ready', { timeout: 5000 });
    await expect.poll(handoffs).toEqual(['complete']);
    expect(errors).toEqual([]);
  });

test('a TextLoader preview locks into the next value on each load', async ({
  page,
}) => {
  await page.goto('/docs/components/text-loader/');
  const preview = page.locator('[data-preview]').first();
  // The loader's own text is the value; its shadow holds the mask.
  const value = () =>
    preview
      .locator('dotquilt-text-loader')
      .evaluate((loader) => loader.textContent);
  await expect(preview.getByRole('status')).toHaveText('Ready', {
    timeout: 5000,
  });
  expect(await value()).toBe('$48,120');
  await preview.getByRole('button', { name: 'Start loading' }).click();
  await preview.getByRole('button', { name: 'Reveal' }).click();
  await expect(preview.getByRole('status')).toHaveText('Ready');
  expect(await value()).toBe('$51,904');
});

test('the LoadingRegion preview keeps the feed usable while it refreshes', async ({
  page,
}) => {
  await page.goto('/docs/components/loading-region/');
  const preview = page.locator('[data-preview]').first();
  const region = preview.locator('dotquilt-region');
  const status = preview.getByRole('status');
  await expect(status).toHaveText('Ready', { timeout: 5000 });
  await preview.getByRole('button', { name: 'Refresh' }).click();
  await expect(status).toHaveText('Updating');
  await expect(region).toHaveAttribute('state', 'refreshing');
  await expect(preview.getByText('Globex invoice is overdue')).toBeVisible();
  await expect(preview.getByText('Updating…')).toBeVisible();
  await expect(status).toHaveText('Ready', { timeout: 5000 });
  await expect(preview.getByText('Updating…')).toBeHidden();
});

test('the theme follows the system and the switch, with the spec colours', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/docs/');
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await background()).toBe('rgb(24, 29, 37)'); // #181D25
  await page
    .locator('starlight-theme-select select')
    .first()
    .selectOption('light');
  expect(await background()).toBe('rgb(244, 245, 247)'); // #F4F5F7
});
