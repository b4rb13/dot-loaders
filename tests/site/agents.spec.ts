import { expect, test } from '@playwright/test';

// Docs for AI assistants and agents: /llms.txt, each docs page as Markdown,
// /llms-full.txt, and a "Copy page" button on every docs page.

/** Lines outside code fences. */
function prose(markdown: string): string[] {
  let fenced = false;
  return markdown.split('\n').filter((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}

test('llms.txt links every docs page as clean Markdown', async ({
  request,
}) => {
  const index = await (await request.get('/llms.txt')).text();
  expect(index.startsWith('# Dotquilt\n')).toBe(true);
  const links = [
    ...index.matchAll(/\]\((https:\/\/dotquilt\.dev(\/[^)]+\.md))\)/g),
  ].map((match) => match[2] as string);
  // Introduction, installation and theming; six components; five guides.
  expect(links.length).toBe(14);
  for (const path of links) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const markdown = await response.text();
    expect(markdown.startsWith('# '), path).toBe(true);
    // Fences are balanced, and no MDX is left in the prose.
    expect((markdown.match(/^\s*```/gm)?.length ?? 0) % 2, path).toBe(0);
    const leftovers = prose(markdown).filter((line) =>
      /^\s*(import |export |<\/?(Preview|Tabs|TabItem|Code)\b)/.test(line),
    );
    expect(leftovers, path).toEqual([]);
  }
  // The code tabs carry the real example files.
  const table = await (
    await request.get('/docs/components/table-loader.md')
  ).text();
  expect(table).toContain('```tsx title="InvoiceTable.tsx"');
  expect(table).toContain('export function InvoiceTable()');
});

test('llms-full.txt holds every docs page', async ({ request }) => {
  const full = await (await request.get('/llms-full.txt')).text();
  for (const title of [
    '# Introduction',
    '# Installation',
    '# LoadingRegion',
    '# TableLoader',
    '# Server rendering',
  ])
    expect(full).toContain(`${title}\n`);
  expect(full.split('\n---\n').length).toBe(14);
});

test('Copy page copies the page as Markdown', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(baseURL ?? 'http://127.0.0.1:4331').origin,
  });
  await page.goto('/docs/components/skeleton/');
  // By attribute: its name changes to "Copied" once clicked.
  const button = page.locator('[data-copy-page]');
  await expect(button).toHaveAccessibleName('Copy page');
  await expect(button).toHaveAttribute('href', '/docs/components/skeleton.md');
  // Before its script runs, the link simply opens the Markdown.
  await expect(button).toHaveAttribute('data-copy-page', 'ready');
  await button.click();
  await expect(button).toHaveText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith('# Skeleton\n')).toBe(true);
  // Pages outside the docs have no button.
  await page.goto('/examples/');
  await expect(page.locator('[data-copy-page]')).toHaveCount(0);
});
