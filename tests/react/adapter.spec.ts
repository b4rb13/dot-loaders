import { expect, type Page, test } from '@playwright/test';
import './fixture';

function path(extra = '') {
  return `/?line=${test.info().project.name.split('-').at(-1) ?? 'current'}${extra}`;
}
async function open(page: Page, extra = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(path(extra));
  await page.waitForFunction(() => window.fixtureHydrated);
  return errors;
}
async function phase(page: Page, value: string) {
  await expect(page.locator('#react-region')).toHaveAttribute(
    'data-presentation',
    value,
  );
}
async function update(
  page: Page,
  patch: Parameters<Window['fixture']['update']>[0],
) {
  await page.evaluate((patch) => window.fixture.update(patch), patch);
}

for (const mode of ['hash', 'nonce', 'external']) {
  test(`packed hydration preserves input, refs, geometry and strict ${mode} CSP`, async ({
    page,
  }) => {
    const errors = await open(page, `&state=pending&mode=${mode}&early`);
    await phase(page, 'pending');
    const result = await page.evaluate(() => ({
      same: document.getElementById('preserved-input') === window.beforeInput,
      refs: window.fixtureRefs.filter((r) => r.node).every((r) => r.hasUpdate),
      richAttributes: document
        .getElementById('react-region')
        ?.outerHTML.match(
          /\[object Object\]|animations=|style-policy=|revealtargets=/g,
        ),
      rects: Object.fromEntries(
        ['before', 'react-region', 'after'].map((id) => {
          const r = document.getElementById(id)?.getBoundingClientRect();
          if (!r) throw new Error(`Missing geometry: ${id}`);
          return [id, { x: r.x, y: r.y, width: r.width, height: r.height }];
        }),
      ),
      before: window.beforeRects,
      rawShifts: window.fixtureShifts,
      errors: window.fixtureErrors,
      violations: window.fixtureViolations,
      shifts: window.fixtureShifts.reduce((sum, s) => sum + s.value, 0),
      styles: [
        ...document.querySelectorAll(
          'dotquilt-region, dotquilt-skeleton-block',
        ),
      ].map(
        (e) =>
          (e.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
            ?.nonce ??
          e.shadowRoot?.querySelector('link')?.getAttribute('href') ??
          '',
      ),
    }));
    await test.info().attach(`hydration-layout-${mode}`, {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });
    expect(result.same).toBe(true);
    expect(result.refs).toBe(true);
    expect(result.richAttributes).toBeNull();
    expect(result.rects).toEqual(result.before);
    expect(result.shifts).toBeLessThanOrEqual(0.01);
    expect(result.errors).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(errors).toEqual([]);
    if (mode === 'nonce')
      expect(result.styles.every((s) => s === 'react-fixture')).toBe(true);
    if (mode === 'external')
      expect(result.styles.every((s) => s.startsWith('/pkg/react/dist/'))).toBe(
        true,
      );
    await update(page, { state: 'ready', duration: 0 });
    await phase(page, 'ready');
    await expect(page.locator('#preserved-input')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.getElementById('preserved-input') === window.beforeInput,
      ),
    ).toBe(true);
  });
}

test('no JavaScript and missing enhancement retain static pending cues and usable server content', async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto(`http://127.0.0.1:4191${path('&state=pending')}`);
  await expect(noJs.locator('#preserved-input')).toBeVisible();
  await expect(noJs.locator('[data-dotquilt-static]')).toBeVisible();
  await noJs.locator('#preserved-input').fill('Without JavaScript');
  await noJs.locator('#recovery').click();
  await expect(noJs.getByRole('heading')).toHaveText('Account recovery');
  await context.close();
  await page.goto(path('&state=pending&fail'));
  await expect(page.locator('#preserved-input')).toBeVisible();
  await expect(page.locator('[data-dotquilt-static]')).toBeVisible();
  expect(
    await page.evaluate(() => customElements.get('dotquilt-region')),
  ).toBeUndefined();
  await page.locator('#recovery').click();
  await expect(page.getByRole('heading')).toHaveText('Account recovery');
});

