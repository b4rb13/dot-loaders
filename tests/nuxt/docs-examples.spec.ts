import { expect, type Page, test } from '@playwright/test';

// The Vue versions of the docs examples (examples/nuxt/app/docs), which the
// docs site shows in its Vue tabs: server-rendered with their placeholders,
// hydrated, and handed over to the real content.

async function watchErrors(page: Page) {
  const problems: string[] = [];
  // Problems a loader reports, such as a value it can't read as text.
  await page.addInitScript(() =>
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

const regions = [
  'Team member',
  'Revenue in 2026',
  'Invoices',
  'Assistant reply',
  'Recent activity',
];

test('every placeholder is in the server HTML, pending', async ({
  request,
}) => {
  const html = await (await request.get('/docs')).text();
  const tags = html.match(/<dotquilt-region[^>]*>/g) ?? [];
  expect(tags.map((tag) => tag.match(/aria-label="([^"]*)"/)?.[1])).toEqual(
    regions,
  );
  for (const tag of tags) expect(tag).toContain('state="pending"');
  expect(html.match(/<div slot="placeholder"/g)).toHaveLength(5);
  expect(html).toMatch(
    /<dotquilt-text-loader[^>]*aria-label="Revenue this month"[^>]*state="pending"/,
  );
});

test('every example hydrates without errors and hands over to its content', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  for (const name of regions)
    await expect(page.getByRole('group', { name })).toHaveAttribute(
      'data-presentation',
      'pending',
    );
  for (const name of regions) {
    const region = page.getByRole('group', { name });
    await expect(region).toHaveAttribute('state', 'ready', { timeout: 5000 });
    // The presentation turns ready only when the handoff has ended.
    await expect(region).toHaveAttribute('data-presentation', 'ready', {
      timeout: 5000,
    });
  }
  await expect(
    page.getByRole('heading', { name: 'Ada Lovelace' }),
  ).toBeVisible();
  const total = page.getByLabel('Revenue this month');
  await expect(total).toHaveAttribute('state', 'ready');
  await expect(total.getByText('$48,120')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Revenue in 2026, by month' }),
  ).toBeVisible();
  const invoices = page.getByRole('group', { name: 'Invoices' });
  const rows = invoices
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toBeVisible();
  await expect(
    page
      .getByRole('group', { name: 'Assistant reply' })
      .getByText('The Globex invoice was due on Oct 28 and is now overdue.'),
  ).toBeVisible();
  const activity = page
    .getByRole('group', { name: 'Recent activity' })
    .getByRole('listitem');
  await expect(activity).toHaveCount(3);
  await expect(activity.first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('Refresh keeps the activity on screen while it loads again', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  const feed = page.getByRole('group', { name: 'Recent activity' });
  const items = feed.getByRole('listitem');
  await expect(feed).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  const refresh = page.getByRole('button', { name: 'Refresh' });
  await refresh.click();
  await expect(feed).toHaveAttribute('state', 'refreshing');
  await expect(feed).toHaveAttribute('data-presentation', 'refreshing');
  await expect(refresh).toBeDisabled();
  await expect(items).toHaveCount(3);
  await expect(items.first()).toBeVisible();
  await expect(feed).toHaveAttribute('state', 'ready', { timeout: 5000 });
  await expect(feed).toHaveAttribute('data-presentation', 'ready');
  await expect(refresh).toBeEnabled();
  await expect(items).toHaveCount(3);
  expect(problems).toEqual([]);
});

test('a SkeletonBlock has its static marks in the server HTML and registers after hydration', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/checks')).text();
  const block = html.match(
    /<dotquilt-skeleton-block[^>]*data-check="block"[\s\S]*?<\/dotquilt-skeleton-block>/,
  )?.[0];
  expect(block).toContain('data-dotquilt-static');
  const problems = await watchErrors(page);
  await page.goto('/checks');
  await expect
    .poll(() =>
      page.evaluate(() => !!customElements.get('dotquilt-skeleton-block')),
    )
    .toBe(true);
  expect(
    await page
      .locator('[data-check=block]')
      .evaluate((element) => element.matches(':defined')),
  ).toBe(true);
  expect(problems).toEqual([]);
});
