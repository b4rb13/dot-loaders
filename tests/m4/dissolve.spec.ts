import { expect, test } from '@playwright/test';

const field = '[data-dotquilt-dissolve]';
const ledger = () =>
  Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger'));

for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  test(`coordinated default dissolve uses real dot fields and one accessible reveal under ${mode}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`/native?mode=${mode}`);
    await page.evaluate(() => {
      Reflect.set(window, 'violations', []);
      document.addEventListener('securitypolicyviolation', (event) =>
        Reflect.get(window, 'violations').push(
          JSON.stringify({
            directive: event.violatedDirective,
            uri: event.blockedURI,
            source: event.sourceFile,
            line: event.lineNumber,
            sample: event.sample,
          }),
        ),
      );
      window.m4.ready();
      // Freeze this inspection in the same microtask turn as preparation;
      // cross-process polling must not race the 300ms compositor completion.
      queueMicrotask(() => {
        for (const host of document.querySelectorAll('[data-host]'))
          for (const animation of host.shadowRoot?.getAnimations() ?? []) {
            animation.pause();
            animation.currentTime = 0;
          }
      });
    });
    await expect(page.locator(field)).toHaveCount(4);
    await page.evaluate(() => {
      for (const host of document.querySelectorAll('[data-host]'))
        for (const animation of host.shadowRoot?.getAnimations() ?? []) {
          animation.pause();
          animation.currentTime = 0;
        }
    });
    const measured = await page.evaluate(() => {
      const hosts = ['block', 'line', 'circle', 'multiline'].map((id) =>
        document.getElementById(id),
      );
      return hosts.map((host) => ({
        id: host?.id,
        patterns: host?.shadowRoot?.querySelectorAll(
          '[data-dotquilt-dissolve] pattern',
        ).length,
        radius: getComputedStyle(
          host?.shadowRoot?.querySelector(
            '[data-dotquilt-dissolve] circle',
          ) as Element,
        ).r,
      }));
    });
    expect(measured.map((row) => row.patterns)).toEqual([9, 9, 9, 36]);
    // Half the default 4.4 px mark.
    expect(measured.every((row) => row.radius === '2.2px')).toBe(true);
    const reservation = await page.evaluate(ledger);
    expect(reservation.dots).toBeGreaterThan(0);
    expect(reservation.dots).toBeLessThanOrEqual(16384);
    expect(
      await page.evaluate(() => Reflect.get(window, 'violations')),
    ).toEqual([]);
    // Playwright/WebKit injects `body {}` to sync screenshots. Capture in the
    // inline fixture; strict CSP cases execute the same assertions without it.
    if (mode === 'inline')
      await page.screenshot({
        path: info.outputPath('dissolve-start.png'),
        caret: 'initial',
      });
    await page.evaluate(() => {
      for (const host of document.querySelectorAll('[data-host]'))
        for (const animation of host.shadowRoot?.getAnimations() ?? [])
          animation.currentTime = 165;
    });
    if (mode === 'inline')
      await page.screenshot({
        path: info.outputPath('dissolve-middle.png'),
        caret: 'initial',
      });
    const offsets = await page
      .locator('#block')
      .evaluate((host) =>
        [
          ...(host.shadowRoot?.querySelectorAll(
            '[data-dotquilt-dissolve] rect',
          ) ?? []),
        ].map(
          (rect) =>
            rect.getAnimations()[0]?.effect?.getComputedTiming().progress,
        ),
      );
    expect(
      offsets.every(
        (value) => typeof value === 'number' && value > 0 && value < 1,
      ),
    ).toBe(true);
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(await page.evaluate(() => window.m4.identity())).toBe(true);
    await page.locator('#value').focus();
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator(field)).toHaveCount(0);
    await expect(page.locator('#value')).toBeFocused();
    expect(await page.evaluate(ledger)).toBeUndefined();
    expect(
      await page.evaluate(() => window.m4.events.map((event) => event.type)),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    await info.attach('csp-diagnostics', {
      body: JSON.stringify(
        await page.evaluate(() => Reflect.get(window, 'violations')),
      ),
      contentType: 'application/json',
    });
    expect(
      await page.evaluate(() => Reflect.get(window, 'violations')),
    ).toEqual([]);
    expect(errors).toEqual([]);
    await info.attach('pattern geometry', {
      body: JSON.stringify(measured),
      contentType: 'application/json',
    });
  });
}

test('dissolve captures fall options, handles geometry invalidation and cancels stale cycles', async ({
  page,
}) => {
  await page.goto('/native');
  await page.evaluate(() => {
    Reflect.get(window.m4, 'dissolve')('block', { fallPx: 8 });
    document.getElementById('region')?.addEventListener(
      'dotquilt-handoff-start',
      () => {
        Reflect.get(window.m4, 'dissolve')('block', { fallPx: 0 });
      },
      { once: true },
    );
    window.m4.ready(1000);
  });
  await expect(page.locator(field)).toHaveCount(4);
  expect(
    await page
      .locator('#block')
      .evaluate(
        (host) =>
          (
            host.shadowRoot
              ?.querySelector('[data-dotquilt-dissolve] rect')
              ?.getAnimations()[0]?.effect as KeyframeEffect | undefined
          )
            ?.getKeyframes()
            .at(-1)?.transform,
      ),
  ).toBe('translateY(8px)');
  await page.evaluate(() =>
    Reflect.get(window.m4, 'dissolve')('block', { fallPx: 0 }),
  );
  expect(
    await page
      .locator('#block')
      .evaluate(
        (host) =>
          (
            host.shadowRoot
              ?.querySelector('[data-dotquilt-dissolve] rect')
              ?.getAnimations()[0]?.effect as KeyframeEffect | undefined
          )
            ?.getKeyframes()
            .at(-1)?.transform,
      ),
  ).toBe('translateY(8px)');
  await page.evaluate(() =>
    window.m4.update('multiline', { widths: [0.3, 0.4] }),
  );
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(ledger)).toBeUndefined();
  await page.evaluate(() => window.m4.pending('next'));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => window.m4.ready(1000));
  await expect(page.locator(field)).toHaveCount(4);
  expect(
    await page
      .locator('#block')
      .evaluate(
        (host) =>
          (
            host.shadowRoot
              ?.querySelector('[data-dotquilt-dissolve] rect')
              ?.getAnimations()[0]?.effect as KeyframeEffect | undefined
          )
            ?.getKeyframes()
            .at(-1)?.transform,
      ),
  ).toBe('translateY(0px)');
  await page.evaluate(() => window.m4.pending('superseded'));
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(ledger)).toBeUndefined();
  await page.evaluate(() => window.m4.ready(0));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(
      () =>
        window.m4.events.filter(
          (event) => event.type === 'dotquilt-handoff-cancel',
        ).length,
    ),
  ).toBe(1);
});

test('restricted, exhausted and zero-time presentations never allocate a dissolve', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/native');
  await page.evaluate(() => window.m4.ready());
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(ledger)).toBeUndefined();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.m4.pending('paused'));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => {
    window.m4.update('region', { motion: 'paused' });
    window.m4.ready();
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(field)).toHaveCount(0);
  await page.evaluate(() => {
    window.m4.update('region', { motion: 'system' });
    window.m4.pending('exhausted');
  });
  await expect(page.locator('#block')).toHaveAttribute('data-moving', '');
  await expect(page.locator('#block')).not.toHaveAttribute('data-moving', '', {
    timeout: 6000,
  });
  await page.evaluate(() => window.m4.ready());
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(ledger)).toBeUndefined();
});

test('dot admission and child restrictions preserve safe fallback and disposal', async ({
  page,
}) => {
  await page.goto('/native');
  await page.evaluate(() => {
    window.m4.update('circle', { motion: 'paused' });
    Reflect.get(window.m4, 'dissolve')('block', { fallPx: 0 });
    const key = Symbol.for('dotquilt.v1.dot-ledger');
    Reflect.set(document, key, { dots: 16384, users: 1 });
    window.m4.ready(1000);
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(() => window.m4.diagnostics)).toContain(
    'dot-limit',
  );
  await page.locator('#value').focus();
  expect(await page.evaluate(ledger)).toEqual({ dots: 16384, users: 1 });
  await page.evaluate(() => {
    Reflect.deleteProperty(document, Symbol.for('dotquilt.v1.dot-ledger'));
    window.m4.pending('cleanup');
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => window.m4.ready(1000));
  await expect(page.locator(field)).toHaveCount(3);
  await page.evaluate(() => document.getElementById('region')?.remove());
  expect(await page.evaluate(ledger)).toBeUndefined();
});

test.describe('normal-speed visual recording', () => {
  test('natural completion cleans every field and permits a genuinely new loading window', async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:4194',
      viewport: { width: 640, height: 480 },
      reducedMotion: 'no-preference',
      recordVideo: { dir: info.outputDir, size: { width: 640, height: 480 } },
    });
    const page = await context.newPage();
    try {
      await page.goto('/native');
      for (let cycle = 0; cycle < 3; cycle++) {
        if (cycle) {
          await page.evaluate(
            (cycle) => window.m4.pending(`settled-${cycle}`),
            cycle,
          );
          await expect(page.locator('#region')).toHaveAttribute(
            'data-presentation',
            'pending',
          );
        }
        await page.evaluate(() => window.m4.ready());
        await expect(page.locator(field)).toHaveCount(4);
        await expect(page.locator('#region')).toHaveAttribute(
          'data-presentation',
          'ready',
        );
        await expect(page.locator(field)).toHaveCount(0);
        expect(await page.evaluate(ledger)).toBeUndefined();
        expect(await page.evaluate(() => window.m4.identity())).toBe(true);
      }
      expect(
        await page.evaluate(() => window.m4.events.map((event) => event.type)),
      ).toEqual(
        Array(3)
          .fill(['dotquilt-handoff-start', 'dotquilt-handoff-end'])
          .flat(),
      );
    } finally {
      await context.close();
    }
  });
});

test('reentrant start restrictions settle without admitting decorative work', async ({
  page,
}) => {
  await page.goto('/native');
  await page.evaluate(() => {
    document
      .getElementById('region')
      ?.addEventListener(
        'dotquilt-handoff-start',
        () => window.m4.update('region', { motion: 'paused' }),
        { once: true },
      );
    window.m4.ready();
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(field)).toHaveCount(0);
  expect(await page.evaluate(ledger)).toBeUndefined();
});