test('delayed enhancement respects edited input and moves replacement focus safely', async ({
  page,
}) => {
  await page.goto(path('&state=pending&delay&mode=nonce'));
  await page.waitForFunction(() => !!window.hydrateFixture);
  await page.locator('#preserved-input').fill('Edited before hydration');
  await page.locator('#preserved-input').focus();
  await page.evaluate(() => window.hydrateFixture());
  await page.waitForFunction(() => window.fixtureHydrated);
  await phase(page, 'pending');
  await expect(page.locator('#react-region')).toBeFocused();
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  await expect(page.locator('#preserved-input')).toHaveValue(
    'Edited before hydration',
  );
  expect(
    await page.evaluate(
      () => document.getElementById('preserved-input') === window.beforeInput,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.fixtureErrors)).toEqual([]);
});

test('refresh preserves focus, local React state and node identity; replacement hides access safely', async ({
  page,
}) => {
  const errors = await open(page);
  await page.locator('#counter').click();
  await expect(page.locator('#counter')).toHaveText('Count 1');
  await page.locator('#preserved-input').fill('Keep my note');
  await page.locator('#preserved-input').focus();
  await update(page, { state: 'refreshing' });
  await phase(page, 'refreshing');
  await expect(page.locator('#preserved-input')).toBeFocused();
  await expect(page.locator('#preserved-input')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const content = document
        .getElementById('react-region')
        ?.shadowRoot?.querySelector('.c');
      if (!(content instanceof HTMLElement))
        throw new Error('Missing native content wrapper');
      return content.inert;
    }),
  ).toBe(false);
  await update(page, { state: 'pending', cycle: 'replacement' });
  await phase(page, 'pending');
  await expect(page.locator('#react-region')).toBeFocused();
  await expect(page.locator('#preserved-input')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const content = document
        .getElementById('react-region')
        ?.shadowRoot?.querySelector('.c');
      if (!(content instanceof HTMLElement))
        throw new Error('Missing native content wrapper');
      return content.inert;
    }),
  ).toBe(true);
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  await expect(page.locator('#counter')).toHaveText('Count 1');
  await expect(page.locator('#preserved-input')).toHaveValue('Keep my note');
  expect(
    await page.evaluate(
      () => document.getElementById('preserved-input') === window.beforeInput,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('StrictMode and equivalent rich props keep one handoff with latest committed callbacks', async ({
  page,
}) => {
  const errors = await open(page, '&state=pending');
  await update(page, { state: 'ready', duration: 1400 });
  await phase(page, 'handoff');
  await page.evaluate(() => window.fixture.rerender());
  await expect
    .poll(() => page.evaluate(() => window.fixtureEvents.map((e) => e.type)))
    .toEqual(['start', 'end']);
  const events = await page.evaluate(() => window.fixtureEvents);
  expect(events[0]?.id).toBe(events[1]?.id);
  expect(events[1]?.version).toBe(1);
  expect(events.every((e) => e.target === 'react-region')).toBe(true);
  expect(errors).toEqual([]);
});

test('uncommitted suspended renders cannot replace native callbacks or presentation', async ({
  page,
}) => {
  await open(page, '&state=pending');
  await page.evaluate(() => window.fixture.pendingRender());
  await page.waitForTimeout(60);
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  const events = await page.evaluate(() => window.fixtureEvents);
  expect(events.map((e) => e.type)).toEqual(['start', 'end']);
  expect(events.every((e) => e.version === 0)).toBe(true);
  await page.evaluate(() => window.fixture.resumeRender());
  expect(await page.evaluate(() => window.fixtureErrors)).toEqual([]);
});

test('one commit cancels superseded handoff even when explicit targets are removed', async ({
  page,
}) => {
  await open(page, '&state=pending');
  await update(page, { targets: true });
  await update(page, { state: 'ready', duration: 1500 });
  await phase(page, 'handoff');
  await update(page, { state: 'pending', cycle: 'new-cycle', targets: false });
  await phase(page, 'pending');
  expect(
    await page.evaluate(() => window.fixtureEvents.map((e) => e.type)),
  ).toEqual(['start', 'cancel']);
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  const events = await page.evaluate(() => window.fixtureEvents);
  expect(events.map((e) => e.type)).toEqual([
    'start',
    'cancel',
    'start',
    'end',
  ]);
  expect(events[2]?.cycle).toBe('new-cycle');
  expect(events[2]?.id).toBeGreaterThan(events[0]?.id ?? 0);
});

test('reentrant new intent and real unmount cancel exactly once and release callbacks', async ({
  page,
}) => {
  const errors = await open(page, '&state=pending');
  await page.evaluate(() => {
    window.fixtureFlags.reentrant = true;
  });
  await update(page, { state: 'ready' });
  await phase(page, 'pending');
  expect(
    await page.evaluate(() => window.fixtureEvents.map((e) => e.type)),
  ).toEqual(['start', 'cancel']);
  await page.evaluate(() => {
    window.fixtureFlags.reentrant = false;
  });
  await update(page, { state: 'ready', duration: 1500 });
  await phase(page, 'handoff');
  await page.evaluate(() => window.fixture.unmount());
  await expect(page.locator('#react-region')).toHaveCount(0);
  expect(
    await page.evaluate(() => window.fixtureEvents.map((e) => e.type)),
  ).toEqual(['start', 'cancel', 'start', 'cancel']);
  await page.waitForTimeout(50);
  const count = await page.evaluate(() => window.fixtureEvents.length);
  await page.evaluate(() => {
    const host = window.fixtureRefs.find((r) => r.node)?.node;
    host?.dispatchEvent(
      new CustomEvent('dotquilt-handoff-end', { detail: { handoffId: 999 } }),
    );
  });
  expect(await page.evaluate(() => window.fixtureEvents.length)).toBe(count);
  expect(errors).toEqual([]);
});

test('reduced motion and persistent pause keep readiness immediate across React commits', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '&state=pending');
  await update(page, { state: 'ready' });
  await phase(page, 'ready');
  expect(
    await page.evaluate(() => window.fixtureEvents.map((e) => e.type)),
  ).toEqual(['start', 'end']);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await update(page, { state: 'pending', cycle: 'paused', motion: 'paused' });
  await phase(page, 'pending');
  await update(page, { state: 'ready' });
  await phase(page, 'ready');
  expect(
    await page.evaluate(
      () =>
        document
          .getElementById('react-region')
          ?.shadowRoot?.querySelector('.c')
          ?.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
});

test('streamed server detail hydrates without replacing persistent content or crossing nonce requests', async ({
  page,
  request,
}) => {
  const line = test.info().project.name.split('-').at(-1) ?? 'current';
  const responses = await Promise.all(
    ['request-a', 'request-b'].map((n) =>
      request.get(`/stream?line=${line}&state=pending&mode=nonce&nonce=${n}`),
    ),
  );
  const [a, b] = await Promise.all(responses.map((r) => r.text()));
  expect(a).toContain('nonce="request-a"');
  expect(a).not.toContain('request-b');
  expect(b).toContain('nonce="request-b"');
  expect(b).not.toContain('request-a');
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`/stream?line=${line}&state=ready&mode=nonce`);
  await page.waitForFunction(() => window.fixtureHydrated);
  // A hydrated shell can precede React's removal of its streamed staging tree.
  // Require a single committed node before checking visibility and identity.
  await expect(page.locator('#streamed-detail')).toHaveCount(1);
  await expect(page.locator('#streamed-detail')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.getElementById('preserved-input') === window.beforeInput,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => ({
      errors: window.fixtureErrors,
      violations: window.fixtureViolations,
    })),
  ).toEqual({ errors: [], violations: [] });
  expect(errors).toEqual([]);
});

