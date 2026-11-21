import { expect, type Page, test } from '@playwright/test';

// The Next.js example (examples/next): the React adapter in a real App Router
// build, server-rendered, hydrated, and through a client-side navigation.

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // React reports hydration mismatches as console errors.
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('the placeholders are in the server HTML, before any JavaScript', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<dotquilt-region[^>]*state="pending"/);
  expect(html).toContain('<dotquilt-skeleton-circle');
  expect(html).toMatch(/<dotquilt-text-loader[^>]*state="pending"/);
});

test('the page hydrates without errors and hands over when the data arrives', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const team = page.getByRole('group', { name: 'Team members' });
  await expect(team).toHaveAttribute('data-presentation', 'pending');
  await expect(team).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(page.getByText('Ana Kovač')).toBeVisible();
  // The value shows and is what assistive technology reads; the mask's
  // placeholder copies stay hidden from both.
  const total = page.getByLabel('Revenue this month');
  await expect(total.getByText('$48,120')).toBeVisible();
  const read = await total.ariaSnapshot();
  expect(read).toContain('$48,120');
  expect(read).not.toContain('$00,000');
  // Reloading goes back to the placeholder, then hands over again.
  await page.getByRole('button', { name: 'Reload' }).click();
  await expect(team).toHaveAttribute('data-presentation', 'pending');
  await expect(team).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});

test('after a client-side navigation, the next page loads and hands over the same way', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(
    page.getByRole('group', { name: 'Team members' }),
  ).toHaveAttribute('data-presentation', 'ready', { timeout: 5000 });
  // A soft navigation: Next swaps the page without a document load.
  const loaded = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Revenue' }).click();
  await expect(page.getByRole('heading', { name: 'Revenue' })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(loaded);
  const chart = page.getByRole('group', { name: 'Revenue by month' });
  await expect(chart).toHaveAttribute('data-presentation', 'pending');
  // The chart placeholder, new to this document, is styled and draws marks.
  const loader = chart.locator('dotquilt-chart-loader');
  await expect(loader).toHaveAttribute('data-moving', '');
  expect((await loader.boundingBox())?.height).toBeCloseTo(160, 0);
  await expect(chart).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(
    chart.getByRole('img', { name: 'Revenue by month' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test("the page's own classes size the loaders, and a region with content keeps its placeholder's space", async ({
    page,
  }) => {
    await page.goto('/checks');
    const avatar = await page.locator('[data-check=avatar]').boundingBox();
    expect(avatar?.width).toBeCloseTo(48, 0);
    // `.check-total` makes the text loader a block-level grid, as wide as the
    // heading above it.
    const [totalBox, headingBox] = await Promise.all([
      page.locator('[data-check=total]').boundingBox(),
      page.getByRole('heading', { name: 'Checks' }).boundingBox(),
    ]);
    expect(totalBox?.width).toBeCloseTo(headingBox?.width ?? 0, 0);
    const region = page.locator('[data-check=region]');
    const [regionBox, placeholderBox, afterBox] = await Promise.all([
      region.boundingBox(),
      region.locator('[slot=placeholder]').boundingBox(),
      page.locator('[data-check=after]').boundingBox(),
    ]);
    expect(placeholderBox?.height ?? 0).toBeGreaterThan(20);
    expect(regionBox?.height ?? 0).toBeGreaterThanOrEqual(
      placeholderBox?.height ?? 1,
    );
    expect(afterBox?.y ?? 0).toBeGreaterThanOrEqual(
      (placeholderBox?.y ?? 0) + (placeholderBox?.height ?? 0),
    );
  });

  test('a pending region with no content yet reserves its placeholder space', async ({
    page,
  }) => {
    await page.goto('/');
    const region = page.getByRole('group', { name: 'Team members' });
    const [regionBox, placeholderBox] = await Promise.all([
      region.boundingBox(),
      region.locator('[slot=placeholder]').boundingBox(),
    ]);
    expect(placeholderBox?.height ?? 0).toBeGreaterThan(20);
    expect(regionBox?.height ?? 0).toBeGreaterThanOrEqual(
      placeholderBox?.height ?? 1,
    );
  });
});
