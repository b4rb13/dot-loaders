import { expect, test } from '@playwright/test';
import galleryPoints from '../../apps/website/lib/gallery-dots.json' with {
  type: 'json',
};

test('homepage navigation preserves the docs and playground flow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Loading, considered.' }),
  ).toBeVisible();
  await expect(page.locator('.gallery-home')).toHaveCSS(
    'background-color',
    'rgb(8, 8, 8)',
  );
  await page.getByRole('link', { name: 'Read the docs', exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(
    page.getByRole('heading', { name: 'Set up the private preview' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Dotquilt home', exact: true }).click();
  await page
    .getByRole('link', { name: 'Try the playground', exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/\/playground$/);
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'state',
    'ready',
  );
});

test('real custom text handoff retains its application node and focus on replay', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const host = page.locator('dotquilt-text-loader');
  const button = page.getByRole('button', { name: 'Play reveal', exact: true });
  await expect(button).toBeEnabled();
  await expect(host).toHaveAttribute('data-custom', '');
  await expect(host.locator('svg circle')).toHaveCount(galleryPoints.length);
  await host
    .locator('[data-dotquilt-text-content]')
    .evaluate((node) => node.setAttribute('data-identity', 'original'));
  await host.evaluate((node) =>
    node.addEventListener('dotquilt-handoff-start', (event) =>
      node.setAttribute(
        'data-animation',
        (event as CustomEvent).detail.animation,
      ),
    ),
  );
  for (let i = 0; i < 2; i++) {
    await button.focus();
    await button.press('Enter');
    await expect(host).toHaveAttribute('state', 'pending');
    await expect(host).toHaveAttribute('data-presentation', 'ready', {
      timeout: 5000,
    });
    await expect(page.locator('.gallery-controls [aria-current]')).toHaveText(
      'Content',
    );
    await expect(host.locator('[data-dotquilt-text-content]')).toHaveAttribute(
      'data-identity',
      'original',
    );
    await expect(button).toBeFocused();
  }
  await expect(host).toHaveAttribute(
    'data-animation',
    'dotquilt-site/gallery-reveal',
  );
  expect(errors).toEqual([]);
});

test('chart and table run rich handoffs using their own projected data and row targets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (const [name, selector, animation] of [
    ['chart', '.gallery-chart-region', 'morph'],
    ['table', '.gallery-table-region', 'rows'],
  ] as const) {
    const host = page.locator(selector);
    await host.evaluate((node) =>
      node.addEventListener('dotquilt-handoff-start', (event) =>
        node.setAttribute(
          'data-animation',
          (event as CustomEvent).detail.animation,
        ),
      ),
    );
    await page
      .getByRole('button', { name: `Play ${name} reveal`, exact: true })
      .click();
    const loader = host.locator(`dotquilt-${name}-loader`);
    const ownerBox = await host.boundingBox();
    const loaderBox = await loader.boundingBox();
    expect(ownerBox).not.toBeNull();
    expect(loaderBox).not.toBeNull();
    expect(Math.abs((ownerBox?.y ?? 0) - (loaderBox?.y ?? 0))).toBeLessThan(1);
    await expect(host).toHaveAttribute('state', 'ready', { timeout: 5000 });
    await expect(host).toHaveAttribute('data-presentation', 'ready', {
      timeout: 5000,
    });
    await expect(host).toHaveAttribute('data-animation', new RegExp(animation));
  }
  expect(errors).toEqual([]);
});

test('persistent pause and system reduction settle the demonstration without losing content', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.getByRole('button', { name: 'Play reveal', exact: true }).click();
  const host = page.locator('dotquilt-text-loader');
  await expect(host).toHaveAttribute('motion', 'paused');
  await expect(host).toHaveAttribute('data-presentation', 'ready');
  await page.getByRole('link', { name: 'Read the docs', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Motion paused' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/');
  await page.getByRole('button', { name: 'Motion paused' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Play reveal', exact: true }).click();
  await expect(host).toHaveAttribute('motion', 'paused');
  await expect(host).toHaveAttribute('data-presentation', 'ready');
});

test('query links open with a still specimen and explicit playback remains available', async ({
  page,
}) => {
  await page.goto('/?shared=1&autoplay=1');
  const host = page.locator('dotquilt-text-loader');
  await expect(
    page.getByRole('button', { name: 'Play reveal', exact: true }),
  ).toBeEnabled();
  await expect(host).toHaveAttribute('motion', 'paused');
  await expect(host).toHaveAttribute('state', 'pending');
  await page.getByRole('button', { name: 'Play reveal', exact: true }).click();
  await expect(host).toHaveAttribute('data-presentation', 'ready', {
    timeout: 5000,
  });
});

test('homepage stays readable without JavaScript and font requests', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route('**/fonts/**', (route) => route.abort());
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Loading, considered.' }),
    ).toBeVisible();
    await expect(page.locator('.gallery-word-fallback')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play reveal', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText('Illustrative data. Play a specimen to see its handoff.'),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Read the docs', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Set up the private preview' }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('supported viewport layouts keep controls and content inside the page', async ({
  page,
}) => {
  for (const width of [320, 390, 669, 1280, 1440, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?review=static');
    await expect(
      page.getByRole('button', { name: 'Play reveal', exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('navigation', { name: 'Primary' }),
    ).toBeVisible();
    const button = page.getByRole('button', {
      name: 'Pause motion',
      exact: true,
    });
    await button.focus();
    await expect(button).toBeFocused();
  }
});

test('resuming motion after a completed paused replay does not invent another handoff', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.getByRole('button', { name: 'Play reveal', exact: true }).click();
  const phase = page.locator('.gallery-controls [aria-current]');
  await expect(phase).toHaveText('Content');
  await page
    .getByRole('button', { name: 'Motion paused', exact: true })
    .click();
  // Cover the application-owned 850ms delay that must not run again on resume.
  await page.waitForTimeout(1100);
  await expect(phase).toHaveText('Content');
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'ready',
  );
});

test('replay during a handoff keeps the new cycle idle until its own result is ready', async ({
  page,
}) => {
  await page.goto('/');
  const replay = page.getByRole('button', { name: 'Play reveal', exact: true });
  const phase = page.locator('.gallery-controls [aria-current]');
  await replay.click();
  await expect(phase).toHaveText('Handoff');
  await replay.click();
  await expect(page.locator('dotquilt-text-loader')).toHaveAttribute(
    'state',
    'pending',
  );
  await expect(phase).toHaveText('Idle');
  await expect(phase).toHaveText('Content', { timeout: 5000 });
});
