import { expect, test } from '@playwright/test';

import { catalog } from '../../apps/website/lib/catalog';

const pages = [
  {
    route: '/docs',
    title: 'Quickstart',
    anchors: [
      'setup',
      'readiness',
      'example',
      'boundaries',
      'complete-example',
    ],
  },
  ...catalog.map((item) => ({
    route: `/docs/components/${item.slug}`,
    title: item.name,
    anchors: [
      'overview',
      'example',
      'api',
      'motion',
      'animation-options',
      'accessibility',
      'rendering',
      'component-code',
      'complete-example',
    ],
  })),
];

for (const doc of pages) {
  test(`${doc.title}: authored contents retain canonical URLs and unique legacy anchors`, async ({
    page,
  }) => {
    const response = await page.goto(doc.route);
    expect(response?.headers()['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    await expect(page).toHaveTitle(new RegExp(doc.title));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /.+/,
    );
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeEnabled();
    const links = page.locator('#nd-toc a');
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href')),
      ),
    ).toEqual(doc.anchors.map((id) => `#${id}`));
    for (const id of doc.anchors)
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    expect(
      await page.locator('[id]').evaluateAll((nodes) => {
        const ids = nodes.map((node) => node.id);
        return ids.length === new Set(ids).size;
      }),
    ).toBe(true);
    await links.last().click();
    await expect(page).toHaveURL(new RegExp(`${doc.route}#complete-example$`));
    await expect(page.locator('#complete-example')).toBeInViewport();
  });

  test(`${doc.title}: MDX prose, anchors and complete files remain useful without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      ...(baseURL ? { baseURL } : {}),
    });
    try {
      const page = await context.newPage();
      await page.goto(doc.route);
      await expect(page.locator('main h1')).toBeVisible();
      if (doc.route !== '/docs')
        await expect(
          page.getByRole('button', { name: 'Start loading', exact: true }),
        ).toBeDisabled();
      for (const id of doc.anchors)
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      if (doc.route === '/docs')
        await page.locator('.code-panel > summary').click();
      await expect(
        page
          .locator(
            doc.route !== '/docs'
              ? '.reference-code figure code'
              : '.code-panel code',
          )
          .first(),
      ).toContainText(
        doc.title === 'TextLoader' ? 'TextLoader' : 'LoadingRegion',
      );
      await expect(
        page.getByRole('link', { name: 'Playground', exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test(`${doc.title}: 320px reading and keyboard code access preserve the Fumadocs frame`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(doc.route);
    await page
      .getByRole('button', { name: 'Open Sidebar', exact: true })
      .click();
    await expect(page.locator('#nd-sidebar-mobile')).toBeVisible();
    await page.keyboard.press('Escape');
    if (doc.route === '/docs')
      await page.locator('.code-panel > summary').click();
    const code =
      doc.route !== '/docs'
        ? page.getByRole('region', {
            name: 'React component code',
            exact: true,
          })
        : page.locator('.code-panel pre').first();
    await code.focus();
    await expect(code).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('MDX references preserve typed option commits and loading identity', async ({
  page,
}) => {
  await page.goto('/docs/components/text-loader');
  const start = page.getByRole('button', {
    name: 'Start loading',
    exact: true,
  });
  await expect(start).toBeEnabled();
  const owner = page.locator('dotquilt-text-loader').first();
  await owner.evaluate((node) => Reflect.set(window, 'mdxOwner', node));
  await start.click();
  const cycle = await owner.getAttribute('cycle');
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('scrambleCharacters');
  await page.getByText('Typed animation options', { exact: true }).click();
  const field = page.getByRole('spinbutton', {
    name: 'scrambleCharacters.changesPerSecond',
    exact: true,
  });
  await field.fill('1.1');
  await field.press('Tab');
  await expect
    .poll(() =>
      owner.evaluate(
        (node) => Reflect.get(node, 'animations').idle.options.changesPerSecond,
      ),
    )
    .toBe(1.1);
  await page
    .getByRole('combobox', { name: 'Code integration', exact: true })
    .selectOption('native');
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  expect(
    await owner.evaluate((node) => node === Reflect.get(window, 'mdxOwner')),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(owner).toHaveAttribute('state', 'ready');
  await page.locator('#complete-example > summary').click();
  await expect(page.locator('#complete-example')).toContainText(
    'scrambleCharacters',
  );
  await expect(page.locator('#complete-example')).toContainText('1.1');
});

test('client navigation crosses MDX, existing references, homepage and playground without hydration errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => Reflect.set(window, 'mdxNavigation', 'retained'));
  await page
    .locator('#example')
    .getByRole('link', { name: 'Open in playground', exact: true })
    .click();
  await expect(page).toHaveURL(/\/playground$/);
  expect(await page.evaluate(() => Reflect.get(window, 'mdxNavigation'))).toBe(
    'retained',
  );
  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await page
    .locator('#boundaries')
    .getByRole('link', { name: 'component catalog', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/components$/);
  await page
    .locator('#nd-sidebar')
    .getByRole('link', { name: 'TextLoader', exact: true })
    .click();
  await expect(page.locator('main h1')).toHaveText('TextLoader');
  await expect(page.locator('dotquilt-region')).toHaveCount(0);
  await page
    .locator('#nd-sidebar')
    .getByRole('link', { name: 'ChartLoader', exact: true })
    .click();
  await expect(page.locator('main h1')).toHaveText('ChartLoader');
  await expect(page.locator('dotquilt-text-loader')).toHaveCount(0);
  await page.getByRole('link', { name: 'Dotquilt home', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
  await page
    .getByRole('link', { name: 'Try the playground', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/playground$/);
  expect(await page.evaluate(() => Reflect.get(window, 'mdxNavigation'))).toBe(
    'retained',
  );
  expect(errors).toEqual([]);
});
