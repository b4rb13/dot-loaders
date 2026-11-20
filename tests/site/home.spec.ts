import { expect, type Locator, type Page, test } from '@playwright/test';

/** Records how each handoff inside `scope` ends. */
async function recordHandoffs(page: Page, scope: string) {
  await page.evaluate((selector) => {
    const reasons: string[] = [];
    Reflect.set(window, 'handoffs', reasons);
    document.addEventListener(
      'dotquilt-handoff-end',
      (event) => {
        if ((event.target as Element).closest(selector))
          reasons.push(
            (event as CustomEvent<{ reason: string }>).detail.reason,
          );
      },
      true,
    );
  }, scope);
  return () => page.evaluate(() => Reflect.get(window, 'handoffs'));
}

/** Presses and holds a control with the mouse; returns the let-go. */
async function hold(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  if (!box) throw new Error('The hold control has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  return () => page.mouse.up();
}

/** Scrolls a section to the middle of the window, clear of the header. */
async function reveal(page: Page, selector: string) {
  await page.evaluate(
    (selector) =>
      document.querySelector(selector)?.scrollIntoView({ block: 'center' }),
    selector,
  );
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('the first screen arrives: the figures lock, the line draws and the rows settle', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // The whole first screen in view: a loader out of view hands over at once.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const hero = page.locator('[data-va-hero]');
  const handoffs = await recordHandoffs(page, '[data-va-hero]');
  await expect(
    hero.getByRole('heading', {
      level: 1,
      name: 'Loading states that hand over.',
    }),
  ).toBeVisible();
  await expect(hero.getByRole('link', { name: 'Get started' })).toHaveAttribute(
    'href',
    '/docs/',
  );
  await expect(
    hero.getByRole('link', { name: 'See the components' }),
  ).toBeVisible();
  // Three figures, the chart and the table each hand over once.
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(Array(5).fill('complete'));
  expect(
    await hero
      .locator('dotquilt-text-loader')
      .evaluateAll((loaders) =>
        loaders.map((loader) => loader.textContent?.trim()),
      ),
  ).toEqual(['$45,980', '88', '0.8%']);
  await expect(hero.locator('[data-table] tbody tr')).toHaveCount(4);
  // The loop replaced "Load again".
  await expect(hero.getByRole('button', { name: 'Load again' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the first screen loops: it rests, then loads the next range, until paused', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const hero = page.locator('[data-va-hero]');
  const table = hero.locator('[data-table-region]');
  const range = hero.locator('[data-range] [aria-checked="true"]');
  await expect(range).toHaveText('30 days');
  // After the first load and a few seconds' rest, the next range loads
  // from its placeholders, then settles.
  await expect(range).toHaveText('90 days', { timeout: 12_000 });
  await expect(table).toHaveJSProperty('state', 'ready', { timeout: 6000 });
  // Paused, it stays on this range.
  await hero.getByRole('button', { name: 'Pause the example' }).click();
  await expect(
    hero.getByRole('button', { name: 'Play the example' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(6000);
  await expect(range).toHaveText('90 days');
});

test('with reduced motion the first screen shows at rest, values in place', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('[data-va-hero]');
  await expect(hero).not.toHaveAttribute('data-arrive');
  await expect(
    hero.locator('dotquilt-text-loader').first(),
  ).not.toHaveAttribute('state', 'pending');
  // The loader's own text, not the marks drawn in its shadow root.
  expect(
    await hero
      .locator('dotquilt-text-loader')
      .first()
      .evaluate((loader) => loader.textContent?.trim()),
  ).toBe('$45,980');
  // Nothing loops, so there is nothing to pause.
  await expect(hero.locator('[data-loop]')).toBeHidden();
});

test('the first screen fits the window at desktop, tablet and phone widths', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 960],
    [820, 1100],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const box = await page.locator('[data-va-hero] h1').boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(width);
  }
  // At 1440 the screen runs to the window's right edge and its foot sits
  // inside the first screen.
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  const stage = await page.locator('[data-va-hero] .va-stage').boundingBox();
  expect(stage && Math.round(stage.x + stage.width)).toBe(1440);
  const screen = await page.locator('[data-screen]').boundingBox();
  expect(screen && screen.y + screen.height).toBeLessThanOrEqual(960);
});

test('table column heads stay still while the rows load', async ({ page }) => {
  // The heads are plain text: only the rows take the placeholder's shape
  // and hand over, so a head is never inside a loading region.
  await page.goto('/');
  for (const scope of ['[data-va-hero]', '[data-va-invoices]']) {
    const heads = page.locator(`${scope} th:visible`);
    await expect(heads.first()).toBeVisible();
    for (const head of await heads.all())
      expect(
        await head.evaluate((cell) => cell.closest('dotquilt-region')),
        scope,
      ).toBeNull();
  }
  // While the invoices are held loading, the heads still read as text.
  const invoices = page.locator('[data-va-invoices]');
  await reveal(page, '[data-va-invoices]');
  await expect(invoices.locator('[data-ledger-region]')).toHaveJSProperty(
    'state',
    'ready',
    { timeout: 6000 },
  );
  const letGo = await hold(page, invoices.locator('[data-hold]'));
  await expect(invoices.locator('[data-ledger-region]')).toHaveJSProperty(
    'state',
    'pending',
  );
  await expect(
    invoices.locator('.va-ledger-head').getByText('Customer'),
  ).toBeVisible();
  await letGo();
  await expect(invoices.locator('[data-ledger-region]')).toHaveJSProperty(
    'state',
    'ready',
  );
});

test('holding keeps the inbox reply typing; letting go delivers it', async ({
  page,
}) => {
  await page.goto('/');
  const inbox = page.locator('[data-va-inbox]');
  await reveal(page, '[data-va-inbox]');
  await expect(inbox.locator('[data-thread-region]')).toHaveJSProperty(
    'state',
    'ready',
    { timeout: 6000 },
  );
  const letGo = await hold(page, inbox.locator('[data-hold]'));
  const reply = inbox.locator('[data-later] dotquilt-region');
  await expect(reply).toHaveCount(1);
  // Held well past its natural answer, it is still typing.
  await page.waitForTimeout(3000);
  await expect(reply).toHaveJSProperty('state', 'pending');
  await expect(inbox.locator('[data-note]')).toHaveText(
    'Inês Costa is typing…',
  );
  await letGo();
  await expect(reply).toHaveJSProperty('state', 'ready');
  await expect(inbox.locator('[data-note]')).toHaveText('Inês Costa replied.');
});

test('the activity feed keeps its height as new items arrive', async ({
  page,
}) => {
  await page.goto('/');
  const activity = page.locator('[data-va-activity]');
  await reveal(page, '[data-va-activity]');
  const feed = activity.locator('[data-feed-region]');
  await expect(feed).toHaveJSProperty('state', 'ready', { timeout: 6000 });
  const frame = activity.locator('.va-feed');
  const before = await frame.evaluate((f) => f.getBoundingClientRect().height);
  const items = activity.locator('[data-feed] li');
  const first = await items.count();
  for (let i = 0; i < 4; i++) {
    const letGo = await hold(page, activity.locator('[data-hold]'));
    await expect(feed).toHaveJSProperty('state', 'refreshing');
    await letGo();
    await expect(feed).toHaveJSProperty('state', 'ready');
  }
  expect(await items.count()).toBeGreaterThan(first);
  // The new items scroll inside the feed: the frame never grows.
  expect(await frame.evaluate((f) => f.getBoundingClientRect().height)).toBe(
    before,
  );
  const scroller = activity.locator('[data-feed-scroll]');
  expect(await scroller.evaluate((s) => s.scrollHeight > s.clientHeight)).toBe(
    true,
  );
});

test('every family tile loads and hands over in turn', async ({ page }) => {
  await page.goto('/');
  const handoffs = await recordHandoffs(page, '[data-family]');
  await reveal(page, '[data-family]');
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(Array(6).fill('complete'));
});

test('the handoff plays at full speed or slowed to a third, with its timeline', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('[data-handoff]');
  const handoffs = await recordHandoffs(page, '[data-handoff]');
  await reveal(page, '[data-handoff]');
  await expect.poll(handoffs, { timeout: 6000 }).toEqual(['complete']);
  await section.getByRole('radio', { name: 'A third of the speed' }).click();
  await expect(section.locator('.ticks')).toContainText('3.3 s');
  const letGo = await hold(page, section.locator('[data-hold]'));
  await page.waitForTimeout(400);
  await letGo();
  const started = Date.now();
  await expect
    .poll(handoffs, { timeout: 8000 })
    .toEqual(['complete', 'complete']);
  // A third of the speed: well over the 1.1 s handoff.
  expect(Date.now() - started).toBeGreaterThan(2500);
});

test('make it yours restyles the loaders and writes the CSS', async ({
  page,
}) => {
  await page.goto('/');
  const yours = page.locator('[data-yours]');
  await reveal(page, '[data-yours]');
  const css = yours.locator('[data-css]');
  await expect(css).toHaveText('/* The defaults: nothing to add. */');
  await yours.getByRole('radio', { name: 'Sage' }).click();
  await yours.getByRole('radio', { name: 'Dash' }).click();
  await expect(css).toContainText('--dotquilt-color: light-dark(#5f7a6c');
  await expect(css).toContainText('mark="dash"');
  // Squares and dashes have a fixed size.
  await expect(yours.locator('[data-size]')).toBeDisabled();
  expect(
    await yours
      .locator('[data-preview]')
      .evaluate((preview) =>
        getComputedStyle(preview).getPropertyValue('--dotquilt-color'),
      ),
  ).toContain('#5f7a6c');
});

test('the details: a held note rests after four seconds, then arrives', async ({
  page,
}) => {
  await page.goto('/');
  const calm = page.locator('[data-proof="calm"]');
  await reveal(page, '[data-proof="calm"]');
  await expect(calm).toHaveAttribute('data-phase', 'arrived', {
    timeout: 8000,
  });
  const letGo = await hold(page, calm.locator('[data-hold]'));
  await expect(calm).toHaveAttribute('data-phase', 'resting', {
    timeout: 6000,
  });
  await letGo();
  await expect(calm).toHaveAttribute('data-phase', 'arrived');
  await expect(calm.locator('[data-readout]')).toContainText('Arrived after');
});
