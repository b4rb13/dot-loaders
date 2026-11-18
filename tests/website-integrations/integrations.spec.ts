import { expect, type Page, test } from '@playwright/test';

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
async function violations(page: Page) {
  await page.addInitScript(() => {
    const list: string[] = [];
    Object.assign(window, { guideViolations: list });
    document.addEventListener('securitypolicyviolation', (event) =>
      list.push(`${event.violatedDirective}:${event.blockedURI}`),
    );
  });
}
const apps = [
  {
    name: 'react-ssr',
    origin: 'http://127.0.0.1:4233',
    modes: ['external', 'nonce', 'hash'],
  },
  {
    name: 'next-app',
    origin: 'http://127.0.0.1:4234',
    modes: ['external', 'nonce'],
  },
] as const;
for (const app of apps)
  for (const mode of app.modes) {
    const url = `${app.origin}/?mode=${mode}`;
    test(`${app.name}/${mode}: enforced CSP, hydration, refresh and stable application nodes`, async ({
      page,
    }) => {
      const errors = watch(page);
      await violations(page);
      const response = await page.goto(url);
      expect(response?.headers()['content-security-policy']).toContain(
        "style-src-attr 'none'",
      );
      expect(response?.headers()['content-security-policy']).not.toMatch(
        /unsafe-inline|unsafe-eval/,
      );
      await expect(
        page.getByRole('button', { name: 'Load replacement', exact: true }),
      ).toBeEnabled();
      await page.locator('#note').fill('Keep this input');
      await page.getByRole('button', { name: 'Count 0', exact: true }).click();
      await page
        .locator('#note')
        .evaluate((el) => Object.assign(window, { guideInput: el }));
      await page
        .getByRole('button', { name: 'Refresh content', exact: true })
        .click();
      await expect(page.locator('#account')).toHaveAttribute(
        'data-presentation',
        'refreshing',
      );
      await expect(page.locator('#note')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Count 1', exact: true }),
      ).toBeVisible();
      const owner = await page.locator('#account').getAttribute('cycle');
      await page
        .getByRole('button', { name: 'Pause motion', exact: true })
        .click();
      expect(await page.locator('#account').getAttribute('cycle')).toBe(owner);
      await page
        .getByRole('button', { name: 'Show outcome', exact: true })
        .click();
      await expect(page.locator('#account')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      await expect(page.locator('#note')).toHaveValue('Keep this input');
      expect(
        await page
          .locator('#note')
          .evaluate(
            (el) =>
              el === (window as unknown as { guideInput: Element }).guideInput,
          ),
      ).toBe(true);
      await page
        .getByRole('button', { name: 'Load replacement', exact: true })
        .click();
      await expect(page.locator('#account')).toHaveAttribute(
        'data-presentation',
        'pending',
      );
      await expect(page.locator('#note')).toBeHidden();
      await page
        .getByRole('button', { name: 'Show outcome', exact: true })
        .click();
      await expect(page.locator('#note')).toBeVisible();
      if (app.name === 'next-app')
        await expect(page.locator('#server-detail')).toHaveText(
          'Deferred account detail from the server',
        );
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { guideViolations: string[] })
              .guideViolations,
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
    });
    test(`${app.name}/${mode}: pending SSR is guarded before hydration and preserves input identity`, async ({
      page,
    }) => {
      await violations(page);
      const errors = watch(page);
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/*.js', async (route) => {
        await held;
        await route.continue();
      });
      try {
        await page.goto(`${url}&state=pending`, { waitUntil: 'commit' });
        await expect(page.locator('#note')).toBeAttached();
        await expect(page.locator('#note')).toBeHidden();
        await expect(
          page.getByRole('button', { name: 'Load replacement', exact: true }),
        ).toBeDisabled();
        await expect(page.locator('#recovery')).toBeVisible();
        await page
          .locator('#note')
          .evaluate((el) => Object.assign(window, { guideBefore: el }));
        release();
        await expect(
          page.getByRole('button', { name: 'Show outcome', exact: true }),
        ).toBeEnabled();
        await page
          .getByRole('button', { name: 'Show outcome', exact: true })
          .click();
        await expect(page.locator('#note')).toBeVisible();
        expect(
          await page
            .locator('#note')
            .evaluate(
              (el) =>
                el ===
                (window as unknown as { guideBefore: Element }).guideBefore,
            ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () =>
              (window as unknown as { guideViolations: string[] })
                .guideViolations,
          ),
        ).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        release();
      }
    });
    test(`${app.name}/${mode}: no-JavaScript ready/pending recovery is useful`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`${url}&state=pending`);
        await expect(page.locator('#note')).toBeHidden();
        await expect(page.locator('#recovery')).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Load replacement', exact: true }),
        ).toBeDisabled();
        await page.locator('#recovery').click();
        await expect(page.locator('#note')).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Load replacement', exact: true }),
        ).toBeDisabled();
      } finally {
        await context.close();
      }
    });
  }
for (const mode of ['external', 'nonce'])
  test(`next-app/${mode}: client navigation preserves original document policy`, async ({
    page,
  }) => {
    const errors = watch(page);
    await violations(page);
    await page.goto(`http://127.0.0.1:4234/?mode=${mode}`);
    await expect(
      page.getByRole('button', { name: 'Load replacement', exact: true }),
    ).toBeEnabled();
    const policy = await page.locator('#account').evaluate((el) => ({
      nonce:
        (el.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
          ?.nonce ?? '',
      href: el.shadowRoot?.querySelector('link')?.getAttribute('href') ?? '',
    }));
    await page.locator('#navigate').click();
    await expect(page.locator('h1')).toHaveText('Another server account');
    await expect(
      page.getByRole('button', { name: 'Load replacement', exact: true }),
    ).toBeEnabled();
    const next = await page.locator('#account').evaluate((el) => ({
      nonce:
        (el.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
          ?.nonce ?? '',
      href: el.shadowRoot?.querySelector('link')?.getAttribute('href') ?? '',
    }));
    expect(next).toEqual(policy);
    expect(
      mode === 'nonce' ? next.nonce.length : next.href.length,
    ).toBeGreaterThan(0);
    await page
      .getByRole('button', { name: 'Load replacement', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Show outcome', exact: true })
      .click();
    await expect(page.locator('#note')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { guideViolations: string[] }).guideViolations,
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
for (const app of apps)
  test(`${app.name}: concurrent requests reject supplied nonce and isolate response credentials`, async ({
    request,
  }) => {
    const responses = await Promise.all([
      request.get(`${app.origin}/?mode=nonce`, {
        headers: { 'x-nonce': 'visitor-supplied' },
      }),
      request.get(`${app.origin}/?mode=nonce`),
    ]);
    const nonces = responses.map(
      (r) =>
        r.headers()['content-security-policy']?.match(/nonce-([^']+)/)?.[1],
    );
    expect(nonces[0]).toBeTruthy();
    expect(nonces[1]).toBeTruthy();
    expect(nonces[0]).not.toBe(nonces[1]);
    expect(nonces).not.toContain('visitor-supplied');
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response) throw new Error('Missing response');
      const html = await response.text();
      expect(html).toContain(`nonce="${nonces[i]}"`);
      expect(response.headers()['cache-control']).toContain('no-store');
    }
  });
