import { expect, type Page, test } from '@playwright/test';
import { catalogKeys } from './catalog';

declare global {
  interface Window {
    catalogBefore: Record<string, Element>;
  }
}
const owners = catalogKeys.map((k) =>
  k === 'text' ? '#catalog-text' : `#owner-${k}`,
);
function path(query = '') {
  return `/?catalog&line=${test.info().project.name.split('-').at(-1)}${query}`;
}
async function open(page: Page, query = '') {
  await page.setViewportSize({ width: 1100, height: 1100 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(path(query));
  await page.waitForFunction(() => !!window.catalogTest);
  await page.waitForFunction(() =>
    Object.values(window.catalogTest.refs).every((host) => {
      const link = host.shadowRoot?.querySelector<HTMLLinkElement>(
        'link[rel=stylesheet]',
      );
      return !link || !!link.sheet;
    }),
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  return errors;
}
async function phase(page: Page, value: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (selectors) =>
          selectors.map((selector) =>
            document.querySelector(selector)?.getAttribute('data-presentation'),
          ),
        owners,
      ),
    )
    .toEqual(owners.map(() => value));
}

async function quiet(page: Page) {
  expect(await page.evaluate(() => window.catalogTest.errors)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureViolations)).toEqual([]);
  await page.evaluate(() => window.destroyFixture());
  await expect
    .poll(() =>
      page.evaluate(() => ({
        frames:
          Reflect.get(document, Symbol.for('dotquilt.frames.v1')) === undefined,
        dots:
          Reflect.get(document, Symbol.for('dotquilt.dots.v1')) === undefined,
        effects: document.getAnimations().length,
      })),
    )
    .toEqual({ frames: true, dots: true, effects: 0 });
}
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const value = await page.evaluate(() => ({
    events: window.catalogTest?.events,
    errors: window.catalogTest?.errors,
    providers: window.catalogTest?.providers,
    rects: Object.fromEntries(
      Object.entries(window.catalogTest?.refs ?? {}).map(([key, node]) => [
        key,
        node.getBoundingClientRect().toJSON(),
      ]),
    ),
  }));
  await info.attach('catalog-failure-state', {
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
});
for (const mode of ['hash', 'nonce', 'external']) {
  test(`full catalog ${mode}: StrictMode hydration, property/reset commits, refs, identity and layout`, async ({
    page,
  }) => {
    const errors = await open(page, `&state=pending&mode=${mode}&early`);
    await phase(page, 'pending');
    const rects = await page.locator('#catalog').boundingBox();
    expect(
      await page.evaluate(() => Object.keys(window.catalogTest.refs).sort()),
    ).toEqual(
      [
        ...catalogKeys.filter((key) => key !== 'region'),
        ...catalogKeys
          .filter((key) => key !== 'text')
          .map((key) => `owner-${key}`),
      ].sort(),
    );
    expect(
      await page.evaluate(() =>
        Object.values(window.catalogTest.refs).every(
          (e) => typeof Reflect.get(e, 'update') === 'function',
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        Object.entries(window.catalogBefore).every(
          ([id, e]) => document.getElementById(id) === e,
        ),
      ),
    ).toBe(true);
    expect(await page.locator('#catalog').innerHTML()).not.toMatch(
      /\[object Object\]|targetProvider=|revealTargets=|preset=/,
    );
    await page.evaluate(() =>
      window.catalogTest.update({ alternate: true, presets: true }),
    );
    expect(
      await page.evaluate(() => ({
        lines: Reflect.get(window.catalogTest.refs.multiline ?? {}, 'lines'),
        count: Reflect.get(window.catalogTest.refs.typing ?? {}, 'count'),
        variant: Reflect.get(window.catalogTest.refs.chart ?? {}, 'variant'),
        rows: Reflect.get(window.catalogTest.refs.table ?? {}, 'rows'),
        height: Reflect.get(window.catalogTest.refs.table ?? {}, 'rowHeight'),
        columns: Reflect.get(
          window.catalogTest.refs.table ?? {},
          'columns',
        ).map((c: { kind: string }) => c.kind),
        text: window.catalogTest.refs.text?.textContent?.includes('Updated 42'),
      })),
    ).toEqual({
      lines: 4,
      count: 5,
      variant: 'scatter',
      rows: 3,
      height: 24,
      columns: ['badge', 'number'],
      text: true,
    });
    await page.evaluate(() =>
      window.catalogTest.update({
        alternate: false,
        presets: false,
        state: 'ready',
        duration: 0,
      }),
    );
    await phase(page, 'ready');
    expect(
      await page.evaluate(() => ({
        lines: Reflect.get(window.catalogTest.refs.multiline ?? {}, 'lines'),
        count: Reflect.get(window.catalogTest.refs.typing ?? {}, 'count'),
        variant: Reflect.get(window.catalogTest.refs.chart ?? {}, 'variant'),
        rows: Reflect.get(window.catalogTest.refs.table ?? {}, 'rows'),
      })),
    ).toEqual({ lines: 3, count: 3, variant: 'line', rows: 5 });
    expect(await page.locator('#catalog').boundingBox()).toEqual(rects);
    expect(
      await page.evaluate(() =>
        window.fixtureShifts.reduce((s, e) => s + e.value, 0),
      ),
    ).toBeLessThanOrEqual(0.01);
    expect(errors).toEqual([]);
    await quiet(page);
  });
}
test('full catalog committed callbacks, rich providers and supersession retain content and one terminal per cycle', async ({
  page,
}) => {
  const errors = await open(page, '&state=pending&mode=external');
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 1600 }),
  );
  await phase(page, 'handoff');
  await page.evaluate(() => window.catalogTest.rerender());
  await expect
    .poll(() =>
      page.evaluate(
        () => window.catalogTest.events.filter((e) => e.type === 'end').length,
      ),
    )
    .toBe(9);
  const first = await page.evaluate(() => ({
    events: window.catalogTest.events,
    providers: window.catalogTest.providers,
  }));
  expect(first.providers).toEqual({ chart: 1, table: 1 });
  for (const key of catalogKeys) {
    const events = first.events.filter((e) => e.key === key);
    expect(events.map((e) => e.type)).toEqual(['start', 'end']);
    expect(events[0]?.id).toBe(events[1]?.id);
    expect(events[1]?.revision).toBe(1);
    expect(events[1]?.reason).toBe('complete');
  }
  await page.locator('#input-table').fill('Preserved note');
  await page.locator('#input-table').focus();
  await page.evaluate(() => window.catalogTest.update({ state: 'refreshing' }));
  await phase(page, 'refreshing');
  await expect(page.locator('#input-table')).toBeFocused();
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'pending', cycle: 'next' }),
  );
  await phase(page, 'pending');
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 1600 }),
  );
  await phase(page, 'handoff');
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'pending', cycle: 'superseding' }),
  );
  await phase(page, 'pending');
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 0 }),
  );
  await phase(page, 'ready');
  await expect(page.locator('#input-table')).toHaveValue('Preserved note');
  expect(
    await page.evaluate(
      () =>
        document.getElementById('input-table') ===
        window.catalogBefore['input-table'],
    ),
  ).toBe(true);
  for (const key of catalogKeys)
    expect(
      await page.evaluate(
        (key) =>
          window.catalogTest.events
            .filter((e) => e.key === key)
            .map((e) => e.type),
        key,
      ),
    ).toEqual(['start', 'end', 'start', 'cancel', 'start', 'end']);
  expect(errors).toEqual([]);
  await quiet(page);
});
test('full catalog suspended renders cannot install uncommitted callbacks and unmount releases owned work', async ({
  page,
}) => {
  const errors = await open(page, '&state=pending&mode=nonce');
  await page.evaluate(() => window.catalogTest.suspend());
  await page.waitForTimeout(40);
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 0 }),
  );
  await phase(page, 'ready');
  expect(
    await page.evaluate(() =>
      window.catalogTest.events.every((e) => e.revision === 0),
    ),
  ).toBe(true);
  await page.evaluate(() => window.catalogTest.resume());
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'pending', cycle: 'remove' }),
  );
  await phase(page, 'pending');
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 1600 }),
  );
  await phase(page, 'handoff');
  await page.evaluate(() => window.catalogTest.remove());
  for (const key of catalogKeys)
    expect(
      await page.evaluate(
        (key) =>
          window.catalogTest.events
            .filter((e) => e.key === key)
            .map((e) => e.type),
        key,
      ),
    ).toEqual(['start', 'end', 'start', 'cancel']);
  expect(errors).toEqual([]);
  await quiet(page);
});
test('full catalog delayed hydration preserves edits and no/failed JavaScript keeps static cues and recovery', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1100, height: 1100 });
  await page.goto(path('&state=pending&delay&mode=nonce'));
  await page.waitForFunction(() => !!window.hydrateFixture);
  await page.locator('#input-chart').fill('Before hydration');
  await page.locator('#input-chart').focus();
  await page.evaluate(() => window.hydrateFixture());
  await page.waitForFunction(() => !!window.catalogTest);
  await phase(page, 'pending');
  await expect(page.locator('#owner-chart')).toBeFocused();
  await page.evaluate(() =>
    window.catalogTest.update({ state: 'ready', duration: 0 }),
  );
  await phase(page, 'ready');
  await expect(page.locator('#input-chart')).toHaveValue('Before hydration');
  await quiet(page);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  for (const state of ['ready', 'pending', 'refreshing']) {
    await noJs.goto(
      `http://127.0.0.1:4191${path(`&state=${state}&mode=external`)}`,
    );
    await expect(noJs.locator('#input-chart')).toBeVisible();
    if (state === 'pending')
      await expect(
        noJs.locator('#catalog-text [data-dotquilt-text-content]'),
      ).toBeHidden();
    await expect(noJs.locator('#catalog-text')).toContainText('0');
  }
  await noJs.locator('#catalog-recovery').click();
  await expect(noJs.getByRole('heading')).toHaveText('Account recovery');
  await context.close();
  await page.goto(path('&state=pending&fail&mode=external'));
  await expect(page.locator('#input-table')).toBeVisible();
  await expect(
    page.locator('#catalog-table [data-dotquilt-static]'),
  ).toBeVisible();
  expect(
    await page.evaluate(() => !!customElements.get('dotquilt-table-loader')),
  ).toBe(false);
});
test('full catalog streaming resolves server content and hydrates the same catalog hosts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1100, height: 1100 });
  await page.goto(`/stream${path('&state=pending&mode=nonce').slice(1)}`);
  await page.waitForFunction(() => !!window.catalogTest);
  await expect(page.locator('#streamed-detail')).toHaveText('Streamed detail');
  expect(
    await page.evaluate(() =>
      Object.entries(window.catalogBefore).every(
        ([id, e]) => document.getElementById(id) === e,
      ),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await quiet(page);
});

test('real text width and typography changes still invalidate a moving captured plan', async ({
  page,
}) => {
  for (const className of ['geometry-step', 'typography-step']) {
    const errors = await open(page, '&state=pending&mode=external');
    await page.evaluate(() =>
      window.catalogTest.update({ state: 'ready', duration: 1600 }),
    );
    await phase(page, 'handoff');
    await page
      .locator('#catalog-text')
      .evaluate((node, className) => node.classList.add(className), className);
    await expect(page.locator('#catalog-text')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(
        () =>
          window.catalogTest.events.find(
            (e) => e.key === 'text' && e.type === 'end',
          )?.reason,
      ),
    ).toBe('geometry-changed');
    expect(errors).toEqual([]);
    await quiet(page);
  }
});

for (const mode of ['hash', 'nonce', 'external']) {
  test(`painter attribute ${mode}: immutable null, empty and string hydration snapshots`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (event) => {
      if (event.type() === 'error') errors.push(event.text());
    });
    for (const initial of [
      [null, ''],
      ['paint-"&-before', 'table-before'],
    ]) {
      await page.goto(path(`&state=pending&early&delay&mode=${mode}`));
      await page.waitForFunction(
        () =>
          !!window.hydrateFixture &&
          !!document.querySelector('#catalog-chart')?.shadowRoot &&
          !!document.querySelector('#catalog-table')?.shadowRoot,
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      await page.evaluate((values) => {
        for (const [index, id] of [
          'catalog-chart',
          'catalog-table',
        ].entries()) {
          const host = document.getElementById(id);
          const value = values[index];
          if (!host || value === undefined)
            throw new Error('Missing painter fixture');
          if (value === null) host.removeAttribute('data-custom');
          else host.setAttribute('data-custom', value);
        }
        window.hydrateFixture();
      }, initial);
      await page.waitForFunction(() => !!window.catalogTest);
      const result = await page.evaluate(() => {
        const chart = window.catalogTest.refs.chart,
          table = window.catalogTest.refs.table;
        if (!chart || !table) throw new Error('Missing painter refs');
        const hosts = [chart, table];
        const original = hosts.map((host) => Reflect.get(host, 'update'));
        const observers = hosts.map(() => new MutationObserver(() => {}));
        const calls = [0, 0];
        try {
          hosts.forEach((host, i) => {
            host.setAttribute('data-custom', `native-after-${i}`);
            // Isolate React's commit from queued/native presentation changes for
            // one commit; the full catalog tests separately execute native updates.
            Reflect.set(host, 'update', () => {
              calls[i] = (calls[i] ?? 0) + 1;
            });
            const observer = observers[i];
            if (!observer) throw new Error('Missing attribute observer');
            observer.observe(host, {
              attributes: true,
              attributeFilter: ['data-custom'],
            });
          });
          window.catalogTest.rerender();
          return {
            calls,
            values: hosts.map((host) => host.getAttribute('data-custom')),
            writes: observers.map((observer) => observer.takeRecords().length),
          };
        } finally {
          hosts.forEach((host, i) => {
            Reflect.set(host, 'update', original[i]);
          });
          observers.forEach((observer) => {
            observer.disconnect();
          });
        }
      });
      expect(result).toEqual({
        calls: [1, 1],
        values: ['native-after-0', 'native-after-1'],
        writes: [0, 0],
      });
      expect(errors).toEqual([]);
      await quiet(page);
    }
  });
}
