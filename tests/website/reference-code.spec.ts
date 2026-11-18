import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  catalog,
  catalogDefaults,
  catalogQuery,
} from '../../apps/website/lib/catalog';
import { asset, catalogExcerpt } from '../../apps/website/lib/catalog-files';
import { componentRecipe } from '../../apps/website/lib/gallery';

for (const item of catalog.filter((item) => item.slug !== 'text-loader')) {
  const route = `/docs/components/${item.slug}`;
  const source = (integration: 'react' | 'native') =>
    integration === 'react'
      ? readFileSync(
          new URL(
            `../../apps/website/content/examples/gallery/${componentRecipe(item.slug).id}.tsx`,
            import.meta.url,
          ),
          'utf8',
        )
      : catalogExcerpt({ ...catalogDefaults(item.slug), integration });

  test(`${item.name}: highlighted tabs retain source, live owner and loading cycle`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    const panel = page.getByTestId('reference-code');
    await expect(panel.locator('pre')).toHaveText(source('react'));
    await expect(panel.locator('.code-string').first()).toBeAttached();
    await expect(panel.locator('.code-keyword').first()).toBeAttached();
    expect(await panel.locator('pre[style], pre [style]').count()).toBe(0);
    const colors = await panel
      .locator('.code-keyword, .code-string, .code-comment')
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).color),
      );
    expect(new Set(colors).size).toBe(3);
    const owner = page.locator('dotquilt-region').first();
    await owner.evaluate((node) => Reflect.set(window, 'referenceOwner', node));
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    const cycle = await owner.getAttribute('cycle');
    await panel
      .getByRole('tab', { name: 'Native Web Components', exact: true })
      .click();
    await expect(panel.locator('pre')).toHaveText(source('native'));
    await expect(
      page.getByRole('combobox', { name: 'Code integration', exact: true }),
    ).toHaveValue('native');
    await expect(owner).toHaveAttribute('state', 'pending');
    await expect(owner).toHaveAttribute('cycle', cycle ?? '');
    expect(
      await owner.evaluate(
        (node) => node === Reflect.get(window, 'referenceOwner'),
      ),
    ).toBe(true);
    await page
      .getByRole('combobox', { name: 'Code integration', exact: true })
      .selectOption('react');
    await expect(
      panel.getByRole('tab', { name: 'React', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    expect(errors).toEqual([]);
  });

  for (const denied of [false, true])
    test(`${item.name}: copy ${denied ? 'denial' : 'success'} preserves original bytes in both integrations`, async ({
      page,
    }) => {
      await page.addInitScript((fail) => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              if (fail) throw new Error('Denied by fixture');
              Reflect.set(window, 'referenceCopy', text);
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
            await page.evaluate(() => Reflect.get(window, 'referenceCopy')),
          ).toBe(source(integration));
        }
      }
    });

  test(`${item.name}: static React and Native code remain highlighted and keyboard-scrollable`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      ...(baseURL ? { baseURL } : {}),
    });
    try {
      const page = await context.newPage();
      await page.goto(route);
      const panel = page.getByTestId('reference-code');
      await expect(panel.locator('figure pre')).toHaveText(source('react'));
      await expect(panel.locator('figure .code-string').first()).toBeAttached();
      await expect(
        panel.getByRole('tab', { name: 'React', exact: true }),
      ).toBeDisabled();
      await page
        .getByText('Native Web Components excerpt', { exact: true })
        .click();
      const fallback = panel.getByRole('region', {
        name: 'Native component code fallback',
        exact: true,
      });
      await expect(fallback.locator('pre')).toHaveText(source('native'));
      await expect(fallback.locator('.code-string').first()).toBeAttached();
      await fallback.focus();
      await expect(fallback).toBeFocused();
      await page.locator('#complete-example > summary').click();
      expect(
        await page.locator('#complete-example details').count(),
      ).toBeGreaterThan(10);
      await expect(
        page.getByRole('button', { name: 'Start loading', exact: true }),
      ).toBeDisabled();
    } finally {
      await context.close();
    }
  });

  test(`${item.name}: narrow keyboard tabs, forced colors, CSS recovery and Native share links`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.route(`**/dotquilt/${asset(item.slug)}.css`, (route) =>
      route.abort(),
    );
    await page.goto(route);
    await expect(page.getByTestId('enhancement-status')).toContainText(
      'Preview styles could not load',
    );
    const react = page.getByRole('tab', { name: 'React', exact: true });
    const native = page.getByRole('tab', {
      name: 'Native Web Components',
      exact: true,
    });
    await react.focus();
    await react.press('End');
    await expect(native).toBeFocused();
    await expect(native).toHaveAttribute('aria-selected', 'true');
    await native.press('Home');
    await expect(react).toBeFocused();
    await react.press('ArrowRight');
    await expect(native).toBeFocused();
    expect(
      await native.evaluate((node) => getComputedStyle(node).outlineStyle),
    ).not.toBe('none');
    expect(
      await native.evaluate((node) => node.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    const viewport = page.getByRole('region', {
      name: 'Native component code',
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
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await expect(
      page.getByRole('link', { name: 'Reload this page', exact: true }),
    ).toHaveAttribute('href', /integration=native/);
    await page.unrouteAll();
    await page.goto(
      `${route}?${catalogQuery({ ...catalogDefaults(item.slug), integration: 'native' })}`,
    );
    await expect(native).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
      'state',
      'ready',
    );
    await page.reload();
    await expect(native).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
      'state',
      'ready',
    );
  });
}
