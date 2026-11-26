import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { parseChangelog } from '../../scripts/changelog';

// The changelog (/docs/changelog/) is generated from the packages'
// CHANGELOG.md files (apps/site/src/lib/changelog.ts), which
// `bun run release:version` dates (scripts/changelog.ts).

const root = resolve(import.meta.dirname, '../..');
const releases = parseChangelog(
  readFileSync(resolve(root, 'packages/core/CHANGELOG.md'), 'utf8'),
);

const longDate = (date: string | undefined) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

test('the changelog lists every release, newest first, with its date', async ({
  page,
}) => {
  await page.goto('/docs/changelog/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Changelog');
  // Each release's heading, and the line under it.
  const shown = await page
    .locator('.sl-markdown-content h2')
    .evaluateAll((headings) =>
      headings.map((heading) => {
        const block = heading.parentElement?.matches('.sl-heading-wrapper')
          ? heading.parentElement
          : heading;
        return [
          heading.textContent?.trim(),
          block.nextElementSibling?.textContent?.trim(),
        ];
      }),
    );
  expect(releases.length).toBeGreaterThan(4);
  expect(shown).toEqual(
    releases.map((release) => [
      release.version,
      `Released ${longDate(release.date)}.`,
    ]),
  );
  // The sidebar lists it, under Reference.
  await expect(
    page.locator('nav.sidebar a[href="/docs/changelog/"][aria-current="page"]'),
  ).toHaveCount(1);
});

test('each change is listed once, without commit hashes or dependency bumps', async ({
  page,
}) => {
  await page.goto('/docs/changelog/');
  const text = (await page.locator('.sl-markdown-content').textContent()) ?? '';
  expect(text).not.toContain('Updated dependencies');
  expect(text).not.toMatch(/\b[0-9a-f]{7}:/);
  // The Vue package's changeset touched dotquilt too, so it is in both
  // changelogs: here it is listed once, under both names.
  expect(text.split('New package: @dotquilt/vue').length - 1).toBe(1);
  await expect(
    page.getByRole('heading', { level: 3, name: 'dotquilt and @dotquilt/vue' }),
  ).toHaveCount(1);
  // Packages with nothing of their own in a release still say so.
  expect(text).toContain(
    '@dotquilt/vue, @dotquilt/svelte and @dotquilt/angular have no changes of their own in this release',
  );
});

test('the changelog is linked from the footer, llms.txt and its Markdown copy', async ({
  page,
  request,
}) => {
  await page.goto('/docs/');
  await expect(
    page.locator('footer').getByRole('link', { name: 'Changelog' }),
  ).toHaveAttribute('href', '/docs/changelog/');

  const index = await (await request.get('/llms.txt')).text();
  expect(index).toContain(
    '- [Changelog](https://dotquilt.dev/docs/changelog.md)',
  );
  const markdown = await (await request.get('/docs/changelog.md')).text();
  const [latest] = releases;
  expect(markdown).toContain(
    `## ${latest?.version}\n\nReleased ${longDate(latest?.date)}.`,
  );

  // /changelog is a shortcut to the page (vercel.json).
  const vercel = JSON.parse(
    readFileSync(resolve(root, 'apps/site/vercel.json'), 'utf8'),
  ) as { redirects?: { source: string; destination: string }[] };
  for (const source of ['/changelog', '/changelog/'])
    expect(vercel.redirects).toContainEqual(
      expect.objectContaining({ source, destination: '/docs/changelog/' }),
    );
});
