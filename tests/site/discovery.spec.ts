import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

// What search engines, social platforms and agents read about the site:
// titles, JSON-LD, each page's social card, the 404 page, the about, contact
// and privacy pages, and the Markdown copies. (Markdown by content
// negotiation runs in Vercel's middleware; its tests are in
// scripts/site-markdown.test.ts.)

const version = (
  JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, '../../packages/core/package.json'),
      'utf8',
    ),
  ) as { version: string }
).version;

const jsonLd = async (page: Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map((text) => JSON.parse(text) as { '@graph': Record<string, unknown>[] })
    .flatMap((block) => block['@graph']);

test('the home page describes the site and Dotquilt in JSON-LD, with the version on npm', async ({
  page,
}) => {
  await page.goto('/');
  const nodes = await jsonLd(page);
  expect(nodes.map((node) => node['@type'])).toEqual([
    'WebSite',
    'SoftwareApplication',
    'SoftwareSourceCode',
  ]);
  expect(nodes[1]).toMatchObject({
    name: 'Dotquilt',
    url: 'https://dotquilt.dev/',
    applicationCategory: 'DeveloperApplication',
    softwareVersion: version,
    offers: { '@type': 'Offer', price: '0' },
  });
  expect(nodes[1]?.sameAs).toContain('https://github.com/b4rb13/dot-loaders');
  expect(nodes[2]).toMatchObject({
    codeRepository: 'https://github.com/b4rb13/dot-loaders',
    targetProduct: { '@id': 'https://dotquilt.dev/#software' },
  });
  // Nothing made up: no ratings, reviews or contact details.
  const text = JSON.stringify(nodes);
  for (const key of ['aggregateRating', 'review', 'contactPoint', 'address'])
    expect(text).not.toContain(key);
});

test('docs pages carry breadcrumbs and a TechArticle', async ({ page }) => {
  await page.goto('/docs/components/skeleton/');
  const [crumbs, article] = await jsonLd(page);
  expect(crumbs).toMatchObject({
    '@type': 'BreadcrumbList',
    itemListElement: [
      { position: 1, name: 'Home', item: 'https://dotquilt.dev/' },
      { position: 2, name: 'Docs', item: 'https://dotquilt.dev/docs/' },
      { position: 3, name: 'Skeleton' },
    ],
  });
  expect(article).toMatchObject({
    '@type': 'TechArticle',
    headline: 'Skeleton',
    url: 'https://dotquilt.dev/docs/components/skeleton/',
  });
  expect(article?.description).toContain('Skeleton loaders');
});

test('titles name what people search for, while headings stay short', async ({
  page,
}) => {
  for (const [path, title, heading] of [
    [
      '/',
      'Skeleton loaders for React, Vue, Svelte and Angular | Dotquilt',
      'Loading states that hand over.',
    ],
    [
      '/docs/components/skeleton/',
      'Skeleton loader for text, images and avatars | Dotquilt',
      'Skeleton',
    ],
    [
      '/docs/components/chart-loader/',
      'ChartLoader: line, bar and scatter chart skeleton | Dotquilt',
      'ChartLoader',
    ],
    [
      '/docs/components/typing-dots/',
      'TypingDots: typing indicator for chat replies | Dotquilt',
      'TypingDots',
    ],
    [
      '/docs/guides/skeleton-or-spinner/',
      'Skeleton screen vs spinner: when to use each | Dotquilt',
      'Skeleton loader or spinner?',
    ],
    [
      '/docs/api/',
      'Dotquilt API reference: elements, attributes, events and CSS properties | Dotquilt',
      'Dotquilt API reference',
    ],
    [
      '/docs/changelog/',
      'Dotquilt changelog: every release and what changed | Dotquilt',
      'Changelog',
    ],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    expect(await page.locator('title').count(), path).toBe(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description?.length, path).toBeGreaterThan(90);
  }
});

test('every page has its own social card, with its size, type and alt text', async ({
  page,
  request,
}) => {
  const meta = (selector: string) =>
    page.locator(`meta[${selector}]`).getAttribute('content');
  for (const [path, card, alt] of [
    ['/', '/og/index.png', 'Dotquilt: Loading states that hand over.'],
    [
      '/docs/installation/',
      '/og/docs/installation.png',
      'Dotquilt · Docs: Installation',
    ],
    [
      '/docs/components/table-loader/',
      '/og/docs/components/table-loader.png',
      'Dotquilt · Components: TableLoader',
    ],
    ['/privacy/', '/og/privacy.png', 'Dotquilt: Privacy'],
  ] as const) {
    await page.goto(path);
    const image = await meta('property="og:image"');
    expect(image, path).toMatch(
      new RegExp(`^https://dotquilt\\.dev${card}\\?v=[0-9a-f]{10}$`),
    );
    expect(await meta('property="og:image:secure_url"')).toBe(image);
    expect(await meta('name="twitter:image"')).toBe(image);
    expect(await meta('property="og:image:type"')).toBe('image/png');
    expect(await meta('property="og:image:width"')).toBe('1200');
    expect(await meta('property="og:image:height"')).toBe('630');
    expect(await meta('property="og:image:alt"')).toBe(alt);
    expect(await meta('name="twitter:image:alt"')).toBe(alt);
    expect(await meta('name="twitter:card"')).toBe('summary_large_image');
    // A complete Twitter card, ahead of the Open Graph tags: Slack uses
    // whichever set comes first, and shows a summary_large_image card large.
    expect(await meta('name="twitter:title"')).toBe(
      await meta('property="og:title"'),
    );
    expect(await meta('name="twitter:description"')).toBe(
      await meta('property="og:description"'),
    );
    const social = await page
      .locator('head meta[name^="twitter:"], head meta[property^="og:"]')
      .evaluateAll((tags) =>
        tags.map(
          (tag) => tag.getAttribute('name') ?? tag.getAttribute('property'),
        ),
      );
    expect(social.slice(0, 5), path).toEqual([
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
      'twitter:image:alt',
    ]);
    expect(social.filter((name) => name?.startsWith('twitter:'))).toHaveLength(
      5,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://dotquilt.dev${path}`,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // The card itself: a 1200×630 PNG, small enough for WhatsApp's previews.
    const response = await request.get(card);
    expect(response.ok(), card).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(png.length, card).toBeLessThan(300_000);
  }
  await page.goto('/');
  expect(await meta('property="og:type"')).toBe('website');
  // The fixed address of the home card, named in the JSON-LD, still works.
  const fixed = await request.get('/og.png');
  expect(fixed.ok()).toBe(true);
  expect(fixed.headers()['content-type']).toContain('image/png');
});

test('the icon comes as SVG, ICO and PNG, for apps that cannot show an SVG', async ({
  page,
  request,
}) => {
  await page.goto('/docs/');
  const links = await page
    .locator('head link[rel~="icon"], head link[rel="apple-touch-icon"]')
    .evaluateAll((tags) =>
      tags.map(
        (tag) => `${tag.getAttribute('rel')} ${tag.getAttribute('href')}`,
      ),
    );
  expect(links).toEqual(
    expect.arrayContaining([
      'shortcut icon /favicon.svg',
      'icon /favicon.ico',
      'apple-touch-icon /apple-touch-icon.png',
    ]),
  );

  // A .ico with the icon at 16, 32 and 48 pixels, each stored as a PNG.
  const ico = await request.get('/favicon.ico');
  expect(ico.ok()).toBe(true);
  const body = await ico.body();
  expect([body.readUInt16LE(0), body.readUInt16LE(2)]).toEqual([0, 1]);
  const count = body.readUInt16LE(4);
  const images = Array.from({ length: count }, (_, index) => {
    const at = 6 + 16 * index;
    const offset = body.readUInt32LE(at + 12);
    const png = body.subarray(offset, offset + body.readUInt32LE(at + 8));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
      body[at],
      body[at + 1],
    ]);
    return body[at];
  });
  expect(images).toEqual([16, 32, 48]);

  // The iOS icon: 180 pixels square, with opaque corners, since iOS shows
  // transparent ones as black.
  const touch = await request.get('/apple-touch-icon.png');
  expect(touch.ok()).toBe(true);
  expect(touch.headers()['content-type']).toContain('image/png');
  const png = await touch.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  const corner = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/apple-touch-icon.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context?.drawImage(image, 0, 0);
    return context?.getImageData(0, 0, 1, 1).data[3];
  });
  expect(corner).toBe(255);
});

