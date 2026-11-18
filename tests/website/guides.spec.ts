import { expect, test } from '@playwright/test';
import { integrationGuides } from '../../apps/website/lib/integration-guides';

for (const guide of integrationGuides) {
  const route = `/docs/guides/${guide.slug}`;
  test(`${guide.label}: MDX contents, complete source and navigation are coherent`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page).toHaveTitle(/Dotquilt/);
    await expect(page.locator('main h1')).toBeVisible();
    for (const example of guide.examples) {
      const files = page.locator(`#example-${example}`);
      await files.locator('> summary').click();
      await expect(
        files.getByText('package.json', { exact: true }),
      ).toBeVisible();
      await expect(files).toContainText('bun install --ignore-scripts');
      await expect(files).toContainText('style-src-attr');
      await expect(files).toContainText('"private": true');
    }
    const sections = await page
      .locator('main > section[id]')
      .evaluateAll((nodes) => nodes.map((n) => n.id));
    expect(new Set(sections).size).toBe(sections.length);
    for (const id of sections)
      await expect(page.locator(`#nd-toc a[href="#${id}"]`)).toHaveCount(1);
    await page
      .getByRole('link', { name: 'TableLoader', exact: true })
      .first()
      .click();
    await expect(page.locator('main h1')).toHaveText('TableLoader');
    expect(errors).toEqual([]);
  });
  test(`${guide.label}: static dark prose and all files work without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      ...(baseURL ? { baseURL } : {}),
    });
    try {
      const page = await context.newPage();
      await page.goto(route);
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(8, 8, 8)',
      );
      await expect(page.locator('main')).toContainText('private');
      await page
        .locator('.complete-example')
        .first()
        .locator('> summary')
        .click();
      const readme = page
        .locator('.complete-example')
        .first()
        .locator('details')
        .filter({ has: page.getByText('README.md', { exact: true }) });
      await readme.locator('> summary').click();
      await expect(readme.locator('pre')).toContainText('bun run build');
      await expect(page.locator('a[href="/playground"]').first()).toBeVisible();
    } finally {
      await context.close();
    }
  });
  test(`${guide.label}: 320px reading and complete source keep local keyboard scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page
      .getByRole('button', { name: 'Open Sidebar', exact: true })
      .click();
    await expect(
      page
        .locator('#nd-sidebar-mobile')
        .getByRole('link', { name: guide.label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await page
      .locator('.complete-example')
      .first()
      .locator('> summary')
      .click();
    const file = page
      .locator('.complete-example')
      .first()
      .locator('details')
      .filter({ has: page.getByText('package.json', { exact: true }) });
    await file.locator('> summary').click();
    await file.locator('pre').focus();
    await expect(file.locator('pre')).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
