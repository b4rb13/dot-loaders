import { expect, test } from '@playwright/test';

const wordmark = '[data-wordmark]';

test('a first visit plays the wordmark arrival once; later pages are at rest', async ({
  page,
}) => {
  await page.goto('/docs/');
  const mark = page.locator(wordmark);
  // It shimmers in marks, then takes the shape of the name and hands over.
  await expect(mark).toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'system',
  );
  await expect(mark).not.toHaveAttribute('state', 'pending', { timeout: 3000 });
  expect(await mark.evaluate((element) => element.textContent)).toBe(
    'dotquilt',
  );

  await page.goto('/docs/components/skeleton/');
  await expect(page.locator(wordmark)).not.toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'paused',
  );
});

test('on the home page the header rests, and the visit counts as arrived', async ({
  page,
}) => {
  // The first screen is the home page's one focal motion.
  await page.goto('/');
  await expect(page.locator(wordmark)).not.toHaveAttribute('state', 'pending');
  await expect(page.locator('.site-header .seam')).toHaveAttribute(
    'motion',
    'paused',
  );
  await page.goto('/docs/');
  await expect(page.locator(wordmark)).not.toHaveAttribute('state', 'pending');
});

test('with reduced motion the header arrives at rest', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/');
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

test('the header and footer link to the repository on GitHub', async ({
  page,
}) => {
  await page.goto('/docs/');
  const github = page.locator('.site-header [data-github]');
  await expect(github).toHaveAttribute(
    'href',
    'https://github.com/b4rb13/dot-loaders',
  );
  // The star count is read at build time; without it, the link still names
  // GitHub.
  await expect(github).toHaveAccessibleName(/^GitHub( [\d.]+k? stars?)?$/);
  await expect(
    page.locator('.site-footer').getByRole('link', { name: 'GitHub' }),
  ).toHaveAttribute('href', 'https://github.com/b4rb13/dot-loaders');
  // On a phone the mark and the count stay in the header.
  await page.setViewportSize({ width: 375, height: 700 });
  await expect(github).toBeVisible();
});

test('every page loads Vercel Web Analytics from the site itself', async ({
  page,
}) => {
  for (const path of ['/', '/docs/']) {
    const script = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/_vercel/insights/script.js',
    );
    await page.goto(path);
    await script;
  }
});
