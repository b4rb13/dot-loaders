import { expect, type Page, test } from '@playwright/test';
import {
  type ComponentSlug,
  catalogDefaults,
  catalogQuery,
} from '../../apps/website/lib/catalog';

const rich = ['text-loader', 'chart-loader', 'table-loader'] as const;
const start = (page: Page) =>
  page.getByRole('button', { name: 'Start loading', exact: true });
async function open(page: Page, component: ComponentSlug) {
  await page.goto(
    `/playground/components/${component}?${catalogQuery({ ...catalogDefaults(component), pointer: 'lift' })}`,
  );
  await expect(start(page)).toBeEnabled();
  return page
    .locator(
      component === 'text-loader'
        ? 'dotquilt-text-loader'
        : `dotquilt-${component}`,
    )
    .first();
}
async function content(page: Page, component: string) {
  await expect(
    component === 'text-loader'
      ? page.locator('.catalog-preview .catalog-text')
      : component === 'chart-loader'
        ? page.locator('.catalog-preview svg[role="img"]')
        : page.locator('.catalog-preview table'),
  ).toBeVisible();
}
test('Quickstart: no-JavaScript content and complete files keep loading actions disabled', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    await page.goto('/docs');
    await expect(start(page)).toBeDisabled();
    await expect(
      page.getByTestId('preview').getByRole('heading'),
    ).toBeVisible();
    await page
      .getByText('Complete example · all files', { exact: true })
      .click();
    await expect(page.getByText('package.json', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
test('Quickstart: failed styles retain settings/code and same-route reload recovery', async ({
  page,
}) => {
  let blocked = true;
  await page.route('**/dotquilt/*.css', (r) =>
    blocked ? r.abort() : r.continue(),
  );
  await page.goto(
    '/playground?schema=1&version=0.0.0-m2.0&integration=native&lines=4',
  );
  await expect(start(page)).toBeDisabled();
  await expect(page.getByTestId('enhancement-status')).toContainText(
    'could not load',
  );
  await expect(page.getByRole('link', { name: 'Reload this page' })).toHaveCSS(
    'text-decoration-line',
    'underline',
  );
  await expect(page.getByTestId('preview').getByRole('heading')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Placeholder lines' })
    .selectOption('5');
  await expect(
    page.getByRole('link', { name: 'Reload this page' }),
  ).toHaveAttribute('href', /^\/playground\?.*lines=5/);
  blocked = false;
  await page.getByRole('link', { name: 'Reload this page' }).click();
  await expect(start(page)).toBeEnabled();
  await expect(
    page.getByRole('combobox', { name: 'Placeholder lines' }),
  ).toHaveValue('5');
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
});
test('Quickstart: delayed stylesheet admission does not restore a request', async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((r) => {
    release = r;
  });
  let requests = 0;
  await page.route('**/dotquilt/*.css', async (route) => {
    requests++;
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/docs', { waitUntil: 'domcontentloaded' });
    await expect(start(page)).toBeDisabled();
    await expect.poll(() => requests).toBeGreaterThan(0);
    await expect(
      page.getByTestId('preview').getByRole('heading'),
    ).toBeVisible();
    release();
    await expect(start(page)).toBeEnabled();
    await expect(page.locator('dotquilt-region')).toHaveAttribute(
      'state',
      'ready',
    );
  } finally {
    release();
  }
});
test('Quickstart: failed address writes retain edits and useful ready content', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/docs');
  await expect(start(page)).toBeEnabled();
  await page.evaluate(() => {
    history.replaceState = () => {
      throw new Error('Injected history failure');
    };
  });
  await page
    .getByRole('combobox', { name: 'Placeholder lines' })
    .selectOption('5');
  await expect(
    page.getByRole('combobox', { name: 'Placeholder lines' }),
  ).toHaveValue('5');
  await expect(
    page.getByText('The address could not update.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
  expect(errors).toEqual([]);
});
for (const api of [
  'ResizeObserver',
  'IntersectionObserver',
  'MutationObserver',
])
  for (const component of ['quickstart', ...rich])
    test(`${component}: missing ${api} retains static content, code and a reload path`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(
        (name) =>
          Object.defineProperty(window, name, {
            value: undefined,
            configurable: true,
          }),
        api,
      );
      await page.goto(
        component === 'quickstart' ? '/docs' : `/docs/components/${component}`,
      );
      await expect(start(page)).toBeDisabled();
      await expect(page.getByTestId('enhancement-status')).toContainText(
        'capabilities are unavailable',
      );
      await expect(page.getByTestId('preview-fallback')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Reload this page' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Reload this page' }),
      ).toHaveCSS('text-decoration-line', 'underline');
      await expect(
        page.getByText('Complete example · all files', { exact: true }),
      ).toBeVisible();
      await expect(page.locator('[data-dotquilt-react-host]')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
for (const route of [
  '/docs',
  '/docs/components/text-loader',
  '/playground/components/table-loader',
])
  test(`${route}: missing site CSS leaves native reading, source disclosures and navigation usable`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      ...(baseURL ? { baseURL } : {}),
    });
    try {
      let count = 0;
      await context.route('**/_next/static/**/*.css', (r) => {
        count++;
        return r.abort();
      });
      const page = await context.newPage();
      await page.goto(route);
      expect(count).toBeGreaterThan(0);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(start(page)).toBeDisabled();
      await page
        .getByText('Complete example · all files', { exact: true })
        .click();
      await expect(
        page.getByText('package.json', { exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole('link', {
            name: route.startsWith('/docs') ? 'Quickstart' : 'Docs',
            exact: true,
          })
          .first(),
      ).toHaveAttribute('href', '/docs');
      await expect(
        page
          .getByRole('link', {
            name: route.startsWith('/docs') ? 'Quickstart' : 'Docs',
            exact: true,
          })
          .first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
for (const component of rich)
  for (const outcome of ['late', 'failed'])
    test(`${component}: ${outcome} application font preserves content, cycle and explicit readiness`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const host = await open(page, component);
      let release = () => {};
      const gate = new Promise<void>((r) => {
        release = r;
      });
      let requests = 0;
      await page.route(
        '**/fonts/ZalandoSans-Variable.ttf?resilience',
        async (r) => {
          requests++;
          await gate;
          if (outcome === 'failed') await r.abort();
          else await r.continue();
        },
      );
      try {
        await page.addStyleTag({
          content:
            "@font-face{font-family:ResilienceFont;src:url('/fonts/ZalandoSans-Variable.ttf?resilience');font-display:swap}.catalog-preview,.catalog-preview *{font-family:ResilienceFont,serif!important}",
        });
        await expect.poll(() => requests).toBe(1);
        await content(page, component);
        const owner = page
          .locator(
            component === 'text-loader'
              ? 'dotquilt-text-loader'
              : 'dotquilt-region',
          )
          .first();
        await start(page).click();
        const cycle = await owner.getAttribute('cycle');
        release();
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        expect(await owner.getAttribute('cycle')).toBe(cycle);
        await expect(owner).toHaveAttribute('state', 'pending');
        await page
          .getByRole('button', { name: 'Reveal content', exact: true })
          .click();
        await expect(owner).toHaveAttribute('data-presentation', 'ready');
        await content(page, component);
        expect(errors).toEqual([]);
        expect(await host.getAttribute('pointer-response')).toBe('lift');
      } finally {
        release();
      }
    });
async function pointerMedia(page: Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    Reflect.set(window, 'resilienceFine', true);
    window.matchMedia = (query) => {
      const media = original(query);
      if (query.replaceAll(' ', '') === '(hover:hover)and(pointer:fine)')
        Object.defineProperty(media, 'matches', {
          get: () => Reflect.get(window, 'resilienceFine'),
        });
      return media;
    };
  });
}
async function point(page: Page, type: string) {
  await page.locator('.catalog-preview').scrollIntoViewIfNeeded();
  await page
    .locator('.catalog-preview [pointer-response="lift"]')
    .first()
    .evaluate((el, type) => {
      const b = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: type,
          clientX: b.x + b.width / 2,
          clientY: b.y + b.height / 2,
        }),
      );
    }, type);
}
// Private diagnostic seam only; not a supported API or a physical-device test.
async function position(page: Page) {
  return page
    .locator('.catalog-preview [pointer-response="lift"]')
    .first()
    .evaluate(
      (el) => Reflect.get(el, Symbol.for('dotquilt.pointer.v1')) ?? null,
    );
}
for (const component of rich) {
  test(`${component}: fine pointer, explicit leave and touch preserve request ownership`, async ({
    page,
  }) => {
    await pointerMedia(page);
    await open(page, component);
    await start(page).click();
    await expect(
      page.locator('.catalog-preview [data-moving]').first(),
    ).toBeAttached();
    await point(page, 'mouse');
    expect(await position(page)).not.toBeNull();
    const owner = page
      .locator(
        component === 'text-loader'
          ? 'dotquilt-text-loader'
          : 'dotquilt-region',
      )
      .first();
    const cycle = await owner.getAttribute('cycle');
    await page
      .locator(
        component === 'text-loader'
          ? 'dotquilt-text-loader'
          : 'dotquilt-region',
      )
      .first()
      .dispatchEvent('pointerleave');
    expect(await position(page)).toBeNull();
    await page.evaluate(() => Reflect.set(window, 'resilienceFine', false));
    await point(page, 'touch');
    expect(await position(page)).toBeNull();
    expect(await owner.getAttribute('cycle')).toBe(cycle);
    await expect(owner).toHaveAttribute('state', 'pending');
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    await content(page, component);
  });
  test(`${component}: capability change and touch alone clear a previously captured pointer`, async ({
    page,
  }) => {
    await pointerMedia(page);
    await open(page, component);
    await start(page).click();
    await expect(
      page.locator('.catalog-preview [data-moving]').first(),
    ).toBeAttached();
    await point(page, 'mouse');
    expect(await position(page)).not.toBeNull();
    await page.evaluate(() => Reflect.set(window, 'resilienceFine', false));
    await point(page, 'touch');
    expect(await position(page)).toBeNull();
  });
}
