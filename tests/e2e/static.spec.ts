import { expect, test } from '@playwright/test';

// Server-rendered regions without JavaScript. A pending region shows its
// static placeholder, and its server content stays visible and usable: if
// the runtime never loads, the page must still work. Whether pending content
// should instead be hidden until the runtime takes over is an open owner
// decision (AUDIT.md, decision 11).
test.use({ javaScriptEnabled: false });

for (const renderer of ['native', 'react'] as const) {
  test(`${renderer} SSR: pending shows the placeholder and keeps content usable without JavaScript`, async ({
    page,
  }) => {
    await page.goto(`/static/${renderer}?state=pending`);
    await expect(page.locator('dotquilt-skeleton-text')).toBeVisible();
    const action = page.getByRole('button', { name: 'Open report' });
    await expect(action).toBeVisible();
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');
    await expect(action).toBeFocused();
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
