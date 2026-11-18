import { expect, type Page, test } from '@playwright/test';

interface Observations {
  calls: { chart: number; table: number };
  events: {
    owner: string;
    type: string;
    handoffId: string;
    animation?: string;
    reason?: string;
  }[];
  errors: string[];
}
async function observations(page: Page): Promise<Observations> {
  return JSON.parse(
    (await page.locator('#observations').textContent()) ?? '{}',
  );
}
async function open(page: Page, integration: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:4236/?integration=${integration}`);
  await expect(page.locator('#load')).toBeEnabled();
  return errors;
}
async function reveal(page: Page) {
  await page.locator('#load').click();
  await expect(page.locator('#report-owner')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.locator('#reveal').click();
  await expect(page.locator('#report-owner')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
}
for (const integration of ['native', 'react']) {
  for (const variant of ['line', 'bar', 'scatter'])
    test(`${integration}/${variant}: semantic chart and table share one moving handoff`, async ({
      page,
    }) => {
      const errors = await open(page, integration);
      await page.locator('#variant').selectOption(variant);
      await page.locator('#note').fill('Retain this report note');
      await page
        .locator('#note')
        .evaluate((el) => Object.assign(window, { semanticNote: el }));
      await reveal(page);
      const data = await observations(page);
      expect(data.calls).toEqual({ chart: 1, table: 1 });
      const outer = data.events.filter((e) => e.owner === 'report-owner');
      expect(outer.map((e) => e.type)).toEqual([
        'dotquilt-handoff-start',
        'dotquilt-handoff-end',
      ]);
      expect(outer[0]?.animation).toBe('dotquilt/coordinated');
      expect(outer[0]?.handoffId).toBe(outer[1]?.handoffId);
      await expect(page.locator('#note')).toHaveValue(
        'Retain this report note',
      );
      expect(
        await page
          .locator('#note')
          .evaluate(
            (el) =>
              el ===
              (window as unknown as { semanticNote: Element }).semanticNote,
          ),
      ).toBe(true);
      await expect(
        page.getByRole('table', { name: 'Illustrative project status' }),
      ).toBeVisible();
      expect(data.errors).toEqual([]);
      expect(errors).toEqual([]);
    });
  for (const mode of [
    'retry',
    'unavailable',
    'invalid',
    'throw',
    'missing-row',
    'international',
  ])
    test(`${integration}/${mode}: unavailable semantics settle without replacing real content`, async ({
      page,
    }) => {
      const errors = await open(page, integration);
      await page.locator('#mode').selectOption(mode);
      await reveal(page);
      const data = await observations(page);
      const chart = mode === 'retry' || mode === 'unavailable' ? 2 : 1;
      const table =
        mode === 'retry' || mode === 'unavailable' || mode === 'international'
          ? 2
          : 1;
      expect(data.calls).toEqual({ chart, table });
      await expect(page.locator('#note')).toBeVisible();
      await expect(page.locator('#report-table tbody tr')).toHaveCount(3);
      if (mode === 'international')
        await expect(page.locator('#report-table tbody')).toContainText(
          'Café 東京',
        );
      if (mode === 'invalid' || mode === 'throw')
        expect(
          data.errors.some((code) => code.includes('invalid-geometry')),
        ).toBe(true);
      else expect(data.errors).toEqual([]);
      expect(errors).toEqual([]);
    });
  test(`${integration}: explicit owner definition skips child provider sampling`, async ({
    page,
  }) => {
    await open(page, integration);
    await page.locator('#override').check();
    await reveal(page);
    const data = await observations(page);
    expect(data.calls).toEqual({ chart: 0, table: 0 });
    expect(
      data.events.find((e) => e.type === 'dotquilt-handoff-start')?.animation,
    ).toBe('examples/report-wrapper');
  });
  test(`${integration}: nested detail keeps its independent cycle across outer loading`, async ({
    page,
  }) => {
    await open(page, integration);
    await page.locator('#detail-load').click();
    await expect(page.locator('#detail-owner')).toHaveAttribute(
      'state',
      'pending',
    );
    const cycle = await page.locator('#detail-owner').getAttribute('cycle');
    await reveal(page);
    await expect(page.locator('#detail-owner')).toHaveAttribute(
      'state',
      'pending',
    );
    expect(await page.locator('#detail-owner').getAttribute('cycle')).toBe(
      cycle,
    );
    await page.locator('#detail-ready').click();
    await expect(page.locator('#detail-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#detail-owner')).toContainText(
      'Report detail available',
    );
  });
  test(`${integration}: recycled targets settle captured effects and retain the note`, async ({
    page,
  }) => {
    await open(page, integration);
    await page.locator('#note').fill('Stable content');
    await page.locator('#load').click();
    await page.locator('#reveal').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.locator('#recycle').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#note')).toHaveValue('Stable content');
    expect(
      (await observations(page)).events.some(
        (e) =>
          e.type === 'dotquilt-handoff-end' && e.reason === 'targets-changed',
      ),
    ).toBe(true);
    const rows = await page
      .locator('#report-table tbody tr')
      .evaluateAll((elements) =>
        elements.map((el) => ({
          hidden: el.hasAttribute('hidden'),
          inert: el.hasAttribute('inert'),
          style: el.getAttribute('style'),
          animations: el.getAnimations().length,
        })),
      );
    expect(
      rows.every(
        (row) => !row.hidden && !row.inert && !row.style && !row.animations,
      ),
    ).toBe(true);
  });
  test(`${integration}: superseding load retains one terminal event per captured handoff`, async ({
    page,
  }) => {
    await open(page, integration);
    await page.locator('#load').click();
    await page.locator('#reveal').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.locator('#load').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'pending',
    );
    await page.locator('#reveal').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    const events = (await observations(page)).events.filter(
      (e) => e.owner === 'report-owner',
    );
    const starts = events.filter((e) => e.type === 'dotquilt-handoff-start');
    expect(starts).toHaveLength(2);
    for (const start of starts)
      expect(
        events.filter(
          (e) =>
            e.handoffId === start.handoffId &&
            e.type !== 'dotquilt-handoff-start',
        ),
      ).toHaveLength(1);
  });
  test(`${integration}: visitor pause covers both owners and bounds setup reads`, async ({
    page,
  }) => {
    await open(page, integration);
    await page.locator('#pause').click();
    await expect(page.locator('#pause')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await reveal(page);
    expect((await observations(page)).calls).toEqual({ chart: 1, table: 1 });
    expect(
      (await observations(page)).events.some(
        (event) => event.reason === 'immediate',
      ),
    ).toBe(true);
    await page.locator('#detail-load').click();
    await page.locator('#detail-ready').click();
    await expect(page.locator('#detail-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
  });
  test(`${integration}: reduced motion keeps meaningful content and settles without moving handoff`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, integration);
    await reveal(page);
    expect((await observations(page)).calls).toEqual({ chart: 1, table: 1 });
    expect(
      (await observations(page)).events.some(
        (event) => event.reason === 'immediate',
      ),
    ).toBe(true);
    await expect(page.locator('figcaption')).toContainText('20%');
  });
  test(`${integration}: static content and disabled controls survive without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4236/?integration=${integration}`);
      await expect(page.locator('#load')).toBeDisabled();
      await expect(page.locator('#note')).toBeVisible();
      await expect(
        page.getByRole('table', { name: 'Illustrative project status' }),
      ).toBeVisible();
      await expect(
        page.getByRole('img', { name: 'Illustrative usage trend' }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
  test(`${integration}: cold required-style failure leaves report ready`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      await context.route('**/dotquilt/table.css', (route) => route.abort());
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4236/?integration=${integration}`);
      await expect(page.locator('#load')).toBeDisabled();
      await expect(page.locator('#note')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Reload the ready report' }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
}
