import { expect, test } from '@playwright/test';

// Server-rendered pending regions must not expose their content before (or
// without) JavaScript: the placeholder shows, the content is invisible,
// unfocusable and absent from the accessibility tree.
test.use({ javaScriptEnabled: false });

for (const renderer of ['native', 'react'] as const) {
  test(`${renderer} SSR: pending content stays hidden and out of tab order without JavaScript`, async ({
    page,
  }) => {
    await page.goto(`/static/${renderer}?state=pending`);
    await expect(page.locator('dotquilt-skeleton-text')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open report' }),
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'Quarterly revenue' }),
    ).toBeHidden();
    // Tab goes from the button before the region straight to the one after it.
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'After' })).toBeFocused();
  });

  test(`${renderer} SSR: ready content is visible and usable without JavaScript`, async ({
    page,
  }) => {
    await page.goto(`/static/${renderer}?state=ready`);
    await expect(
      page.getByRole('button', { name: 'Open report' }),
    ).toBeVisible();
    await expect(page.locator('dotquilt-skeleton-text')).toBeHidden();
  });
}
