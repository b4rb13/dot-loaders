import { expect, type Page, test } from '@playwright/test';

// The Nuxt example (examples/nuxt): @dotquilt/vue in a real Nuxt build,
// server-rendered, hydrated, and through a client-side navigation.

function watchErrors(page: Page) {
  const problems: string[] = [];
  // Problems a loader reports, such as a value it can't read as text.
  void page.addInitScript(() =>
    document.addEventListener(
      'dotquilt-error',
      (event) =>
        console.error(`dotquilt-error ${(event as CustomEvent).detail.code}`),
      true,
    ),
  );
  page.on('pageerror', (error) => problems.push(error.message));
  // Vue reports hydration mismatches as console errors and warnings (the
  // example turns on their details in production).
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(message.text());
  });
  return problems;
}

test('the placeholders are in the server HTML, before any JavaScript', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<dotquilt-region[^>]*state="pending"/);
  expect(html).toMatch(/<div slot="placeholder"[^>]*aria-hidden="true" inert/);
  expect(html).toContain('<dotquilt-skeleton-circle');
  expect(html).toContain('data-dotquilt-static');
  expect(html).toContain(':is(:not(:defined),:state(unstyled))');
  expect(html).toMatch(/<dotquilt-text-loader[^>]*state="pending"/);
  const revenue = await (await request.get('/revenue')).text();
  // Four rows of the table's static outline, one rule per row.
  expect(revenue).toMatch(/<dotquilt-table-loader[^>]*rows="4"/);
});

test('the page hydrates without errors and hands over when the data arrives', async ({
  page,
}) => {
  const problems = watchErrors(page);
  await page.goto('/');
  const team = page.getByRole('group', { name: 'Team members' });
  await expect(team).toHaveAttribute('data-presentation', 'pending');
  await expect(team).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(page.getByText('Ana Kovač')).toBeVisible();
  // The handoff-end event reached the Vue component once.
  await expect(page.getByText('Handovers: 1')).toBeVisible();
  // The value shows and is what assistive technology reads; the mask's
  // placeholder copies stay hidden from both.
  const total = page.getByLabel('Revenue this month');
  await expect(total.getByText('$48,120')).toBeVisible();
  const read = await total.ariaSnapshot();
  expect(read).toContain('$48,120');
  expect(read).not.toContain('$00,000');
  // Reloading goes back to the placeholder, then hands over again, once.
  await page.getByRole('button', { name: 'Reload' }).click();
  await expect(team).toHaveAttribute('data-presentation', 'pending');
  await expect(team).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(page.getByText('Handovers: 2')).toBeVisible();
  expect(problems).toEqual([]);
});

test('pending content is hidden from assistive technology until it is ready', async ({
  page,
}) => {
  await page.goto('/');
  const team = page.getByRole('group', { name: 'Team members' });
  await expect(team).toHaveAttribute('data-presentation', 'pending');
  // The placeholder is decoration and the content isn't there yet: only the
  // group itself is read out.
  expect(await team.ariaSnapshot()).toBe('- group "Team members"');
  await expect(team).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  expect(await team.ariaSnapshot()).toContain('Ana Kovač');
});

test('after a client-side navigation, the next page loads and hands over the same way', async ({
  page,
}) => {
  const problems = watchErrors(page);
  await page.goto('/');
  await expect(
    page.getByRole('group', { name: 'Team members' }),
  ).toHaveAttribute('data-presentation', 'ready', { timeout: 5000 });
  // A soft navigation: Nuxt swaps the page without a document load.
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
  // Options the Vue component passes as properties reach the element.
  const table = page
    .getByRole('group', { name: 'Invoices' })
    .locator('dotquilt-table-loader');
  expect(
    await table.evaluate((element) =>
      (element as HTMLElement & { columns: { kind: string }[] }).columns.map(
        (column) => column.kind,
      ),
    ),
  ).toEqual(['text', 'number', 'badge']);
  await expect(table).toHaveAttribute('mark', 'dash');
  await expect(chart).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(
    chart.getByRole('img', { name: 'Revenue by month' }),
  ).toBeVisible();
  // Back again: the team list mounts fresh, and its events fire once.
  await page.getByRole('link', { name: 'Team' }).click();
  await expect(
    page.getByRole('group', { name: 'Team members' }),
  ).toHaveAttribute('data-presentation', 'ready', { timeout: 5000 });
  await expect(page.getByText('Handovers: 1')).toBeVisible();
  expect(problems).toEqual([]);
});

test('with reduced motion, the placeholders stay still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/revenue');
  const loader = page
    .getByRole('group', { name: 'Revenue by month' })
    .locator('dotquilt-chart-loader');
  await expect(loader).toHaveAttribute('data-dotquilt-surface', '');
  await page.waitForTimeout(300);
  await expect(loader).not.toHaveAttribute('data-moving', '');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the placeholders keep the page layout: each component is one element', async ({
    page,
  }) => {
    await page.goto('/');
    // The example's own `.member-skeleton > :first-child` rule finds the circle.
    const row = page.locator('.member-skeleton').first();
    expect(
      await row.evaluate((element) => element.firstElementChild?.localName),
    ).toBe('dotquilt-skeleton-circle');
    const circle = row.locator('dotquilt-skeleton-circle');
    expect((await circle.boundingBox())?.height).toBeCloseTo(40, 0);
    const box = await row.boundingBox();
    expect(box?.height).toBeLessThan(60);
    // A pending region with no content yet reserves its placeholder's space,
    // so what follows it doesn't move when the element takes over.
    const region = page.getByRole('group', { name: 'Team members' });
    const placeholder = region.locator('[slot=placeholder]');
    const [regionBox, placeholderBox, noteBox] = await Promise.all([
      region.boundingBox(),
      placeholder.boundingBox(),
      page.getByText('Handovers: 0').boundingBox(),
    ]);
    expect(regionBox?.height ?? 0).toBeGreaterThanOrEqual(
      placeholderBox?.height ?? 1,
    );
    expect(noteBox?.y ?? 0).toBeGreaterThanOrEqual(
      (regionBox?.y ?? 0) + (regionBox?.height ?? 0),
    );
  });
});
