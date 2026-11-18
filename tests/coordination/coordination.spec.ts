import { expect, type Page, test } from '@playwright/test';

interface Coordination {
  events: { id: string; type: string; reason?: string }[];
  errors: { id: string; code: string }[];
  patch(id: string, patch: object): void;
  identity(): boolean;
  clicks(): number;
  remove(): void;
  saturate(): void;
}
declare global {
  interface Window {
    coordination: Coordination;
  }
}
async function patch(page: Page, id: string, value: object) {
  await page.evaluate(({ id, value }) => window.coordination.patch(id, value), {
    id,
    value,
  });
}
async function open(page: Page, framework: string) {
  await page.clock.install();
  await page.goto(`/${framework}`);
  await page.waitForFunction(() => !!window.coordination);
  await page.clock.runFor(100);
}
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    const violations: string[] = [];
    Reflect.set(window, 'coordinationCSP', violations);
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(event.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) return;
  expect(pageErrors.get(page)).toEqual([]);
  expect(
    await page.evaluate(() => Reflect.get(window, 'coordinationCSP')),
  ).toEqual([]);
  await page.evaluate(() => window.coordination.remove());
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
    ),
  ).toBeUndefined();
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toBeUndefined();
});

const presentation = (page: Page, id: string, value: string) =>
  expect(page.locator(`#${id}`)).toHaveAttribute('data-presentation', value);
