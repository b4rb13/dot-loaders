import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// What agents and search engines read about the site: JSON-LD, the social
// card, the about, contact and privacy pages, and the home page as Markdown.
// (Markdown by content negotiation runs in Vercel's middleware; its tests
// are in scripts/site-markdown.test.ts.)

const version = (
  JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, '../../packages/core/package.json'),
      'utf8',
    ),
  ) as { version: string }
).version;

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('the home page describes Dotquilt in JSON-LD, with the version on npm', async ({
  page,
}) => {
  await page.goto('/');
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(blocks).toHaveLength(1);
  const data = JSON.parse(blocks[0] ?? '{}');
  expect(data).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Dotquilt',
    url: 'https://dotquilt.dev/',
    applicationCategory: 'DeveloperApplication',
    softwareVersion: version,
    offers: { '@type': 'Offer', price: '0' },
  });
  expect(data.sameAs).toContain('https://github.com/b4rb13/dot-loaders');
  // Docs pages carry none.
  await page.goto('/docs/');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0,
  );
});

test('every page has a social card image, and the home page is a website', async ({
  page,
  request,
}) => {
  const meta = (property: string) =>
    page.locator(`meta[property="${property}"]`).getAttribute('content');
  for (const path of ['/', '/docs/installation/', '/privacy/']) {
    await page.goto(path);
    expect(await meta('og:image'), path).toBe('https://dotquilt.dev/og.png');
    expect(await meta('og:image:width'), path).toBe('1200');
    expect(await meta('og:image:height'), path).toBe('630');
    expect(
      await page.locator('meta[name="twitter:image"]').getAttribute('content'),
    ).toBe('https://dotquilt.dev/og.png');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://dotquilt.dev${path}`,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
  await page.goto('/');
  expect(await meta('og:type')).toBe('website');
  const image = await request.get('/og.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('about, contact and privacy are real pages, linked from every footer', async ({
  page,
  request,
}) => {
  for (const [path, title] of [
    ['/about/', 'About Dotquilt'],
    ['/contact/', 'Contact'],
    ['/privacy/', 'Privacy'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    const text = await page.locator('.sl-markdown-content').innerText();
    expect(text.length, path).toBeGreaterThan(500);
    const markdown = await request.get(path.replace(/\/$/, '.md'));
    expect(markdown.ok(), path).toBe(true);
    expect((await markdown.text()).startsWith(`# ${title}\n`)).toBe(true);
  }
  await page.goto('/docs/');
  const footer = page.getByRole('navigation', { name: 'About this site' });
  for (const [name, href] of [
    ['About', '/about/'],
    ['Contact', '/contact/'],
    ['Privacy', '/privacy/'],
  ] as const)
    await expect(footer.getByRole('link', { name })).toHaveAttribute(
      'href',
      href,
    );
});

test('the home page has a Markdown copy written for agents', async ({
  request,
}) => {
  const response = await request.get('/index.md');
  expect(response.ok()).toBe(true);
  const home = await response.text();
  expect(home.startsWith('# Dotquilt\n')).toBe(true);
  for (const text of [
    'npm install dotquilt',
    'https://dotquilt.dev/setup-prompt.md',
    'https://dotquilt.dev/llms.txt',
    'https://github.com/b4rb13/dot-loaders',
  ])
    expect(home).toContain(text);
  // Interactive pages say where to open them.
  const playground = await (await request.get('/playground.md')).text();
  expect(playground).toContain(
    'This page is interactive. Open it in a browser: https://dotquilt.dev/playground/',
  );
});

test('llms.txt says when to use Dotquilt and how an agent should', async ({
  request,
}) => {
  const index = await (await request.get('/llms.txt')).text();
  expect(index).toContain('## When to use Dotquilt');
  expect(index).toContain('It is not for actions');
  expect(index).toContain('## How an agent should use it');
  for (const page of ['about', 'contact', 'privacy'])
    expect(index).toContain(`https://dotquilt.dev/${page}.md`);
});
