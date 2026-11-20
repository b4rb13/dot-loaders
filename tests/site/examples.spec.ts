import { expect, type Page, test } from '@playwright/test';

/** Records how each handoff inside `scope` ends. */
async function recordHandoffs(page: Page, scope: string) {
  await page.evaluate((selector) => {
    const reasons: string[] = [];
    Reflect.set(window, 'handoffs', reasons);
    document.addEventListener(
      'dotquilt-handoff-end',
      (event) => {
        if ((event.target as Element).closest(selector))
          reasons.push(
            (event as CustomEvent<{ reason: string }>).detail.reason,
          );
      },
      true,
    );
  }, scope);
  return () => page.evaluate(() => Reflect.get(window, 'handoffs'));
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('the dashboard resolves card by card, each with the full handoff', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Tall enough to show the whole board: offscreen cards swap at once.
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.goto('/examples/');
  const handoffs = await recordHandoffs(page, '[data-dashboard]');
  const board = page.locator('[data-dashboard]');
  // Three KPIs, the chart, the customers and the invoices.
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(Array(6).fill('complete'));
  await expect(board.getByText('Ana Ribeiro').first()).toBeVisible();
  expect(
    await board
      .locator('dotquilt-text-loader')
      .evaluateAll((loaders) => loaders.map((loader) => loader.textContent)),
  ).toEqual(['$48,210', '1,284', '0.8%']);
  expect(errors).toEqual([]);
});

test('the dashboard can be paused, replayed and redrawn with another mark', async ({
  page,
}) => {
  await page.goto('/examples/');
  const board = page.locator('[data-dashboard]');
  const app = board.locator('.app');
  await board.getByRole('button', { name: 'Pause' }).click();
  await expect(app).toHaveAttribute('motion', 'paused');
  await board.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(app).not.toHaveAttribute('motion');
  await board.getByRole('radio', { name: 'Dash' }).click();
  expect(
    await app
      .locator(
        'dotquilt-chart-loader, dotquilt-table-loader, dotquilt-text-loader',
      )
      .evaluateAll((loaders) =>
        loaders.map((loader) => loader.getAttribute('mark')),
      ),
  ).toEqual(Array(5).fill('dash'));
  await board.getByRole('button', { name: 'Replay' }).click();
  await expect(app.locator('dotquilt-text-loader').first()).toHaveAttribute(
    'state',
    'pending',
  );
});

test('a recipe loads when it scrolls into view and again on request', async ({
  page,
}) => {
  await page.goto('/examples/');
  const card = page.locator('#bar-chart');
  const handoffs = await recordHandoffs(page, '#bar-chart');
  await card.scrollIntoViewIfNeeded();
  await expect.poll(handoffs, { timeout: 8000 }).toEqual(['complete']);
  await expect(card.locator('dotquilt-chart-loader')).toHaveAttribute(
    'mark',
    'square',
  );
  await card.getByRole('button', { name: 'Load again' }).click();
  await expect(card.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'pending',
  );
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(['complete', 'complete']);
});

test('a recipe opens its code beside it, generated from the same settings', async ({
  page,
}) => {
  await page.goto('/examples/');
  const card = page.locator('#bar-chart');
  const toggle = card.getByRole('button', { name: 'Code' });
  await toggle.click();
  await expect(card.getByRole('button', { name: 'Hide code' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const react = page.locator('#bar-chart-code');
  await expect(react).toContainText('variant="bar"');
  await expect(react).toContainText('mark="square"');
  await expect(react).toContainText(
    "import { bars } from 'dotquilt/animations/chart'",
  );
  await expect(
    card.getByRole('link', { name: 'Open in playground' }),
  ).toHaveAttribute(
    'href',
    '/playground/?component=chart&mark=square&variant=bar&idle=bars',
  );
});

test('filters show one family and are kept in the link', async ({ page }) => {
  await page.goto('/examples/?show=chart');
  const gallery = page.locator('[data-gallery]');
  await expect(
    gallery.getByRole('button', { name: 'ChartLoader' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(gallery.locator('[data-recipe]:visible')).toHaveCount(6);
  await expect(gallery.locator('#dashboard')).toBeHidden();
  await gallery.getByRole('button', { name: 'All' }).click();
  await expect(gallery.locator('[data-recipe]:visible')).toHaveCount(21);
  await expect(page).toHaveURL(/\/examples\/$/);
});

test('the hover example lights its marks around the pointer', async ({
  page,
}) => {
  await page.goto('/examples/');
  const card = page.locator('#hover-skeleton');
  await card.scrollIntoViewIfNeeded();
  const circle = card.locator('dotquilt-skeleton-circle');
  await expect(circle).toHaveAttribute('pointer-response', 'lift');
  await expect(card.locator('.uses')).toContainText('pointer lift');
});