test('a selective SkeletonBlock consumer leaves LoadingRegion unregistered', async ({
  page,
}) => {
  const errors = await open(page, '&skeleton');
  expect(
    await page.evaluate(() => ({
      skeleton: !!customElements.get('dotquilt-skeleton-block'),
      region: !!customElements.get('dotquilt-region'),
    })),
  ).toEqual({ skeleton: true, region: false });
  expect(errors).toEqual([]);
});

test('nonce styles also hydrate without a CSP header and work after a real remount', async ({
  page,
}) => {
  const errors = await open(page, '&state=pending&mode=nonce&nocsp');
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  await page.goto(path('&state=pending&mode=nonce'));
  await page.waitForFunction(() => window.fixtureHydrated);
  await page.evaluate(() => window.fixture.unmount());
  await expect(page.locator('#react-region')).toHaveCount(0);
  await update(page, { show: true, state: 'pending', cycle: 'fresh-mount' });
  await phase(page, 'pending');
  await update(page, { state: 'ready', duration: 0 });
  await phase(page, 'ready');
  const nonces = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLStyleElement>(
        'style[data-dotquilt-react-style]',
      ),
    ].map((e) => e.nonce),
  );
  expect(nonces.length).toBeGreaterThan(0);
  expect(nonces.every((n) => n === 'react-fixture')).toBe(true);
  expect(await page.evaluate(() => window.fixtureViolations)).toEqual([]);
  expect(
    await page
      .locator('#react-region')
      .evaluate(
        (e) =>
          (e.shadowRoot?.querySelector('style') as HTMLStyleElement | null)
            ?.nonce,
      ),
  ).toBe('react-fixture');
  expect(errors).toEqual([]);
});

