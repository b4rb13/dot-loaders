import { renderStatic } from '@dotquilt-internal/core/server';
import { expect, test } from '@playwright/test';

// Server-rendered regions without JavaScript. A pending region shows its
// static placeholder, and its server content stays visible and usable: if
// the runtime never loads, the page must still work (AUDIT.md decision 11:
// keep it visible; apps that prefer hiding add hidden/inert themselves).
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

for (const mark of ['dot', 'square'] as const)
  test(`a server-rendered pending TextLoader shows its marks before JavaScript (${mark})`, async ({
    page,
  }) => {
    const html = renderStatic({
      kind: 'text-loader',
      text: 'Revenue up 12%',
      state: 'pending',
      ...(mark === 'square' && { mark }),
    });
    await page.setContent(
      `<!doctype html><body style="font:32px sans-serif">${html}</body>`,
    );
    const placeholder = page.locator('[slot=placeholder]');
    await expect(placeholder).toBeVisible();
    // The marks used to take the text's colour, which the placeholder sets
    // to transparent, so nothing showed.
    const alpha = await placeholder.evaluate((surface) => {
      const style = getComputedStyle(surface);
      const source =
        style.backgroundImage !== 'none'
          ? style.backgroundImage
          : style.backgroundColor;
      const color = /rgba?\(([^)]+)\)/.exec(source)?.[1]?.split(',') ?? [];
      return color.length === 4 ? Number(color[3]) : color.length === 3 ? 1 : 0;
    });
    expect(alpha).toBeGreaterThan(0);
  });
