import { expect, type Page, test } from '@playwright/test';

// The docs site's Angular examples (examples/angular/src/app/docs), on the
// example's /docs page: server-rendered, hydrated, then loaded in the browser.

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
  // Angular reports a hydration mismatch as a console error (NG05xx). Also
  // mark the server-rendered loaders before any script runs: hydration must
  // keep them, not render them again.
  await page.addInitScript(() =>
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive')
        for (const element of document.querySelectorAll(
          'dotquilt-region, dotquilt-text-loader',
        ))
          (element as HTMLElement & { fromServer?: boolean }).fromServer = true;
    }),
  );
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

test('every example is pending in the server HTML, before any JavaScript', async ({
  request,
}) => {
  const html = await (await request.get('/docs')).text();
  for (const name of regions)
    expect(html).toMatch(
      new RegExp(
        `<dotquilt-region[^>]*aria-label="${name}"[^>]*state="pending"`,
      ),
    );
  expect(html.match(/<dotquilt-region[^>]*state="pending"/g)).toHaveLength(5);
  expect(html).toMatch(
    /<dotquilt-text-loader[^>]*aria-label="Revenue this month"[^>]*state="pending"/,
  );
  // Each region's placeholder is in the HTML, hidden and inert.
  expect(
    html.match(/<div slot="placeholder"[^>]*aria-hidden="true" inert/g),
  ).toHaveLength(5);
});

test('every example hydrates without errors, loads and shows its content', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  for (const name of regions)
    await expect(
      page.getByRole('group', { name, exact: true }),
    ).toHaveAttribute('data-presentation', 'ready', { timeout: 5000 });
  // Hydration kept the server's elements.
  expect(
    await page.evaluate(() =>
      [
        ...document.querySelectorAll('dotquilt-region, dotquilt-text-loader'),
      ].map((element) =>
        Boolean((element as HTMLElement & { fromServer?: boolean }).fromServer),
      ),
    ),
  ).toEqual(Array(6).fill(true));

  const member = page.getByRole('group', { name: 'Team member' });
  await expect(
    member.getByRole('heading', { name: 'Ada Lovelace' }),
  ).toBeVisible();
  await expect(member.getByText('Engineering lead')).toBeVisible();

  const total = page.getByRole('group', { name: 'Revenue this month' });
  await expect(total).toHaveAttribute('data-presentation', 'ready');
  await expect(total.getByText('$48,120')).toBeVisible();
  expect(await total.ariaSnapshot()).not.toContain('$00,000');

  await expect(
    page
      .getByRole('group', { name: 'Revenue in 2026' })
      .getByRole('img', { name: 'Revenue in 2026, by month' }),
  ).toBeVisible();

  const invoices = page.getByRole('group', { name: 'Invoices' });
  await expect(
    invoices.getByRole('row').filter({ has: page.getByRole('cell') }),
  ).toHaveCount(4);
  await expect(
    invoices.getByRole('columnheader', { name: 'Due' }),
  ).toBeVisible();

  await expect(
    page
      .getByRole('group', { name: 'Assistant reply' })
      .getByText('The Globex invoice was due on Oct 28 and is now overdue.'),
  ).toBeVisible();

  await expect(
    page.getByRole('group', { name: 'Recent activity' }).getByRole('listitem'),
  ).toHaveCount(3);

  expect(problems).toEqual([]);
});

test('refreshing the activity feed keeps the list visible, then settles', async ({
  page,
}) => {
  const problems = await watchErrors(page);
  await page.goto('/docs');
  const feed = page.getByRole('group', { name: 'Recent activity' });
  await expect(feed).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(feed).toHaveAttribute('data-presentation', 'refreshing');
  // Refreshing keeps the content visible and usable.
  await expect(feed.getByRole('listitem')).toHaveCount(3);
  await expect(feed.getByText('Northwind paid $4,200')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  await expect(feed).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  await expect(feed.getByRole('listitem')).toHaveCount(3);
  expect(problems).toEqual([]);
});