test('100 repeated React loading/mount/remove cycles release native subscriptions and adapter listeners', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = document.addEventListener.bind(document),
      remove = document.removeEventListener.bind(document);
    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === 'visibilitychange') listeners.add(listener);
      add(type, listener, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      if (type === 'visibilitychange') listeners.delete(listener);
      remove(type, listener, options);
    }) as typeof document.removeEventListener;
    Reflect.set(window, 'nativeSubscriptions', () => listeners.size);
  });
  const errors = await open(page);
  const checkpoints = await page.evaluate(async () => {
    const checkpoints = [];
    for (let i = 1; i <= 100; i++) {
      window.fixture.update({
        show: true,
        state: 'pending',
        cycle: String(i),
        motion: 'paused',
      });
      await Promise.resolve();
      window.fixture.update({ state: 'ready', duration: 0 });
      await Promise.resolve();
      window.fixture.unmount();
      await Promise.resolve();
      await Promise.resolve();
      window.fixtureRefs = [];
      window.fixtureEvents = [];
      if ([10, 50, 100].includes(i))
        checkpoints.push({
          cycle: i,
          subscriptions: Reflect.get(window, 'nativeSubscriptions')(),
          hosts: document.querySelectorAll(
            'dotquilt-region,dotquilt-skeleton-block',
          ).length,
        });
    }
    return checkpoints;
  });
  expect(checkpoints).toEqual(
    [10, 50, 100].map((cycle) => ({ cycle, subscriptions: 0, hosts: 0 })),
  );
  expect(errors).toEqual([]);
});

test('null React content does not mask the native missing-content fallback', async ({
  page,
}) => {
  await open(page, '&empty&state=refreshing');
  await phase(page, 'refreshing');
  await expect
    .poll(() => page.evaluate(() => window.fixtureErrors))
    .toContain('missing-content');
  await expect(page.locator('#react-region .fallback')).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.querySelector('#react-region > [data-dotquilt-react-content]'),
    ),
  ).toBeNull();
});

test('incompatible existing registration reports failure and retains available application content', async ({
  page,
}) => {
  await page.addInitScript(() =>
    customElements.define('dotquilt-region', class extends HTMLElement {}),
  );
  await page.goto(path('&state=ready&mode=external'));
  await page.waitForFunction(() => window.fixtureHydrated);
  await expect(page.locator('#preserved-input')).toBeVisible();
  await page
    .locator('#preserved-input')
    .fill('Available after failed enhancement');
  expect(await page.evaluate(() => window.fixtureErrors)).toContain(
    'registration-conflict',
  );
  expect(
    await page.evaluate(
      () => document.getElementById('preserved-input') === window.beforeInput,
    ),
  ).toBe(true);
  await page.locator('#recovery').click();
  await expect(page.getByRole('heading')).toHaveText('Account recovery');
});

test('real nested handoff events are filtered from parent React callbacks', async ({
  page,
}) => {
  await open(page, '&state=pending');
  const result = await page.evaluate(async () => {
    const nested = document.querySelector('dotquilt-region#nested-region');
    if (!(nested instanceof HTMLElement) || !('update' in nested))
      throw new Error('Missing nested native region');
    const events: string[] = [];
    const listen = (event: Event) => events.push(event.type);
    nested.addEventListener('dotquilt-handoff-start', listen);
    nested.addEventListener('dotquilt-handoff-end', listen);
    const update = nested.update as (patch: object) => void;
    update.call(nested, { state: 'pending', cycle: 'nested' });
    await Promise.resolve();
    await Promise.resolve();
    update.call(nested, { state: 'ready', timing: { duration: 0 } });
    await Promise.resolve();
    await Promise.resolve();
    nested.removeEventListener('dotquilt-handoff-start', listen);
    nested.removeEventListener('dotquilt-handoff-end', listen);
    return { nested: events, parent: window.fixtureEvents };
  });
  expect(result).toEqual({
    nested: ['dotquilt-handoff-start', 'dotquilt-handoff-end'],
    parent: [],
  });
  await phase(page, 'pending');
});