test('the 404 page says what happened, and asks not to be indexed', async ({
  page,
}) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page not found',
  );
  await expect(page).toHaveTitle('Page not found | Dotquilt');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  await expect(
    page
      .locator('.sl-markdown-content')
      .getByRole('link', { name: 'Installation' }),
  ).toHaveAttribute('href', '/docs/installation/');
});

test('every page links to its Markdown copy', async ({ page, request }) => {
  for (const [path, markdown] of [
    ['/', '/index.md'],
    ['/docs/', '/docs.md'],
    ['/docs/guides/react/', '/docs/guides/react.md'],
  ] as const) {
    await page.goto(path);
    await expect(
      page.locator('link[rel="alternate"][type="text/markdown"]'),
    ).toHaveAttribute('href', `https://dotquilt.dev${markdown}`);
    expect((await request.get(markdown)).ok(), markdown).toBe(true);
  }
});

test('pages load everything from the site itself, fonts included', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4331').origin;
  const elsewhere: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('data:') && new URL(url).origin !== origin)
      elsewhere.push(url);
  });
  for (const path of ['/', '/docs/components/skeleton/']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return ['Manrope', 'DM Mono'].map((family) =>
        [...document.fonts].some(
          (face) =>
            face.family.replace(/"/g, '') === family &&
            face.status === 'loaded',
        ),
      );
    });
    expect(loaded, path).toEqual([true, true]);
  }
  expect(elsewhere).toEqual([]);
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
  // The 404 page has none.
  expect((await request.get('/404.md')).status()).toBe(404);
});

