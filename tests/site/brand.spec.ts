import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

const wordmark = '[data-wordmark]';

test('a first visit plays the wordmark arrival once; later pages are at rest', async ({
  page,
}) => {
  await page.goto('/');
  const mark = page.locator(wordmark);
  // It shimmers in marks, then locks into the name.
  await expect(mark).toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'system',
  );
  await expect(mark).not.toHaveAttribute('state', 'pending', { timeout: 3000 });
  expect(await mark.evaluate((element) => element.textContent)).toBe(
    'dotquilt',
  );

  await page.goto('/docs/');
  await expect(page.locator(wordmark)).not.toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'paused',
  );
});

test('with reduced motion the header arrives at rest', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator(wordmark)).not.toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'paused',
  );
});

test('the header marks the current section and links home', async ({
  page,
}) => {
  await page.goto('/docs/components/table-loader/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Components' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link', { name: 'Docs' })).not.toHaveAttribute(
    'aria-current',
  );
  await page.getByRole('link', { name: 'Dotquilt, home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('the footer links to the docs and the license', async ({ page }) => {
  await page.goto('/docs/');
  const footer = page.locator('.site-footer');
  await expect(
    footer.getByRole('link', { name: 'React and Next.js' }),
  ).toHaveAttribute('href', '/docs/guides/react/');
  await footer.getByRole('link', { name: 'MIT License' }).click();
  await expect(
    page.getByRole('heading', { name: 'MIT License' }),
  ).toBeVisible();
  await expect(page.getByText('Permission is hereby granted')).toBeVisible();
});
