import { expect, test } from '@playwright/test';
import { catalog } from '../../apps/website/lib/catalog';

for (const item of catalog)
  test(`${item.name}: preview clicks stay quiet and keyboard restores its visible focus ring`, async ({
    page,
  }) => {
    await page.goto(`/playground/components/${item.slug}`);
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeEnabled();
    const owner = page
      .locator(
        item.family === 'text' ? 'dotquilt-text-loader' : 'dotquilt-region',
      )
      .first();
    await owner.click({ position: { x: 5, y: 5 } });
    await expect(owner).not.toBeFocused();
    await expect(owner).toHaveCSS('outline-style', 'none');
    await expect(owner).not.toHaveAttribute('tabindex', /.*/);
    await owner.evaluate((element) => {
      element.tabIndex = 0;
    });
    await owner.press('ArrowRight');
    await expect(owner).toBeFocused();
    await expect(owner).toHaveCSS('outline-style', 'solid');
    await expect(owner).toHaveCSS('outline-width', '2px');
    await owner.click({ position: { x: 5, y: 5 } });
    await expect(owner).toBeFocused();
    await expect(owner).toHaveCSS('outline-style', 'none');
  });

test('the original playground wrapper also keeps click and keyboard focus distinct', async ({
  page,
}) => {
  await page.goto('/playground');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  const owner = page.locator('dotquilt-region').first();
  await owner.click({ position: { x: 5, y: 5 } });
  await expect(owner).not.toBeFocused();
  await expect(owner).toHaveCSS('outline-style', 'none');
  await expect(owner).not.toHaveAttribute('tabindex', /.*/);
  await owner.evaluate((element) => {
    element.tabIndex = 0;
  });
  await owner.press('ArrowRight');
  await expect(owner).toBeFocused();
  await expect(owner).toHaveCSS('outline-style', 'solid');
});
