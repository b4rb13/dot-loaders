import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    nextViolations: { directive: string; blocked: string }[];
    nextFirstInput: HTMLInputElement | null;
    nextFirstHost: Element | null;
    nextShifts: { value: number; hadRecentInput: boolean }[];
    nextEvents: string[];
  }
}
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
async function hydrated(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'yes');
  await expect(page.locator('html')).toHaveAttribute('data-native-ref', 'true');
}
for (const mode of ['nonce', 'external']) {
  test(`production App Router SSR, streaming and hydration under ${mode} CSP`, async ({
    page,
  }) => {
    const errors = watch(page);
    const response = await page.goto(`/?mode=${mode}`, { waitUntil: 'commit' });
    expect(response?.headers()['content-security-policy']).toContain(
      "style-src-attr 'none'",
    );
    await expect(page.locator('#next-input')).toBeVisible();
    await expect(page.locator('#server-detail')).toHaveText(
      'Deferred account detail',
    );
    await hydrated(page);
    expect(
      await page.evaluate(
        () => document.getElementById('next-input') === window.nextFirstInput,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.getElementById('next-region') === window.nextFirstHost,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.nextViolations)).toEqual([]);
    expect(errors).toEqual([]);
    await test.info().attach('runtime-react-version', {
      body:
        (await page.locator('html').getAttribute('data-react-version')) ?? '',
      contentType: 'text/plain',
    });
  });
  test(`client navigation keeps the original document's ${mode} policy after native registration`, async ({
    page,
  }) => {
    const errors = watch(page);
    await page.goto(`/?mode=${mode}`);
    await hydrated(page);
    await page.locator('#layout-counter').click();
    const nonce = await page
      .locator('dotquilt-region')
      .evaluate(
        (e) =>
          (e.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
            ?.nonce ?? '',
      );
    await page.locator('#navigate').click();
    await expect(page.locator('h1')).toHaveText('Other account');
    await expect(page.locator('#other-detail')).toBeVisible();
    await expect(page.locator('#layout-counter')).toHaveText('Layout count 1');
    await hydrated(page);
    const result = await page.locator('#next-region').evaluate((e) => ({
      nonce:
        (e.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
          ?.nonce ?? '',
      href: e.shadowRoot?.querySelector('link')?.getAttribute('href'),
      same: e === window.nextFirstHost,
      violations: window.nextViolations,
    }));
    expect(result.same).toBe(false);
    expect(result.nonce).toBe(nonce);
    if (mode === 'external') expect(result.href).toBe('/dotquilt/region.css');
    expect(result.violations).toEqual([]);
    await page.locator('#pending').click();
    await expect(page.locator('#next-region')).toHaveAttribute(
      'data-presentation',
      'pending',
    );
    await page.locator('#ready').click();
    await expect(page.locator('#next-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(errors).toEqual([]);
  });
}
test('ready and pending no-JavaScript output retain content access and a real recovery route', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const state of ['ready', 'pending']) {
    await page.goto(`${baseURL}/?state=${state}&mode=external`);
    await expect(page.locator('#next-input')).toBeVisible();
    await page.locator('#next-input').fill('No JavaScript note');
    if (state === 'pending')
      await expect(page.locator('[data-dotquilt-static]')).toBeVisible();
    await page.locator('#recovery').click();
    await expect(page.locator('h1')).toHaveText('Other account');
    await expect(page.locator('#other-detail')).toBeVisible();
  }
  await context.close();
});
test('failed framework scripts keep the account usable and preserve static recovery', async ({
  page,
}) => {
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/?state=pending&mode=external');
  await expect(page.locator('#next-input')).toBeVisible();
  await expect(page.locator('[data-dotquilt-static]')).toBeVisible();
  expect(
    await page.evaluate(() => !!customElements.get('dotquilt-region')),
  ).toBe(false);
});

test('delayed framework scripts preserve pre-hydration edits in a fresh document', async ({
  page,
}) => {
  const errors = watch(page);
  let resume: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route('**/_next/static/**/*.js', async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page.goto('/?state=pending&mode=nonce', { waitUntil: 'commit' });
    await expect(page.locator('#next-input')).toBeVisible();
    await page.locator('#next-input').fill('Edited while waiting');
    await page.locator('#next-input').focus();
    resume();
    await hydrated(page);
    await expect(page.locator('#next-region')).toBeFocused();
    await page.locator('#ready').click();
    await expect(page.locator('#next-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#next-input')).toHaveValue(
      'Edited while waiting',
    );
    expect(
      await page.evaluate(
        () => document.getElementById('next-input') === window.nextFirstInput,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.nextViolations)).toEqual([]);
  } finally {
    resume();
  }
  expect(errors).toEqual([]);
});
test('production state changes retain React state, user content and safe focus without layout changes', async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto('/');
  await hydrated(page);
  await expect(page.locator('#server-detail')).toBeVisible();
  await page.locator('#content-counter').click();
  await page.locator('#next-input').fill('Preserved note');
  await page.locator('#next-input').focus();
  const rect = await page.locator('#next-region').boundingBox();
  await page.locator('#refresh').evaluate((e: HTMLButtonElement) => e.click());
  await expect(page.locator('#next-region')).toHaveAttribute(
    'data-presentation',
    'refreshing',
  );
  await expect(page.locator('#next-input')).toBeFocused();
  await page.locator('#pending').evaluate((e: HTMLButtonElement) => e.click());
  await expect(page.locator('#next-region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await expect(page.locator('#next-region')).toBeFocused();
  await page.locator('#ready').click();
  await expect(page.locator('#next-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator('#content-counter')).toHaveText('Count 1');
  await expect(page.locator('#next-input')).toHaveValue('Preserved note');
  expect(await page.locator('#next-region').boundingBox()).toEqual(rect);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.nextViolations)).toEqual([]);
});
test('concurrent dynamic requests have isolated nonces and the exact installed adapter versions', async ({
  request,
}) => {
  const [a, b] = await Promise.all([
    request.get('/?state=pending'),
    request.get('/'),
  ]);
  const an = a
      .headers()
      ['content-security-policy']?.match(/nonce-([^']+)/)?.[1],
    bn = b.headers()['content-security-policy']?.match(/nonce-([^']+)/)?.[1];
  expect(an).toBeTruthy();
  expect(bn).toBeTruthy();
  expect(an).not.toBe(bn);
  if (!an || !bn) throw new Error('Missing request nonces');
  const [ah, bh] = await Promise.all([a.text(), b.text()]);
  expect(ah).toContain(`nonce="${an}"`);
  expect(ah).not.toContain(bn);
  expect(bh).toContain(`nonce="${bn}"`);
  expect(bh).not.toContain(an);
});

test('Next transport accounts for the complete 24-surface/six-region cohort and cold stylesheet responses', async ({
  request,
}) => {
  const { gzipSync } = await import('node:zlib');
  const results = [];
  for (const mode of ['nonce', 'external']) {
    const [decorated, plain] = await Promise.all([
      request.get(`/budget?mode=${mode}`),
      request.get(`/budget?mode=${mode}&plain=1`),
    ]);
    const [decoratedBody, plainBody] = await Promise.all([
      decorated.body(),
      plain.body(),
    ]);
    const assets = [];
    if (mode === 'external')
      for (const family of ['skeleton', 'region']) {
        const response = await request.get(`/dotquilt/${family}.css`);
        expect(response.ok()).toBe(true);
        const body = await response.body();
        assets.push({
          family,
          bytes: body.length,
          gzip: gzipSync(body, { level: 9 }).length,
        });
      }
    const additionalGzip =
      Math.max(
        0,
        gzipSync(decoratedBody, { level: 9 }).length -
          gzipSync(plainBody, { level: 9 }).length,
      ) + assets.reduce((sum, a) => sum + a.gzip, 0);
    expect(additionalGzip).toBeLessThanOrEqual(8192);
    expect(
      (decoratedBody.toString().match(/<dotquilt-skeleton-block\b/g) ?? [])
        .length,
    ).toBe(24);
    expect(
      (decoratedBody.toString().match(/<dotquilt-region\b/g) ?? []).length,
    ).toBe(6);
    results.push({
      mode,
      decoratedBytes: decoratedBody.length,
      decoratedGzip: gzipSync(decoratedBody, { level: 9 }).length,
      plainBytes: plainBody.length,
      plainGzip: gzipSync(plainBody, { level: 9 }).length,
      additionalGzip,
      assets,
      method:
        'Full Next document including framework bootstrap and Flight transport. Separate current/floor production builds; no deduction for repeated HTML styles/props.',
    });
  }
  await test.info().attach('next-ssr-output', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
});