test('llms.txt follows llmstxt.org: guidance before the sections, links in them', async ({
  request,
}) => {
  const index = await (await request.get('/llms.txt')).text();
  const [intro = '', ...sections] = index.split(/^## /m);
  expect(intro).toContain('**When to use Dotquilt.**');
  expect(intro).toContain('It is not for actions');
  expect(intro).toContain('**How an agent should use it:**');
  // Every section is a list of links.
  for (const section of sections) {
    const [name, ...lines] = section.trim().split('\n');
    for (const line of lines.filter(Boolean))
      expect(line, name).toMatch(/^- \[[^\]]+\]\(https:\/\/dotquilt\.dev\//);
  }
  expect(sections[0]?.startsWith('Start here\n')).toBe(true);
  expect(index).toContain(
    '- [Setup prompt](https://dotquilt.dev/setup-prompt.md)',
  );
  expect(index).toContain(
    'https://dotquilt.dev/docs/guides/skeleton-or-spinner.md',
  );
  for (const page of ['about', 'contact', 'privacy'])
    expect(index).toContain(`https://dotquilt.dev/${page}.md`);
});

test('robots.txt lets every crawler in and names the sitemap', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/plain');
  const robots = await response.text();
  expect(robots).toContain('User-agent: *\nAllow: /\n');
  expect(robots).not.toContain('Disallow');
  expect(robots).toContain('Sitemap: https://dotquilt.dev/sitemap-index.xml');
  // People and tools often try /sitemap.xml; Vercel sends it on.
  const vercel = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, '../../apps/site/vercel.json'),
      'utf8',
    ),
  ) as { redirects?: { source: string; destination: string }[] };
  expect(vercel.redirects).toContainEqual(
    expect.objectContaining({
      source: '/sitemap.xml',
      destination: '/sitemap-index.xml',
      permanent: true,
    }),
  );
  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.ok()).toBe(true);
  const urls = await sitemap.text();
  expect(urls).toContain(
    '<loc>https://dotquilt.dev/docs/guides/skeleton-or-spinner/</loc>',
  );
  expect(urls).not.toContain('404');
});
