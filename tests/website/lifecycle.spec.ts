import { expect, type Page, test } from '@playwright/test';
import {
  type ComponentSlug,
  catalog,
  catalogDefaults,
  catalogQuery,
} from '../../apps/website/lib/catalog';

const rich = ['text-loader', 'chart-loader', 'table-loader'] as const;
async function open(
  page: Page,
  component: ComponentSlug,
  extra: Partial<ReturnType<typeof catalogDefaults>> = {},
) {
  await page.goto(
    `/playground/components/${component}?${catalogQuery({ ...catalogDefaults(component), ...extra })}`,
  );
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeEnabled();
  return page
    .locator(
      component === 'text-loader' ? 'dotquilt-text-loader' : 'dotquilt-region',
    )
    .first();
}
async function useful(page: Page, component: ComponentSlug) {
  const content =
    component === 'text-loader'
      ? page.locator('.catalog-preview .catalog-text')
      : component === 'chart-loader'
        ? page.locator('.catalog-preview svg[role="img"]')
        : component === 'table-loader'
          ? page.locator('.catalog-preview table')
          : page.locator('.catalog-preview [data-testid="catalog-content"]');
  await expect(content).toBeVisible();
}
for (const component of rich)
  test(`${component}: failed JavaScript retains static docs/code and a recovery path`, async ({
    page,
  }) => {
    let blocked = true,
      requests = 0;
    await page.route('**/_next/static/**/*.js', (route) => {
      if (blocked) {
        requests++;
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(`/docs/components/${component}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await useful(page, component);
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText('Complete example · all files', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Interactive preview has not started.', { exact: false }),
    ).toBeVisible();
    expect(requests).toBeGreaterThan(0);
    blocked = false;
    await page
      .getByRole('link', { name: 'Reload this page', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeEnabled();
    await useful(page, component);
  });
for (const item of catalog)
  test(`${item.name}: failed required CSS retains useful content instead of a broken loading gate`, async ({
    page,
  }) => {
    let failures = 0;
    await page.route('**/dotquilt/*.css', (route) => {
      failures++;
      return route.abort();
    });
    await page.goto(`/playground/components/${item.slug}`);
    await useful(page, item.slug);
    await expect(
      page.getByText('Preview styles could not load.', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeDisabled();
    await expect(page.getByTestId('preview-fallback')).toBeVisible();
    await expect(
      page.locator('.catalog-preview [data-dotquilt-react-host]'),
    ).toHaveCount(0);
    expect(failures).toBeGreaterThan(0);
  });
for (const component of rich)
  test(`${component}: delayed CSS enhancement keeps current content until it can start`, async ({
    page,
  }) => {
    let unblock: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let seen = 0;
    await page.route('**/dotquilt/*.css', async (route) => {
      seen++;
      await gate;
      await route.continue();
    });
    try {
      await page.goto(`/playground/components/${component}`, {
        waitUntil: 'commit',
      });
      await expect(page.getByTestId('preview-fallback')).toBeVisible();
      await expect(
        page.getByText('Complete example · all files', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Start loading', exact: true }),
      ).toBeDisabled();
      const start = page.getByRole('button', {
        name: 'Start loading',
        exact: true,
      });
      await expect(start).toHaveCSS('border-top-style', 'dashed');
      const inactive = await start.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      await start.hover();
      await expect(start).toHaveCSS('background-color', inactive);
      await expect.poll(() => seen).toBeGreaterThan(0);
      unblock();
      await expect(
        page.getByRole('button', { name: 'Start loading', exact: true }),
      ).toBeEnabled();
      await expect(start).not.toHaveCSS('background-color', inactive);
      await page
        .getByRole('button', { name: 'Start loading', exact: true })
        .click();
      const owner = page
        .locator(
          component === 'text-loader'
            ? 'dotquilt-text-loader'
            : 'dotquilt-region',
        )
        .first();
      await expect(owner).toHaveAttribute('state', 'pending');
    } finally {
      unblock();
    }
  });
for (const component of rich)
  test(`${component}: expired motion stays static through edits and new-cycle churn`, async ({
    page,
  }) => {
    const owner = await open(page, component);
    await page.clock.install();
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page.clock.runFor(100);
    await expect(
      page.locator('.catalog-preview [data-moving]').first(),
    ).toBeAttached();
    await page.clock.runFor(4200);
    await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
    await expect(owner).toHaveAttribute('state', 'pending');
    await page
      .getByRole('combobox', { name: 'Idle speed', exact: true })
      .selectOption('2');
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page.clock.runFor(100);
    await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await page.clock.runFor(60);
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    await useful(page, component);
  });
for (const component of rich)
  test(`${component}: a newer load cancels only the previous handoff`, async ({
    page,
  }) => {
    const owner = await open(page, component, {
      mode: 'custom',
      duration: '900',
    });
    await page.clock.install();
    await owner.evaluate((el) => {
      Reflect.set(window, 'lifecycleEvents', []);
      for (const type of [
        'dotquilt-handoff-start',
        'dotquilt-handoff-end',
        'dotquilt-handoff-cancel',
      ])
        el.addEventListener(type, (event) =>
          Reflect.get(window, 'lifecycleEvents').push({
            type,
            ...(event as CustomEvent).detail,
          }),
        );
    });
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page.clock.runFor(80);
    const before = await owner.getAttribute('cycle');
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await page.clock.runFor(50);
    await expect(owner).toHaveAttribute('data-presentation', 'handoff');
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    const after = await owner.getAttribute('cycle');
    expect(after).not.toBe(before);
    await page.clock.runFor(1200);
    await expect(owner).toHaveAttribute('state', 'pending');
    await expect(page.locator('.state-label')).toHaveText('pending · Idle');
    const events = await owner.evaluate(() =>
      Reflect.get(window, 'lifecycleEvents'),
    );
    expect(
      events.filter(
        (e: { type: string; cycle: string }) =>
          e.cycle === before && e.type === 'dotquilt-handoff-cancel',
      ),
    ).toHaveLength(1);
    expect(
      events.filter(
        (e: { type: string; cycle: string }) =>
          e.cycle === before && e.type === 'dotquilt-handoff-end',
      ),
    ).toHaveLength(0);
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await page.clock.runFor(1000);
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
  });
for (const component of rich)
  test(`${component}: offscreen and zero-size states suspend decoration and preserve readiness`, async ({
    page,
  }) => {
    const owner = await open(page, component);
    await page.clock.install();
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page.clock.runFor(100);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    await page.clock.runFor(80);
    await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
    await expect(owner).toHaveAttribute('state', 'pending');
    await page.locator('.catalog-preview').scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await page.clock.runFor(80);
    await page
      .locator('.catalog-preview')
      .evaluate((el) => el.setAttribute('hidden', ''));
    await page.clock.runFor(80);
    await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
    await page
      .locator('.catalog-preview')
      .evaluate((el) => el.removeAttribute('hidden'));
    await page.clock.runFor(80);
    await expect(owner).toHaveAttribute('state', 'pending');
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await page.clock.runFor(1200);
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
  });
for (const component of rich)
  test(`${component}: client navigation releases frame/dot reservations and fresh mount opens ready`, async ({
    page,
  }) => {
    await open(page, component, { mode: 'custom' });
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page
      .getByRole('link', { name: 'Catalog overview', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Loading, composed.' }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          frames: !!Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
          dots: !!Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
          animations: document.getAnimations().length,
        })),
      )
      .toEqual({ frames: false, dots: false, animations: 0 });
    // Playwright pierces open shadow roots; document.querySelector does not.
    await expect(page.locator('[data-dotquilt-painter]')).toHaveCount(0);
    await page
      .getByRole('link', {
        name:
          component === 'text-loader'
            ? 'TextLoader'
            : component === 'chart-loader'
              ? 'ChartLoader'
              : 'TableLoader',
        exact: true,
      })
      .first()
      .click();
    await expect(
      page
        .locator(
          component === 'text-loader'
            ? 'dotquilt-text-loader'
            : 'dotquilt-region',
        )
        .first(),
    ).toHaveAttribute('state', 'ready');
    await useful(page, component);
  });

test('a failed page chunk leaves server content, code and ordinary navigation usable', async ({
  page,
}) => {
  const html = await (
    await page.request.get('/docs/components/text-loader')
  ).text();
  const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(
    (match) => match[1],
  );
  const chunk = scripts.find(
    (url) => url?.includes('/app/') && url.includes('/page-'),
  );
  if (!chunk)
    throw new Error(
      'The production page chunk must be identified before injection',
    );
  let failed = 0;
  await page.route(`**${chunk}`, (route) => {
    failed++;
    return route.abort();
  });
  await page.goto('/docs/components/text-loader');
  await useful(page, 'text-loader');
  await expect(
    page.getByText('Complete example · all files', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('enhancement-status')).toContainText(
    'Interactive preview has not started.',
  );
  await expect(
    page.getByRole('link', { name: 'Reload this page', exact: true }),
  ).toHaveAttribute('href', /^\/docs\/components\/text-loader\?schema=3/);
  expect(failed).toBeGreaterThan(0);
  await page
    .getByRole('link', { name: 'Catalog overview', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Loading, composed.' }),
  ).toBeVisible();
});

test('an HTML stylesheet replacement cannot enable a decorative loading gate', async ({
  page,
}) => {
  await page.route('**/dotquilt/*.css', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Unavailable</title>',
    }),
  );
  await page.goto('/playground/components/text-loader');
  await useful(page, 'text-loader');
  await expect(page.getByTestId('enhancement-status')).toContainText(
    'Preview styles could not load.',
  );
  await expect(
    page.getByRole('button', { name: 'Start loading', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('combobox', { name: 'Idle speed', exact: true })
    .selectOption('2');
  await expect(
    page.getByRole('combobox', { name: 'Idle speed', exact: true }),
  ).toHaveValue('2');
});

test('a stalled stylesheet check has a bounded deadline and explicit reload recovery', async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/dotquilt/*.css', async (route) => {
    if (route.request().resourceType() === 'fetch') await gate;
    await route.continue();
  });
  try {
    await page.goto('/playground/components/chart-loader');
    await useful(page, 'chart-loader');
    await expect(page.getByTestId('enhancement-status')).toContainText(
      'Preview styles could not load.',
      { timeout: 7000 },
    );
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeDisabled();
    release();
    await page
      .getByRole('link', { name: 'Reload this page', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Start loading', exact: true }),
    ).toBeEnabled();
  } finally {
    release();
  }
});

for (const component of rich)
  test(`${component}: unavailable Canvas and Web Animations preserve useful content and explicit readiness`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: () => null,
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'animate', {
        value: undefined,
        configurable: true,
      });
    });
    const owner = await open(page, component, { mode: 'custom' });
    await useful(page, component);
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'pending');
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    await useful(page, component);
    await expect(
      page.getByText('Complete example · all files', { exact: true }),
    ).toBeVisible();
  });

test('storage and address-writing failures retain session pause and shareable configuration', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      value: () => {
        throw new DOMException('Unavailable', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => {
        throw new DOMException('Unavailable', 'SecurityError');
      },
    });
  });
  const owner = await open(page, 'text-loader', { mode: 'custom' });
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Motion paused', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
  await page.evaluate(() => {
    history.replaceState = () => {
      throw new DOMException('Unavailable', 'SecurityError');
    };
  });
  await page
    .getByRole('combobox', { name: 'Idle speed', exact: true })
    .selectOption('2');
  await expect(
    page.getByRole('combobox', { name: 'Idle speed', exact: true }),
  ).toHaveValue('2');
  await expect(page.locator('.feedback')).toContainText(
    'The address could not update.',
  );
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
});

test('document visibility suspends custom decoration without changing the request', async ({
  page,
}) => {
  const owner = await open(page, 'chart-loader', { mode: 'custom' });
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await expect(
    page.locator('.catalog-preview [data-moving]').first(),
  ).toBeAttached();
  const cycle = await owner.getAttribute('cycle');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.catalog-preview [data-moving]')).toHaveCount(0);
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  await expect(owner).toHaveAttribute('state', 'pending');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
});
