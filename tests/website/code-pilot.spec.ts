import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { catalogDefaults, catalogQuery } from '../../apps/website/lib/catalog';
import { catalogExcerpt } from '../../apps/website/lib/catalog-files';
import { componentRecipe } from '../../apps/website/lib/gallery';

const route = '/docs/components/text-loader';
const source = (integration: 'react' | 'native') =>
  integration === 'react'
    ? readFileSync(
        new URL(
          `../../apps/website/content/examples/gallery/${componentRecipe('text-loader').id}.tsx`,
          import.meta.url,
        ),
        'utf8',
      )
    : catalogExcerpt({ ...catalogDefaults('text-loader'), integration });

test('server-highlighted excerpt and both integration controls preserve source and request ownership', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(route);
  const pilot = page.getByTestId('reference-code');
  await expect(pilot.locator('.code-comment').first()).toBeAttached();
  await expect(pilot.locator('pre')).toHaveText(source('react'));
  expect(await pilot.locator('pre [style], pre[style]').count()).toBe(0);
  const owner = page.locator('dotquilt-text-loader');
  await owner.evaluate((el) => {
    (window as unknown as { pilotOwner: Element }).pilotOwner = el;
  });
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  const cycle = await owner.getAttribute('cycle');
  await pilot
    .getByRole('tab', { name: 'Native Web Components', exact: true })
    .click();
  await expect(pilot.locator('pre')).toHaveText(source('native'));
  await expect(
    page.getByRole('combobox', { name: 'Code integration', exact: true }),
  ).toHaveValue('native');
  await expect(page).toHaveURL(/integration=native/);
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  await expect(owner).toHaveAttribute('state', 'pending');
  expect(
    await owner.evaluate(
      (el) => el === (window as unknown as { pilotOwner: Element }).pilotOwner,
    ),
  ).toBe(true);
  await page
    .getByRole('combobox', { name: 'Code integration', exact: true })
    .selectOption('react');
  await expect(
    pilot.getByRole('tab', { name: 'React', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  expect(errors).toEqual([]);
});

test('tabs support arrow, Home, End and visible keyboard focus without stealing content focus', async ({
  page,
}) => {
  await page.goto(route);
  const tabs = page.getByRole('tablist', { name: 'Code integration tabs' });
  const react = tabs.getByRole('tab', { name: 'React', exact: true });
  const native = tabs.getByRole('tab', {
    name: 'Native Web Components',
    exact: true,
  });
  await react.focus();
  await react.press('ArrowRight');
  await expect(native).toBeFocused();
  await expect(native).toHaveAttribute('aria-selected', 'true');
  expect(
    await native.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
  await native.press('Home');
  await expect(react).toBeFocused();
  await react.press('End');
  await expect(native).toBeFocused();
  const region = page.getByRole('region', {
    name: 'Native component code',
    exact: true,
  });
  await region.focus();
  await expect(region).toBeFocused();
  expect(await region.getAttribute('tabindex')).toBe('0');
});

test('code tabs preserve a paused pending cycle and do not cancel a captured handoff', async ({
  page,
}) => {
  await page.goto(`${route}?duration=900`);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  const owner = page.locator('dotquilt-text-loader');
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  const cycle = await owner.getAttribute('cycle');
  await page
    .getByRole('tab', { name: 'Native Web Components', exact: true })
    .click();
  await expect(owner).toHaveAttribute('motion', 'paused');
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  await expect(owner).toHaveAttribute('state', 'pending');
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  await page
    .getByRole('button', { name: 'Motion paused', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Handoff duration', exact: true })
    .selectOption('900');
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await owner.evaluate((el) => {
    const events: string[] = [];
    (window as unknown as { pilotEvents: string[] }).pilotEvents = events;
    for (const name of ['start', 'end', 'cancel'])
      el.addEventListener(`dotquilt-handoff-${name}`, () => events.push(name));
  });
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await page.getByRole('tab', { name: 'React', exact: true }).click();
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  expect(
    await page.evaluate(
      () => (window as unknown as { pilotEvents: string[] }).pilotEvents,
    ),
  ).toEqual(['start', 'end']);
});

for (const denied of [false, true])
  test(`copy uses original ${denied ? 'denied-access fallback' : 'source and confirmed success'} for each integration`, async ({
    page,
  }) => {
    await page.addInitScript((fail) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            if (fail) throw new Error('Denied by fixture');
            (window as unknown as { copiedPilotCode: string }).copiedPilotCode =
              text;
          },
        },
      });
    }, denied);
    await page.goto(route);
    for (const integration of ['react', 'native'] as const) {
      await page
        .getByRole('tab', {
          name: integration === 'react' ? 'React' : 'Native Web Components',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Copy code', exact: true })
        .click();
      if (denied) {
        await expect(
          page.getByRole('textbox', { name: 'Copy manually', exact: true }),
        ).toHaveValue(source(integration));
        await expect(page.locator('.feedback')).toContainText(
          'Clipboard unavailable',
        );
      } else {
        await expect(page.locator('.feedback')).toHaveText(
          'Component code copied.',
        );
        expect(
          await page.evaluate(
            () =>
              (window as unknown as { copiedPilotCode: string })
                .copiedPilotCode,
          ),
        ).toBe(source(integration));
      }
    }
  });

test('no JavaScript retains highlighted React, a native excerpt and every default complete file', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(route);
  await expect(
    page.getByRole('tab', { name: 'React', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByTestId('reference-code').locator('figure pre'),
  ).toHaveText(source('react'));
  await page
    .getByText('Native Web Components excerpt', { exact: true })
    .click();
  await expect(
    page.getByTestId('reference-code').locator('noscript pre'),
  ).toHaveText(source('native'));
  const nativeFallback = page
    .getByTestId('reference-code')
    .locator('.reference-code-fallback');
  await nativeFallback.focus();
  await expect(nativeFallback).toBeFocused();
  await page.locator('#complete-example > summary').click();
  expect(
    await page.locator('#complete-example details').count(),
  ).toBeGreaterThan(10);
  await page
    .locator('#complete-example details')
    .filter({ has: page.locator('summary', { hasText: /^package.json$/ }) })
    .locator('summary')
    .click();
  await expect(page.locator('#complete-example')).toContainText('0.0.0-m2.0');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeDisabled();
  await context.close();
});

test('failed required preview styles retain operable code tabs and complete native files', async ({
  page,
}) => {
  await page.route('**/dotquilt/text.css', (r) => r.abort());
  await page.goto(route);
  await expect(page.getByTestId('enhancement-status')).toContainText(
    'Preview styles could not load',
  );
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('tab', { name: 'Native Web Components', exact: true })
    .click();
  await expect(page.getByTestId('reference-code').locator('pre')).toHaveText(
    source('native'),
  );
  await page.locator('#complete-example > summary').click();
  await expect(page.locator('#complete-example')).toContainText(
    'registerTextLoader',
  );
  await expect(
    page.getByRole('link', { name: 'Reload this page' }),
  ).toHaveAttribute('href', /integration=native/);
  expect(await page.locator('dotquilt-text-loader').count()).toBe(0);
});

test('320px and forced colors keep local code overflow, selected tabs and controls usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(route);
  await page
    .getByRole('tab', { name: 'Native Web Components', exact: true })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const region = page.getByRole('region', {
    name: 'Native component code',
    exact: true,
  });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toBe(
    'auto',
  );
  expect(
    await page
      .getByRole('tab', { name: 'Native Web Components', exact: true })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByRole('button', { name: 'Copy code', exact: true }),
  ).toBeVisible();
});

test('reference code tabs leave playground and Quickstart on their existing code presentation', async ({
  page,
}) => {
  for (const path of ['/playground/components/text-loader', '/docs']) {
    await page.goto(path);
    expect(await page.getByTestId('reference-code').count()).toBe(0);
    expect(
      await page
        .getByRole('tablist', { name: 'Code integration tabs' })
        .count(),
    ).toBe(0);
  }
  await page.goto(
    `${route}?${catalogQuery({ ...catalogDefaults('text-loader'), integration: 'native' })}`,
  );
  await expect(
    page.getByRole('tab', { name: 'Native Web Components', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'ready',
  );
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Native Web Components', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'ready',
  );
});
