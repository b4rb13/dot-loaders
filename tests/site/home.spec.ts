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
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto('/');
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
  await page.goto('/');
  const board = page.locator('[data-dashboard]');
  const app = board.locator('.app');
  await board.getByRole('button', { name: 'Pause' }).click();
  await expect(app).toHaveAttribute('motion', 'paused');
  await board.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(app).not.toHaveAttribute('motion');
  await board.getByRole('radio', { name: 'Dash' }).click();
  await expect(board.getByRole('radio', { name: 'Dash' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(
    await app
      .locator(
        'dotquilt-chart-loader, dotquilt-table-loader, dotquilt-text-loader',
      )
      .evaluateAll((loaders) =>
        loaders.map((loader) => loader.getAttribute('mark')),
      ),
  ).toEqual(Array(5).fill('dash'));
  // Replaying starts a fresh load: the KPIs are pending again.
  await board.getByRole('button', { name: 'Replay' }).click();
  await expect(app.locator('dotquilt-text-loader').first()).toHaveAttribute(
    'state',
    'pending',
  );
});

test('every family tile loads and hands over in turn', async ({ page }) => {
  await page.goto('/');
  const handoffs = await recordHandoffs(page, '[data-family]');
  await page.locator('[data-family]').scrollIntoViewIfNeeded();
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(Array(6).fill('complete'));
});

test('the handoff plays at full speed or slowed down, with its timeline', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('.handoff');
  await section.scrollIntoViewIfNeeded();
  const handoffs = await recordHandoffs(page, '.handoff');
  await expect.poll(handoffs, { timeout: 6000 }).toEqual(['complete']);
  await section.getByRole('button', { name: 'Play slowly' }).click();
  await expect(section.getByText('3.8 s')).toBeVisible();
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(['complete', 'complete']);
});

test('make it yours restyles the loaders and writes the CSS', async ({
  page,
}) => {
  await page.goto('/');
  const yours = page.locator('[data-yours]');
  await yours.scrollIntoViewIfNeeded();
  const css = yours.locator('[data-css]');
  await expect(css).toHaveText('/* The defaults: nothing to add. */');
  await yours.getByRole('radio', { name: 'Sage' }).click();
  await yours.getByRole('radio', { name: 'Dash' }).click();
  await expect(css).toContainText('--dotquilt-color: light-dark(#5f7a6c');
  await expect(css).toContainText('mark="dash"');
  // Squares and dashes have a fixed size.
  await expect(yours.locator('[data-size]')).toBeDisabled();
  expect(
    await yours
      .locator('[data-preview-loaders]')
      .evaluate((preview) =>
        getComputedStyle(preview).getPropertyValue('--dotquilt-color'),
      ),
  ).toContain('#5f7a6c');
});
