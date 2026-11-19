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

test('the first screen arrives: the line draws in and each metric hands over', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const hero = page.locator('[data-field-hero]');
  const handoffs = await recordHandoffs(page, '[data-field-hero]');
  await expect(
    hero.getByRole('heading', {
      level: 1,
      name: 'Loading states that hand over.',
    }),
  ).toBeVisible();
  await expect(hero.getByRole('link', { name: 'Get started' })).toHaveAttribute(
    'href',
    '/docs/',
  );
  await expect(
    hero.getByRole('link', { name: 'See the components' }),
  ).toBeVisible();
  // The values wait in square marks, then hand over one after another.
  const values = hero.locator('dotquilt-text-loader');
  await expect(values.first()).toHaveAttribute('state', 'pending');
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(Array(3).fill('complete'));
  expect(
    await values.evaluateAll((loaders) =>
      loaders.map((loader) => loader.textContent?.trim()),
    ),
  ).toEqual(['$48,210', '1,284', '0.8%']);
  await expect(
    hero.getByText('Example data. Each value is a live TextLoader.'),
  ).toBeVisible();
  // At rest the chart line is fully drawn.
  await expect
    .poll(() =>
      hero
        .locator('.line')
        .evaluate((line) => getComputedStyle(line).strokeDashoffset),
    )
    .toMatch(/^0(px)?$/);
  expect(errors).toEqual([]);
});

test('with reduced motion the first screen shows at rest, values in place', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('[data-field-hero]');
  await expect(hero).not.toHaveAttribute('data-arrive');
  await expect(
    hero.locator('dotquilt-text-loader').first(),
  ).not.toHaveAttribute('state', 'pending');
  // The loader's own text, not the marks drawn in its shadow root.
  expect(
    await hero
      .locator('dotquilt-text-loader')
      .first()
      .evaluate((loader) => loader.textContent?.trim()),
  ).toBe('$48,210');
});

test('the first screen fits the window at desktop, tablet and phone widths', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 960],
    [820, 1100],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const box = await page.locator('[data-field-hero] h1').boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(width);
  }
  // At 1440 the drawing reaches the window's right edge and the metric
  // cards sit inside the first screen.
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  const art = await page.locator('[data-field-hero] .art').boundingBox();
  expect(art && Math.round(art.x + art.width)).toBe(1440);
  const card = await page
    .locator('[data-field-hero] .metric')
    .last()
    .boundingBox();
  expect(card && card.y + card.height).toBeLessThanOrEqual(960);
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
