import { expect, test } from '@playwright/test';

test('real loading and reveal preserve content across configuration changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playground');
  const host = page.locator('dotquilt-region');
  const content = page
    .getByTestId('preview')
    .getByText('Loading should feel', { exact: false });
  await expect(content).toBeVisible();
  await content.evaluate((node) => {
    node.setAttribute('data-identity', 'retained');
  });
  await page.getByRole('button', { name: 'Start loading' }).click();
  await expect(host).toHaveAttribute('state', 'pending');
  const cycle = await host.evaluate((node) => Reflect.get(node, 'cycle'));
  await page
    .getByRole('combobox', { name: 'Integration', exact: true })
    .selectOption('native');
  await page
    .getByRole('combobox', { name: 'Placeholder lines', exact: true })
    .selectOption('5');
  expect(await host.evaluate((node) => Reflect.get(node, 'cycle'))).toBe(cycle);
  await expect(content).toHaveAttribute('data-identity', 'retained');
  await expect
    .poll(() =>
      page
        .locator('dotquilt-skeleton-text')
        .evaluate((node) => Reflect.get(node, 'lines')),
    )
    .toBe(5);
  await page.getByRole('button', { name: 'Reveal content' }).click();
  await expect(content).toBeVisible();
  await expect(host).toHaveAttribute('state', 'ready');
  expect(errors).toEqual([]);
});

test('shared state restores bounded settings and starts static', async ({
  page,
}) => {
  await page.goto(
    '/playground?schema=1&version=0.0.0-m2.0&integration=native&lines=4',
  );
  await expect(
    page.getByRole('combobox', { name: 'Integration', exact: true }),
  ).toHaveValue('native');
  await expect(
    page.getByRole('combobox', { name: 'Placeholder lines', exact: true }),
  ).toHaveValue('4');
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
  await expect(
    page
      .getByTestId('preview')
      .getByText('Loading should feel', { exact: false }),
  ).toBeVisible();
  await page.goto(
    '/playground?schema=1&version=0.0.0-m2.0&integration=native&lines=999&autoplay=1',
  );
  await expect(page.getByRole('status')).toContainText('unsupported settings');
  await expect(
    page.getByRole('combobox', { name: 'Placeholder lines', exact: true }),
  ).toHaveValue('3');
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
});

test('pause persists across navigation and settles ready content', async ({
  page,
}) => {
  await page.goto('/playground');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await page.getByRole('button', { name: 'Start loading' }).click();
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'motion',
    'paused',
  );
  await page.getByRole('button', { name: 'Reveal content' }).click();
  await expect(
    page
      .getByTestId('preview')
      .getByText('Loading should feel', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Motion paused' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('clipboard denial provides the requested configuration text', async ({
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
  await page.goto('/playground');
  await page.getByRole('button', { name: 'Copy configuration link' }).click();
  await expect(page.getByLabel('Copy manually')).toHaveValue(
    /http:\/\/127.0.0.1:\d+\/playground\?schema=1&version=0.0.0-m2.0/,
  );
  await expect(page.locator('.feedback')).not.toContainText('copied');
});

test('clipboard success is acknowledged after the write resolves', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => {} },
    }),
  );
  await page.goto('/playground');
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.locator('.feedback')).toHaveText('Component code copied.');
});

test('320px layout keeps navigation, content and code reachable without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/playground');
  await expect(page.locator('.code-panel')).not.toHaveAttribute('open');
  await page.getByText('Documentation navigation', { exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Mobile documentation' }),
  ).toBeVisible();
  await page.locator('.code-panel > summary').click();
  await expect(page.locator('.code-panel pre')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.code-panel pre').focus();
  await expect(page.locator('.code-panel pre')).toBeFocused();
});

test('docs and useful content remain readable with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/docs');
    await expect(
      page.getByRole('heading', { name: 'Set up the private preview' }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('preview')
        .getByText('Loading should feel', { exact: false }),
    ).toBeVisible();
    await page.locator('.code-panel > summary').click();
    await expect(page.locator('.code-panel code')).toContainText(
      'LoadingRegion',
    );
    await expect(
      page.getByRole('link', { name: 'Playground', exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
