import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { catalogQuery } from '../../apps/website/lib/catalog';
import {
  galleryRecipes,
  gallerySettings,
} from '../../apps/website/lib/gallery';

const source = (id: string) =>
  readFileSync(
    new URL(
      `../../apps/website/content/examples/gallery/${id}.tsx`,
      import.meta.url,
    ),
    'utf8',
  );
for (const recipe of galleryRecipes) {
  test(`${recipe.id}: exact complete React source runs a real owned loading and reveal`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/docs/gallery/${recipe.id}?autoplay=true&state=pending`);
    const specimen = page.getByTestId('gallery-specimen');
    const start = specimen.getByRole('button', {
      name: 'Start loading',
      exact: true,
    });
    await expect(start).toBeEnabled();
    const owner = specimen.locator(
      recipe.component === 'text-loader'
        ? 'dotquilt-text-loader'
        : 'dotquilt-region',
    );
    await expect(owner).toHaveAttribute('state', 'ready');
    await expect(owner).toHaveAttribute('cycle', '0');
    await expect(page.locator('#code pre')).toHaveText(source(recipe.id));
    expect(
      await page.locator('#code pre[style], #code pre [style]').count(),
    ).toBe(0);
    await expect(
      page.getByRole('link', { name: 'Customize in playground', exact: true }),
    ).toHaveAttribute(
      'href',
      `/playground/components/${recipe.component}?${catalogQuery(gallerySettings(recipe))}`,
    );
    await owner.evaluate((node) => {
      Reflect.set(window, 'galleryOwner', node);
      const events: string[] = [];
      Reflect.set(window, 'galleryEvents', events);
      for (const phase of ['start', 'end', 'cancel'])
        node.addEventListener(`dotquilt-handoff-${phase}`, () =>
          events.push(phase),
        );
      const failures: unknown[] = [];
      Reflect.set(window, 'galleryFailures', failures);
      for (const host of document.querySelectorAll('*'))
        if (host.tagName.startsWith('DOTQUILT-'))
          host.addEventListener('dotquilt-error', (e) =>
            failures.push((e as CustomEvent).detail),
          );
    });
    await start.click();
    await expect(owner).toHaveAttribute('state', 'pending');
    const cycle = await owner.getAttribute('cycle');
    await specimen
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    expect(
      await owner.evaluate(
        (node) => node === Reflect.get(window, 'galleryOwner'),
      ),
    ).toBe(true);
    await expect(owner).toHaveAttribute('cycle', cycle ?? '');
    expect(
      await page.evaluate(() => Reflect.get(window, 'galleryEvents')),
    ).toEqual(['start', 'end']);
    expect(
      await page.evaluate(() => Reflect.get(window, 'galleryFailures')),
    ).toEqual([]);
    await specimen
      .getByRole('button', { name: 'Refresh content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'refreshing');
    await specimen
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    expect(errors).toEqual([]);
  });
}

for (const denied of [false, true])
  test(`gallery copy ${denied ? 'denial' : 'success'} retains the whole original React component`, async ({
    page,
  }) => {
    await page.addInitScript(
      (fail) =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              if (fail) throw new Error('Denied by fixture');
              Reflect.set(window, 'galleryCopied', text);
            },
          },
        }),
      denied,
    );
    await page.goto('/docs/gallery/table-type-on');
    await page
      .getByRole('button', { name: 'Copy component', exact: true })
      .click();
    if (denied)
      await expect(
        page.getByRole('textbox', { name: 'Copy manually', exact: true }),
      ).toHaveValue(source('table-type-on'));
    else {
      await expect(page.locator('#code .feedback')).toHaveText(
        'Complete React component copied.',
      );
      expect(
        await page.evaluate(() => Reflect.get(window, 'galleryCopied')),
      ).toBe(source('table-type-on'));
    }
  });

test('gallery stays useful with no JavaScript, with native recipe navigation and highlighted complete source', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    await page.goto('/docs/gallery');
    await expect(page.getByTestId('preview-fallback')).toBeVisible();
    await expect(page.locator('#code pre')).toHaveText(
      source('independent-characters'),
    );
    await expect(
      page.getByRole('button', { name: 'Copy component', exact: true }),
    ).toBeDisabled();
    await page
      .locator('#recipes details')
      .filter({ has: page.locator('summary', { hasText: /^Charts$/ }) })
      .locator('summary')
      .click();
    await page.getByRole('link', { name: /Chart scan/ }).click();
    await expect(page).toHaveURL(/\/docs\/gallery\/chart-scan$/);
    await expect(
      page.getByTestId('preview-fallback').locator('svg'),
    ).toBeVisible();
    await page
      .getByRole('region', {
        name: 'Complete React component code',
        exact: true,
      })
      .focus();
    await expect(
      page.getByRole('region', {
        name: 'Complete React component code',
        exact: true,
      }),
    ).toBeFocused();
  } finally {
    await context.close();
  }
});

test('failed gallery assets preserve content, code, recipe links and same-route recovery', async ({
  page,
}) => {
  await page.route('**/dotquilt/chart.css', (r) => r.abort());
  await page.goto('/docs/gallery/chart-scan');
  await expect(page.getByTestId('gallery-enhancement')).toContainText(
    'live preview is unavailable',
  );
  await expect(page.getByTestId('preview-fallback')).toBeVisible();
  expect(await page.locator('dotquilt-region').count()).toBe(0);
  await expect(page.locator('#code pre')).toHaveText(source('chart-scan'));
  await expect(
    page.getByRole('link', { name: 'Reload this example', exact: true }),
  ).toHaveAttribute('href', '/docs/gallery/chart-scan');
  expect(
    await page
      .getByRole('link', { name: 'Reload this example', exact: true })
      .evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toContain('underline');
  expect(await page.locator('#recipes a').count()).toBe(24);
});

test('recipe navigation clears old loading activity, starts still and keeps the private docs shell', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs/gallery/independent-characters');
  await page
    .getByTestId('gallery-specimen')
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await page
    .locator('#recipes details')
    .filter({ has: page.locator('summary', { hasText: /^Charts$/ }) })
    .locator('summary')
    .click();
  await page.getByRole('link', { name: /Chart scan/ }).click();
  await expect(page.locator('dotquilt-text-loader')).toHaveCount(0);
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
  await expect(page.locator('dotquilt-region')).toHaveAttribute('cycle', '0');
  await page
    .getByRole('link', { name: 'Customize in playground', exact: true })
    .click();
  await expect(page).toHaveURL(/\/playground\/components\/chart-loader\?/);
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
  await expect(
    page.getByRole('combobox', { name: 'Idle recipe', exact: true }),
  ).toHaveValue('scan');
  expect(errors).toEqual([]);
});

test('320px and visitor restrictions retain usable controls, local code scrolling and static-safe reveal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto('/docs/gallery/word-by-word');
  const specimen = page.getByTestId('gallery-specimen');
  await specimen
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'motion',
    'paused',
  );
  await specimen
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.emulateMedia({
    reducedMotion: 'no-preference',
    forcedColors: 'active',
  });
  await specimen
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'motion',
    'paused',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const viewport = page.getByRole('region', {
    name: 'Complete React component code',
    exact: true,
  });
  await viewport.focus();
  await expect(viewport).toBeFocused();
  expect(
    await viewport.evaluate(
      (node) =>
        node.scrollWidth > node.clientWidth &&
        getComputedStyle(node).overflowX === 'auto',
    ),
  ).toBe(true);
});

test('a failed post-bootstrap example chunk retains static content and source, then recovers by ordinary reload', async ({
  page,
}) => {
  const path = '/docs/gallery/independent-characters';
  const html = await (await page.request.get(path)).text();
  const initial = new Set(
    [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((match) => match[1]),
  );
  expect(initial.size).toBeGreaterThan(0);
  let blocked = 0;
  await page.route('**/*.js*', (route) => {
    const url = new URL(route.request().url());
    if (initial.has(url.pathname + url.search)) return route.continue();
    blocked++;
    return route.abort();
  });
  await page.goto(path);
  await expect(page.getByTestId('gallery-specimen')).toContainText(
    'interactive example could not load',
  );
  expect(blocked).toBeGreaterThan(0);
  await expect(page.getByTestId('gallery-enhancement')).toContainText(
    'This preview is static',
  );
  await expect(page.getByTestId('gallery-enhancement')).not.toContainText(
    'Start loading',
  );
  expect(
    await page
      .getByRole('link', { name: 'Reload this example', exact: true })
      .evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toContain('underline');
  await expect(page.getByTestId('preview-fallback')).toBeVisible();
  await expect(page.locator('#code pre')).toHaveText(
    source('independent-characters'),
  );
  await expect(
    page.getByRole('button', { name: 'Copy component', exact: true }),
  ).toBeEnabled();
  await page.unrouteAll();
  await page
    .getByRole('link', { name: 'Reload this example', exact: true })
    .click();
  await expect(
    page
      .getByTestId('gallery-specimen')
      .getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'ready',
  );
});
