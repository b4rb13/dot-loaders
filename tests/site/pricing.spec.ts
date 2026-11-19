import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('pricing shows the free library and Pro as coming later, with no price', async ({
  page,
}) => {
  await page.goto('/pricing/');
  await expect(
    page.getByRole('link', { name: 'Pricing', exact: true }).first(),
  ).toHaveAttribute('aria-current', 'page');
  const free = page.getByRole('article', { name: 'Dotquilt', exact: true });
  await expect(free).toContainText('$0');
  await expect(free).toContainText('All nine components');
  const pro = page.getByRole('article', { name: /Dotquilt Pro/ });
  await expect(pro).toContainText('Coming later');
  await expect(pro).toContainText('One-time purchase');
  // Nothing is for sale yet: no price and no checkout.
  await expect(pro).not.toContainText('$');
  await expect(pro.getByRole('link')).toHaveText([
    'Start with the free library',
  ]);
});

test('the header row of marks stays inside the header', async ({ page }) => {
  await page.goto('/pricing/');
  const box = await page.evaluate(() => {
    const header = document
      .querySelector('header.header')
      ?.getBoundingClientRect();
    const seam = document
      .querySelector('.site-header .seam')
      ?.getBoundingClientRect();
    return { header: header?.bottom ?? 0, seam: seam?.bottom ?? 1e9 };
  });
  expect(box.seam).toBeLessThanOrEqual(box.header + 0.5);
});
