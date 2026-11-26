import { type BrowserContext, expect, test } from '@playwright/test';

// Docs for AI assistants and agents: /llms.txt, each docs page as Markdown,
// /llms-full.txt, a "Copy page" button on every docs page, and the setup
// prompt for coding assistants.

/**
 * Lets the page's copy be read back from the clipboard. Each engine names
 * what it needs: Firefox needs nothing (and knows neither name), WebKit
 * knows only `clipboard-read`.
 */
async function allowClipboard(
  context: BrowserContext,
  browserName: string,
  baseURL: string | undefined,
) {
  const permissions =
    browserName === 'chromium'
      ? ['clipboard-read', 'clipboard-write']
      : browserName === 'webkit'
        ? ['clipboard-read']
        : [];
  if (permissions.length)
    await context.grantPermissions(permissions, {
      origin: new URL(baseURL ?? 'http://127.0.0.1:4331').origin,
    });
}

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
  // The setup prompt; introduction, installation, AI assistant setup,
  // theming, and stability and support; six components; nine guides (four of
  // them frameworks); about, contact and privacy.
  expect(links.length).toBe(24);
  for (const path of links) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const markdown = await response.text();
    expect(markdown.startsWith('# '), path).toBe(true);
    // Fences are balanced, and no MDX is left in the prose.
    expect((markdown.match(/^\s*```/gm)?.length ?? 0) % 2, path).toBe(0);
    const leftovers = prose(markdown).filter((line) =>
      /^\s*(import |export |<\/?(Preview|Tabs|TabItem|Code|style|div)\b)/.test(
        line,
      ),
    );
    expect(leftovers, path).toEqual([]);
  }
  // The code tabs carry the real example files.
  const table = await (
    await request.get('/docs/components/table-loader.md')
  ).text();
  expect(table).toContain('```tsx title="InvoiceTable.tsx"');
  expect(table).toContain('export function InvoiceTable()');
  // The framework tabs come from the example apps, which build and run them.
  expect(table).toContain('```vue title="InvoiceTable.vue"');
  expect(table).toContain('```svelte title="InvoiceTable.svelte"');
  expect(table).toContain('```ts title="invoice-table.ts"');
  expect(table).toContain('export class InvoiceTable');
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
  // Five getting-started pages, six components and nine guides.
  expect(full.split('\n---\n').length).toBe(20);
});

test('Copy page copies the page as Markdown', async ({
  page,
  context,
  baseURL,
  browserName,
}) => {
  await allowClipboard(context, browserName, baseURL);
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

test('the setup prompt is served as Markdown, linked for agents, and copied in one click', async ({
  page,
  context,
  request,
  baseURL,
  browserName,
}) => {
  const response = await request.get('/setup-prompt.md');
  expect(response.ok()).toBe(true);
  const prompt = (await response.text()).trim();
  // It analyses first and waits for answers before changing anything.
  expect(
    prompt.startsWith('# Add Dotquilt loading states to this project'),
  ).toBe(true);
  for (const phase of [
    '## Phase 1: Learn Dotquilt',
    '## Phase 2: Analyse the project, then ask',
    '## Phase 3: Implement, in this order',
    '## Phase 4: Verify, then report',
  ])
    expect(prompt).toContain(phase);
  expect(prompt).toContain('Stop here and wait for the answers.');
  // The index points agents to it, and says how to install.
  const index = await (await request.get('/llms.txt')).text();
  expect(index).toContain('https://dotquilt.dev/setup-prompt.md');
  expect(index).toContain('npm install dotquilt');
  expect(index).not.toContain('not yet on npm');

  await allowClipboard(context, browserName, baseURL);
  for (const path of ['/docs/ai-setup/', '/']) {
    await page.goto(path);
    // By attribute: its name changes to "Copied" once clicked.
    const button = page.locator('[data-copy-prompt] [data-copy]');
    await expect(button).toHaveAccessibleName('Copy setup prompt');
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(
      page.getByRole('status').filter({ hasText: 'copied' }),
    ).toHaveText('Setup prompt copied. Paste it into your coding assistant.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.trim(), path).toBe(prompt);
  }
  // The home page also links to what it does.
  await expect(
    page.getByRole('link', { name: 'What it does' }),
  ).toHaveAttribute('href', '/docs/ai-setup/');
});
