import { expect, type Page, test } from '@playwright/test';

const pages = [
  '/',
  '/docs/',
  '/docs/installation/',
  '/docs/components/skeleton/',
];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

for (const path of pages)
  test(`${path} loads without errors and fits a phone`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 375, height: 812 });
    // Google Fonts are the one external request; tests stay offline.
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

test('the live preview hands over on Reveal and loads again on Start loading', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/docs/components/skeleton/');
  const preview = page.locator('[data-preview]').first();
  const status = preview.getByRole('status');
  const content = preview.getByText('Ada Lovelace');
  await expect(status).toHaveText('Loading');
  await expect(content).toBeHidden();
  await preview.getByRole('button', { name: 'Reveal' }).click();
  await expect(status).toHaveText('Ready');
  await expect(content).toBeVisible();
  await preview.getByRole('button', { name: 'Start loading' }).click();
  await expect(status).toHaveText('Loading');
  await expect(content).toBeHidden();
  expect(errors).toEqual([]);
});

test('the theme follows the system and the switch, with the spec colours', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/docs/');
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await background()).toBe('rgb(24, 29, 37)'); // #181D25
  await page
    .locator('starlight-theme-select select')
    .first()
    .selectOption('light');
  expect(await background()).toBe('rgb(244, 245, 247)'); // #F4F5F7
});
