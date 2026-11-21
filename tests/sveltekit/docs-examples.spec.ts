import { expect, type Page, test } from '@playwright/test';

// The Svelte examples the docs site shows on its component pages
// (examples/sveltekit/src/lib/docs), on /docs: server-rendered, hydrated,
// and handed over when their data arrives.

const regions = [
  'Team member',
  'Revenue in 2026',
  'Invoices',
  'Assistant reply',
  'Recent activity',
];
const loaders =
  'dotquilt-region, dotquilt-text-loader, dotquilt-skeleton-block';

async function watchErrors(page: Page) {
  const problems: string[] = [];
  // Problems a loader reports, such as a value it can't read as text.
  await page.addInitScript(() =>
    document.addEventListener(
      'dotquilt-error',
      (event) =>
        console.error(
          `dotquilt-error ${(event as CustomEvent).detail.code} on ${
            (event.target as Element).localName
          }`,
        ),
      true,
    ),
  );
  page.on('pageerror', (error) => problems.push(error.message));
  // A production Svelte build doesn't log a hydration mismatch: it renders
  // again, replacing the server's nodes. Mark the server-rendered loaders
  // before any script runs; they must still be the page's after hydration.
  await page.addInitScript(
    (selector) =>
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive')
          for (const element of document.querySelectorAll(selector))
            (element as HTMLElement & { fromServer?: boolean }).fromServer =
              true;
      }),
    loaders,
  );
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(message.text());
  });
  return problems;
}

/** Whether each loader on the page is still the one the server rendered. */
const fromServer = (page: Page) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((element) =>
        Boolean((element as HTMLElement & { fromServer?: boolean }).fromServer),
      ),
    loaders,
  );

test('every example is pending in the server HTML, with its placeholder', async ({
  request,
}) => {
  const html = await (await request.get('/docs')).text();
  for (const label of regions)
    expect(html, label).toMatch(
      new RegExp(
        `<dotquilt-region[^>]*aria-label="${label}"[^>]*state="pending"`,
      ),
    );
  expect(html).toMatch(
    /<dotquilt-text-loader[^>]*aria-label="Revenue this month"[^>]*state="pending"/,
  );
  // Each region's placeholder, hidden from assistive technology.
  expect(
    html.match(/<div slot="placeholder"[^>]*aria-hidden="true" inert/g),
  ).toHaveLength(regions.length);
  for (const loader of [
    'dotquilt-skeleton-circle',
    'dotquilt-chart-loader',
    'dotquilt-table-loader',
    'dotquilt-typing-dots',
    'dotquilt-skeleton-text',
  ])
    expect(html).toContain(`<${loader}`);
});

test('the examples hydrate without errors and hand over to their data', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  const region = (name: string) =>
    page.getByRole('group', { name, exact: true });
  const total = page.getByLabel('Revenue this month', { exact: true });
  await expect(region('Team member')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  for (const name of regions)
    await expect(region(name), name).toHaveAttribute(
      'data-presentation',
      'ready',
      { timeout: 5000 },
    );
  await expect(total).toHaveAttribute('data-presentation', 'ready');
  // Hydration kept the server's elements: five regions and the total.
  expect(await fromServer(page)).toEqual(Array(6).fill(true));

  await expect(
    region('Team member').getByRole('heading', { name: 'Ada Lovelace' }),
  ).toBeVisible();
  await expect(total.getByText('$48,120')).toBeVisible();
  await expect(
    region('Revenue in 2026').getByRole('img', {
      name: 'Revenue in 2026, by month',
    }),
  ).toBeVisible();
  // Four invoices under the header row.
  await expect(
    region('Invoices')
      .getByRole('row')
      .filter({ has: page.getByRole('cell') }),
  ).toHaveCount(4);
  await expect(
    region('Assistant reply').getByText(
      'The Globex invoice was due on Oct 28 and is now overdue.',
    ),
  ).toBeVisible();
  await expect(region('Recent activity').getByRole('listitem')).toHaveCount(3);
  expect(problems).toEqual([]);
});

test('refreshing the activity feed keeps the list visible, then settles', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  const feed = page.getByRole('group', {
    name: 'Recent activity',
    exact: true,
  });
  await expect(feed).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  const refresh = page.getByRole('button', { name: 'Refresh' });
  await refresh.click();
  await expect(feed).toHaveAttribute('data-presentation', 'refreshing');
  await expect(refresh).toBeDisabled();
  // The list you already have stays visible and readable meanwhile.
  await expect(feed.getByRole('listitem')).toHaveCount(3);
  await expect(feed.getByText('Northwind paid $4,200')).toBeVisible();
  await expect(feed).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(refresh).toBeEnabled();
  expect(problems).toEqual([]);
});

test('a SkeletonBlock renders its static markup on the server and registers after hydration', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/checks')).text();
  const markup = html.match(
    /<dotquilt-skeleton-block[^>]*data-check="block"[^>]*>(.*?)<\/dotquilt-skeleton-block>/s,
  )?.[1];
  // The static marks the server draws, shown until the element registers.
  expect(markup).toContain('<span data-dotquilt-static');
  const problems = await watchErrors(page);
  await page.goto('/checks');
  const block = page.locator('[data-check=block]');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(customElements.get('dotquilt-skeleton-block')),
      ),
    )
    .toBe(true);
  expect(await block.evaluate((element) => element.matches(':defined'))).toBe(
    true,
  );
  expect((await block.boundingBox())?.height).toBeCloseTo(48, 0);
  // Hydration kept the server's element.
  expect(
    await block.evaluate((element) =>
      Boolean((element as HTMLElement & { fromServer?: boolean }).fromServer),
    ),
  ).toBe(true);
  // The page's TypingDots has an invalid count on purpose; nothing else
  // reports a problem.
  expect(
    problems.filter((problem) => !problem.endsWith('on dotquilt-typing-dots')),
  ).toEqual([]);
});