for (const framework of ['native', 'react']) {
  test(`${framework}: independent nested rich regions do not form a readiness barrier`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(80);
    await presentation(page, 'parent', 'ready');
    await presentation(page, 'chart-region', 'pending');
    await presentation(page, 'table-region', 'pending');
    await presentation(page, 'text', 'pending');
    await patch(page, 'chart-region', { state: 'ready' });
    await patch(page, 'table-region', { state: 'ready' });
    await patch(page, 'text', { state: 'ready' });
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'handoff');
    await presentation(page, 'table-region', 'handoff');
    await presentation(page, 'peer', 'pending');
    expect(
      await page.locator('#chart').locator('[data-dotquilt-painter]').count(),
    ).toBe(1);
    expect(
      await page.locator('#table').locator('[data-dotquilt-painter]').count(),
    ).toBe(1);
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(1);
    await page.locator('#table-button').focus();
    await presentation(page, 'table-region', 'ready');
    await presentation(page, 'chart-region', 'handoff');
    await page.clock.runFor(1000);
    await presentation(page, 'chart-region', 'ready');
    await presentation(page, 'text', 'ready');
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
    await page.locator('#keep').click();
    expect(await page.evaluate(() => window.coordination.clicks())).toBe(1);
    expect(await page.evaluate(() => window.coordination.errors)).toEqual([]);
  });
  test(`${framework}: a nested content edit does not invalidate an unrelated parent plan`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready' });
    await page.clock.runFor(80);
    await presentation(page, 'parent', 'handoff');
    await page.evaluate(() => {
      (document.getElementById('row-a') as HTMLElement).textContent =
        'Updated child outcome';
    });
    await page.clock.runFor(40);
    await presentation(page, 'parent', 'handoff');
    await presentation(page, 'table-region', 'pending');
    await page.locator('#parent').evaluate((el) => {
      for (const animation of el.shadowRoot
        ?.querySelector('[part=placeholder]')
        ?.getAnimations() ?? [])
        animation.finish();
    });
    await presentation(page, 'parent', 'ready');
    expect(
      await page.evaluate(() =>
        window.coordination.events.filter((e) => e.id === 'parent'),
      ),
    ).toEqual([
      expect.objectContaining({ type: 'dotquilt-handoff-start' }),
      expect.objectContaining({
        type: 'dotquilt-handoff-end',
        reason: 'complete',
      }),
    ]);
  });
}
for (const framework of ['native', 'react']) {
  test(`${framework}: nested removal settles only its owner and preserves peer progress`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready' });
    await page.clock.runFor(80);
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'handoff');
    await page.evaluate(() => document.getElementById('chart')?.remove());
    await page.clock.runFor(40);
    await presentation(page, 'chart-region', 'ready');
    await presentation(page, 'parent', 'handoff');
    expect(
      await page.evaluate(
        () =>
          window.coordination.events
            .filter((e) => e.id === 'chart-region')
            .at(-1)?.reason,
      ),
    ).toBe('geometry-changed');
    await page.clock.runFor(1000);
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
  test(`${framework}: direct supplied-content changes still invalidate the parent plan`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready' });
    await page.clock.runFor(80);
    await presentation(page, 'parent', 'handoff');
    await page.evaluate(() =>
      document
        .getElementById('parent-content')
        ?.append(document.createTextNode('New application content')),
    );
    await page.clock.runFor(40);
    await presentation(page, 'parent', 'ready');
    expect(
      await page.evaluate(
        () =>
          window.coordination.events.filter((e) => e.id === 'parent').at(-1)
            ?.reason,
      ),
    ).toBe('geometry-changed');
  });
  test(`${framework}: supersession cancels once without disturbing another rich region`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await patch(page, 'chart-region', { state: 'ready' });
    await patch(page, 'table-region', { state: 'ready' });
    await page.clock.runFor(60);
    await patch(page, 'chart-region', { state: 'pending', cycle: 'new' });
    await presentation(page, 'table-region', 'handoff');
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'pending');
    await patch(page, 'chart-region', {
      state: 'ready',
      timing: { duration: 0 },
    });
    await page.clock.runFor(1000);
    expect(
      await page.evaluate(() =>
        window.coordination.events
          .filter((e) => e.id === 'chart-region')
          .map((e) => [e.type, e.reason]),
      ),
    ).toEqual([
      ['dotquilt-handoff-start', undefined],
      ['dotquilt-handoff-cancel', 'superseded'],
      ['dotquilt-handoff-start', undefined],
      ['dotquilt-handoff-end', 'immediate'],
    ]);
    expect(
      await page.evaluate(() =>
        window.coordination.events
          .filter((e) => e.id === 'table-region')
          .map((e) => e.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
  test(`${framework}: a parent cannot claim a nested region's explicit reveal targets`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await page.evaluate(() =>
      window.coordination.patch('chart-region', {
        revealTargets: [
          { id: 'foreign', element: document.getElementById('row-a') },
        ],
      }),
    );
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'ready');
    await presentation(page, 'table-region', 'pending');
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    expect(
      await page.evaluate(() => window.coordination.errors),
    ).toContainEqual({ id: 'chart-region', code: 'animation-failed' });
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
  test(`${framework}: captured target recycling settles only its owning table`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready' });
    await page.clock.runFor(60);
    await patch(page, 'table-region', { state: 'ready' });
    await page.clock.runFor(60);
    await presentation(page, 'table-region', 'handoff');
    await page.evaluate(() =>
      document
        .getElementById('chart-content')
        ?.append(document.getElementById('row-a') as HTMLElement),
    );
    await page.clock.runFor(40);
    await presentation(page, 'table-region', 'ready');
    await presentation(page, 'parent', 'handoff');
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
  test(`${framework}: removal cancels all committed owners and releases the shared engine`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready' });
    await page.clock.runFor(50);
    for (const id of ['chart-region', 'table-region', 'text', 'peer'])
      await patch(page, id, { state: 'ready' });
    await page.clock.runFor(50);
    const committed = await page.evaluate(() =>
      [...document.querySelectorAll('dotquilt-region,dotquilt-text-loader')]
        .filter((el) => el.getAttribute('data-presentation') === 'handoff')
        .map((el) => el.id),
    );
    expect(committed).toEqual(
      expect.arrayContaining([
        'parent',
        'chart-region',
        'table-region',
        'peer',
      ]),
    );
    await page.evaluate(() => window.coordination.remove());
    await page.clock.runFor(5000);
    const result = await page.evaluate(() => ({
      ledger: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      animations: document.getAnimations().length,
      events: window.coordination.events,
    }));
    expect(result.ledger).toBeUndefined();
    expect(result.frames).toBeUndefined();
    expect(result.animations).toBe(0);
    for (const id of committed) {
      const events = result.events.filter((e) => e.id === id);
      expect(events.map((e) => e.type)).toEqual([
        'dotquilt-handoff-start',
        'dotquilt-handoff-cancel',
      ]);
      expect(events[1]?.reason).toBe('removed');
    }
  });
  test(`${framework}: inserted placeholders use their nearest owner and stop with that owner`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await page.evaluate(() => {
      const source = document.getElementById('block') as HTMLElement;
      const placeholder = document.getElementById('chart')?.parentElement;
      placeholder?.append(source);
    });
    await page.clock.runFor(50);
    expect(
      await page
        .locator('#block')
        .evaluate((el) => Reflect.get(el, 'owner')?.id),
    ).toBe('chart-region');
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(50);
    await expect(page.locator('#block')).not.toHaveAttribute('data-moving');
    await presentation(page, 'table-region', 'pending');
    await page.clock.runFor(1000);
    await expect(page.locator('#chart-button')).toBeVisible();
  });
}
for (const framework of ['native', 'react']) {
  test(`${framework}: parent replacement restricts nested work without changing child readiness`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(80);
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(60);
    await presentation(page, 'chart-region', 'handoff');
    await patch(page, 'parent', { state: 'pending', cycle: 'replacement' });
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'ready');
    await presentation(page, 'parent', 'pending');
    expect(
      await page.locator('#table').evaluate((el) => ({
        moving: el.hasAttribute('data-moving'),
        visibility: getComputedStyle(el).visibility,
      })),
    ).toEqual({ moving: false, visibility: 'hidden' });
    expect(
      await page
        .locator('#parent')
        .evaluate(
          (el) =>
            el.shadowRoot?.querySelector<HTMLElement>('[part=content]')?.inert,
        ),
    ).toBe(true);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(80);
    await presentation(page, 'chart-region', 'ready');
    expect(
      await page.evaluate(() =>
        window.coordination.events
          .filter((e) => e.id === 'chart-region')
          .map((e) => e.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  });
  test(`${framework}: deeper independent regions retain their own content and target boundaries`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await page.evaluate(() =>
      document
        .getElementById('chart-content')
        ?.append(document.getElementById('table-region') as HTMLElement),
    );
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(70);
    await presentation(page, 'chart-region', 'handoff');
    await page.evaluate(() => {
      (document.getElementById('row-b') as HTMLElement).textContent =
        'Nested update';
    });
    await page.clock.runFor(50);
    await presentation(page, 'chart-region', 'ready');
    expect(
      await page.evaluate(
        () =>
          window.coordination.events
            .filter((e) => e.id === 'chart-region')
            .at(-1)?.reason,
      ),
    ).toBe('geometry-changed');
    await presentation(page, 'table-region', 'pending');
    expect(
      await page
        .locator('#table')
        .evaluate((el) => Reflect.get(el, 'owner')?.id),
    ).toBe('table-region');
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
  test(`${framework}: synchronous cross-region handlers cannot resurrect superseded work`, async ({
    page,
  }) => {
    await open(page, framework);
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await page.evaluate(() =>
      document.getElementById('chart-region')?.addEventListener(
        'dotquilt-handoff-start',
        () => {
          window.coordination.patch('chart-region', {
            state: 'pending',
            cycle: 'handler',
          });
          window.coordination.patch('table-region', { state: 'ready' });
        },
        { once: true },
      ),
    );
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(100);
    await presentation(page, 'chart-region', 'pending');
    await presentation(page, 'table-region', 'handoff');
    await page.clock.runFor(1000);
    await presentation(page, 'chart-region', 'pending');
    expect(
      await page.evaluate(() =>
        window.coordination.events
          .filter((e) => e.id === 'chart-region')
          .map((e) => e.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-cancel']);
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
}
for (const framework of ['native', 'react']) {
  test(`${framework}: simultaneous regions share document caps and release saturated reservations`, async ({
    page,
  }, info) => {
    await open(page, framework);
    await page.evaluate(() => window.coordination.saturate());
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger'))?.dots,
        ),
      )
      .toBe(16384);
    await page.clock.runFor(80);
    const peak = await page.evaluate(() => ({
      ledger: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      perHost: [...document.querySelectorAll('[data-dotquilt-surface]')].map(
        (el) =>
          el.shadowRoot?.querySelectorAll('[data-dotquilt-painter] circle')
            .length ?? 0,
      ),
      errors: window.coordination.errors,
    }));
    expect(peak.ledger.dots).toBe(16384);
    expect(peak.perHost.every((count) => count <= 4096)).toBe(true);
    expect(
      peak.errors.some((error) => error.code === 'document-dot-limit'),
    ).toBe(true);
    await info.attach('bounded-resource-inspection', {
      body: JSON.stringify(peak),
      contentType: 'application/json',
    });
    await patch(page, 'peer', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(50);
    await presentation(page, 'peer', 'ready');
    await expect(page.locator('#peer-button')).toBeVisible();
    await page.evaluate(() => window.coordination.remove());
    await page.clock.runFor(100);
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      ),
    ).toBeUndefined();
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      ),
    ).toBeUndefined();
  });
}
for (const framework of ['native', 'react']) {
  test(`${framework}: hidden independent children do not spend or rearm another owner's motion window`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.clock.runFor(4200);
    expect(
      await page
        .locator('#table-region')
        .evaluate((el) => Reflect.get(el, 'activity').started),
    ).toBeUndefined();
    expect(
      await page
        .locator('#chart-region')
        .evaluate((el) => Reflect.get(el, 'activity').started),
    ).toBeUndefined();
    await patch(page, 'parent', { state: 'ready', timing: { duration: 0 } });
    await page.clock.runFor(80);
    await expect(page.locator('#table')).toHaveAttribute('data-moving');
    await patch(page, 'chart-region', { state: 'ready' });
    await page.clock.runFor(60);
    await presentation(page, 'chart-region', 'handoff');
    expect(
      await page
        .locator('#chart-region')
        .evaluate((el) => Reflect.get(el, 'activity').started),
    ).toBeGreaterThan(0);
    await page.clock.runFor(1100);
    await presentation(page, 'chart-region', 'ready');
    await presentation(page, 'table-region', 'pending');
    expect(await page.evaluate(() => window.coordination.identity())).toBe(
      true,
    );
  });
}
