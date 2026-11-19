import { expect, test } from '@playwright/test';

const field = '[data-dotquilt-dissolve]';
const ledger = () =>
  Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger'));

for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  test(`coordinated dissolve uses real dot fields and one accessible reveal under ${mode}`, async ({
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
      // The dissolve is no longer the default (morph.ts); choose it.
      window.m4.dissolve('block', {});
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
    // One pattern per band of marks: 1–12 per surface, four lines in multiline.
    expect(
      measured.every(
        (row) => (row.patterns ?? 0) >= 1 && (row.patterns ?? 0) <= 48,
      ),
    ).toBe(true);
    expect(measured[3]?.patterns).toBeGreaterThanOrEqual(4);
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
          animation.currentTime = 150; // halfway through the fixture's 300 ms handoff
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
    // Marks leave left to right: exit progress falls across the bands, and
    // some bands are part-way out.
    expect(offsets.length).toBeGreaterThan(1);
    expect(
      offsets.every(
        (value, index) =>
          typeof value === 'number' &&
          (index === 0 || value <= (offsets[index - 1] as number)),
      ),
    ).toBe(true);
    expect(
      offsets.some(
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

// Squares and dashes leave as themselves, from where the CSS drew them: each
// pattern cell is one tile of the mark's own pitch, with the mark centred.
const spec = {
  dash: { width: 9.4, height: 3.4, radius: 1.7, across: 13, down: 9.5 },
  square: { width: 4, height: 4, radius: 1.1, across: 8.5, down: 8.5 },
} as const;
// The family stylesheet scopes each shape's mark rules to its own tag.
for (const mode of ['hash', 'external-family'] as const)
  for (const mark of ['dash', 'square'] as const)
    test(`${mark} marks dissolve as ${mark}es on the CSS grid under ${mode} styles`, async ({
      page,
    }) => {
      await page.goto(`/native?mode=${mode}&mark=${mark}`);
      await page.evaluate(() => {
        Reflect.set(window, 'violations', []);
        document.addEventListener('securitypolicyviolation', (event) =>
          Reflect.get(window, 'violations').push(event.violatedDirective),
        );
        window.m4.dissolve('block', {});
        window.m4.ready();
        queueMicrotask(() => {
          for (const host of document.querySelectorAll('[data-host]'))
            for (const animation of host.shadowRoot?.getAnimations() ?? []) {
              animation.pause();
              animation.currentTime = 0;
            }
        });
      });
      await expect(page.locator(field)).toHaveCount(4);
      const fields = await page.evaluate(() =>
        ['block', 'line', 'circle', 'multiline'].map((id) => {
          const root = document.getElementById(id)?.shadowRoot;
          const pattern = root?.querySelector(
            '[data-dotquilt-dissolve] pattern',
          );
          const glyph = pattern?.firstElementChild;
          const number = (element: Element | null | undefined, name: string) =>
            Number(element?.getAttribute(name));
          return {
            id,
            glyph: glyph?.localName,
            cell: [number(pattern, 'width'), number(pattern, 'height')],
            mark: ['x', 'y', 'width', 'height', 'rx'].map((name) =>
              number(glyph, name),
            ),
          };
        }),
      );
      const { width, height, radius, across, down } = spec[mark];
      for (const {
        id,
        glyph,
        cell,
        mark: [x, y, w, h, rx],
      } of fields) {
        expect(glyph, id).toBe('rect');
        expect([w, h, rx], id).toEqual([width, height, radius]);
        const [cellWidth = 0, cellHeight = 0] = cell;
        // Centred in its cell.
        expect((x ?? 0) * 2 + width, id).toBeCloseTo(cellWidth, 5);
        expect((y ?? 0) * 2 + height, id).toBeCloseTo(cellHeight, 5);
        // Lines repeat at the pitch; blocks and circles spread whole tiles out.
        if (id === 'line' || id === 'multiline')
          expect(cell, id).toEqual([across, down]);
        else {
          expect(cellWidth, id).toBeGreaterThanOrEqual(across);
          expect(cellWidth, id).toBeLessThan(across * 2);
          expect(cellHeight, id).toBeGreaterThanOrEqual(down);
          expect(cellHeight, id).toBeLessThan(down * 2);
        }
      }
      expect(
        await page.evaluate(() => Reflect.get(window, 'violations')),
      ).toEqual([]);
    });

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
      await page.evaluate(() => window.m4.dissolve('block', {}));
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
