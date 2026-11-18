import { expect, test } from '@playwright/test';
import { catalog } from '../../apps/website/lib/catalog';

function contrast(a: string, b: string) {
  function luminance(color: string) {
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3)
      throw new Error(`Unexpected color: ${color}`);
    return channels.slice(0, 3).reduce((sum, value, i) => {
      const c = value / 255;
      return (
        sum +
        (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
          ([0.2126, 0.7152, 0.0722][i] ?? 0)
      );
    }, 0);
  }
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('docs and playground are dark in static HTML even when the OS prefers light', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: 'light',
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    for (const route of [
      '/docs',
      '/docs/components',
      '/docs/components/table-loader',
      '/playground',
      '/playground/components/text-loader',
    ]) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(8, 8, 8)',
      );
      await expect(page.locator('main h1')).toBeVisible();
      const specimen = page.locator('.preview, .catalog-preview').first();
      if (await specimen.count())
        await expect(specimen).toHaveCSS('background-color', 'rgb(16, 16, 16)');
      if (route.includes('/components/table-loader'))
        await expect(page.locator('.catalog-preview caption')).toHaveCSS(
          'color',
          'rgb(169, 169, 169)',
        );
    }
  } finally {
    await context.close();
  }
});

test('every dark component specimen and its primary action retain readable contrast', async ({
  page,
}) => {
  for (const item of catalog) {
    await page.goto(`/playground/components/${item.slug}`);
    const start = page.getByRole('button', {
      name: 'Start loading',
      exact: true,
    });
    await expect(start).toBeEnabled();
    const colors = await page.locator('.catalog-preview').evaluate((el) => {
      const styles = getComputedStyle(el);
      return { text: styles.color, surface: styles.backgroundColor };
    });
    expect(contrast(colors.text, colors.surface)).toBeGreaterThanOrEqual(4.5);
    const action = await start.evaluate((el) => {
      const styles = getComputedStyle(el);
      return { text: styles.color, surface: styles.backgroundColor };
    });
    expect(contrast(action.text, action.surface)).toBeGreaterThanOrEqual(4.5);
    await start.focus();
    const focus = await start.evaluate((el) => ({
      color: getComputedStyle(el).outlineColor,
      width: getComputedStyle(el).outlineWidth,
      background: getComputedStyle(document.body).backgroundColor,
    }));
    expect(focus.width).not.toBe('0px');
    expect(contrast(focus.color, focus.background)).toBeGreaterThanOrEqual(3);
    await start.click();
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(
      page
        .locator(
          item.family === 'text' ? 'dotquilt-text-loader' : 'dotquilt-region',
        )
        .first(),
    ).toHaveAttribute('state', 'ready');
  }
});

test('dark fields, hover, error and failed-style controls keep distinct states', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/playground/components/table-loader');
  await page
    .getByRole('combobox', { name: 'Animation mode', exact: true })
    .selectOption('custom');
  await page.getByText('Typed animation options', { exact: true }).click();
  const field = page.getByRole('spinbutton', {
    name: 'customReveal.duration',
    exact: true,
  });
  const colors = await field.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      text: s.color,
      background: s.backgroundColor,
      border: s.borderTopColor,
      placeholder: getComputedStyle(el, '::placeholder').color,
    };
  });
  expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
  expect(
    contrast(colors.placeholder, colors.background),
  ).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colors.border, colors.background)).toBeGreaterThanOrEqual(3);
  await field.fill('99999');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveCSS('outline-style', 'solid');
  const start = page.getByRole('button', {
    name: 'Start loading',
    exact: true,
  });
  await start.hover();
  const hover = await start.evaluate((el) => ({
    text: getComputedStyle(el).color,
    background: getComputedStyle(el).backgroundColor,
  }));
  expect(contrast(hover.text, hover.background)).toBeGreaterThanOrEqual(4.5);
  // A cold context prevents a previously admitted stylesheet from satisfying
  // the failure fixture through Firefox's memory cache.
  const context = await browser.newContext(baseURL ? { baseURL } : {});
  try {
    let blocked = 0;
    await context.route('**/dotquilt/*.css', (route) => {
      blocked++;
      return route.abort();
    });
    const failed = await context.newPage();
    await failed.goto('/playground/components/table-loader');
    const unavailable = failed.getByRole('button', {
      name: 'Start loading',
      exact: true,
    });
    await expect(unavailable).toBeDisabled();
    await expect(unavailable).toHaveCSS('border-top-style', 'dashed');
    await expect(unavailable).toHaveCSS('background-color', 'rgb(8, 8, 8)');
    await expect(failed.getByTestId('preview-fallback')).toBeVisible();
    expect(blocked).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test('forced colors retain system authority over the dark palette', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/playground/components/table-loader');
  const supported = await page.evaluate(
    () => matchMedia('(forced-colors: active)').matches,
  );
  test.skip(
    !supported,
    'Installed engine does not emulate forced colors; qualification remains unverified.',
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--docs-specimen').trim(),
      ),
  ).toBe('');
  const adjustmentSupported = await page.evaluate(() =>
    CSS.supports('forced-color-adjust', 'auto'),
  );
  if (adjustmentSupported) {
    await expect(page.locator('.catalog-preview')).toHaveCSS(
      'forced-color-adjust',
      'auto',
    );
  } else {
    test.info().annotations.push({
      type: 'qualification',
      description:
        'Installed engine exposes forced-colors media emulation but not forced-color-adjust. Dark-overlay exclusion is checked; actual system rendering remains unverified.',
    });
    await expect(page.locator('.catalog-preview')).toHaveCSS(
      'forced-color-adjust',
      '',
    );
  }
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
});

test('dark docs navigation preserves the custom homepage and introduces no hydration errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs/components/chart-loader');
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'Dotquilt home', exact: true }).click();
  await expect(page.locator('.gallery-home')).toHaveCSS(
    'background-color',
    'rgb(8, 8, 8)',
  );
  await expect(page.locator('.gallery-home')).toHaveCSS(
    'font-family',
    /Zalando Sans/,
  );
  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(8, 8, 8)',
  );
  expect(errors).toEqual([]);
});
