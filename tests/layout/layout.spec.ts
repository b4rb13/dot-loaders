import { expect, type Page, test } from '@playwright/test';
import { type Profile, profiles } from './scene';
import { layoutScore } from './score';

// Install before navigation: raw entries include recent-input shifts; CLS uses
// session windows and excludes recent input. Geometry is independently sampled.
async function observe(page: Page) {
  await page.addInitScript(() => {
    const shifts: {
      value: number;
      startTime: number;
      hadRecentInput: boolean;
      sources: unknown[];
    }[] = [];
    const supported =
      PerformanceObserver.supportedEntryTypes.includes('layout-shift');
    if (supported)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources?: {
              node?: Node;
              previousRect: DOMRectReadOnly;
              currentRect: DOMRectReadOnly;
            }[];
          };
          shifts.push({
            value: e.value,
            startTime: e.startTime,
            hadRecentInput: e.hadRecentInput,
            sources: (e.sources ?? []).map((s) => {
              // Name the node well enough to find it from a CI log.
              const node = s.node as Element | undefined;
              const element = node?.nodeType === 1 ? node : node?.parentElement;
              const near = element?.closest('[id]');
              return {
                id: element?.id ?? '',
                node: element
                  ? `${element.localName}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''}${element.getAttribute('slot') ? `[slot=${element.getAttribute('slot')}]` : ''}`
                  : String(node?.nodeName ?? ''),
                in: near && near !== element ? near.id : '',
                previous: s.previousRect.toJSON(),
                current: s.currentRect.toJSON(),
              };
            }),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    // The handoff raises content into place with a transform, which is not a
    // layout shift; take it out so the samples compare layout only.
    const layer = (element: Element) =>
      element
        .closest('dotquilt-region')
        ?.shadowRoot?.querySelector('[part=content]');
    const rise = (element: Element) => {
      const content = layer(element);
      return content
        ? Number.parseFloat(
            getComputedStyle(content).translate.split(' ')[1] ?? '',
          ) || 0
        : 0;
    };
    const rects = () =>
      Object.fromEntries(
        ['before', 'owner', 'source', 'after', 'value'].map((id) => {
          const element = document.getElementById(id);
          const r = element?.getBoundingClientRect();
          const inside = element && id === 'value';
          const y = inside ? rise(element) : 0;
          return [
            id,
            r
              ? {
                  x: r.x,
                  y: r.y - y,
                  width: r.width,
                  height: r.height,
                  animating:
                    !!inside && !!layer(element)?.getAnimations().length,
                }
              : null,
          ];
        }),
      );
    const samples: ReturnType<typeof rects>[] = [];
    let sampling = false;
    const sample = () => {
      if (!sampling) return;
      samples.push(rects());
      requestAnimationFrame(sample);
    };
    Object.assign(window, {
      layoutProbe: {
        supported,
        shifts,
        samples,
        rects,
        start() {
          sampling = true;
          sample();
        },
        stop() {
          sampling = false;
        },
      },
    });
  });
}
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function snapshot(page: Page) {
  return page.evaluate(() => window.layoutProbe.rects());
}
async function probe(page: Page) {
  const result = await page.evaluate(() => ({
    supported: window.layoutProbe.supported,
    shifts: window.layoutProbe.shifts,
  }));
  return {
    ...result,
    cls: result.supported ? layoutScore(result.shifts) : null,
  };
}
// WebKit reports an element's client rect up to about 0.12 px off while an
// ancestor animates `translate` with `filter: blur()`, as the content layer
// does during the handoff (Chromium and Firefox: 0; it happens on a plain
// page too). No layout moves, so a WebKit sample taken during that
// animation may differ by `animating`.
const animatingSlack = (browserName: string) =>
  browserName === 'webkit' ? 1 / 4 : 0;
function stable(
  before: Awaited<ReturnType<typeof snapshot>>,
  after: typeof before,
  animating = 0,
) {
  for (const id of Object.keys(before)) {
    const a = before[id],
      b = after[id];
    expect(Boolean(b), id).toBe(Boolean(a));
    if (a && b)
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(Math.abs(a[key] - b[key]), `${id}.${key}`).toBeLessThanOrEqual(
          b.animating ? Math.max(1 / 64, animating) : 1 / 64,
        );
  }
}
// Slow frames run each animation frame's callbacks 60 ms late, so frames
// render in between, as on a busy CI runner. An external stylesheet then
// applies a frame or more before the element releases its static hold.
for (const framework of ['native', 'react'])
  for (const mode of ['external', 'nonce'])
    for (const profile of Object.keys(profiles) as Profile[])
      for (const frames of ['normal', 'slow'] as const) {
        if (
          frames === 'slow' &&
          (framework !== 'native' || mode !== 'external')
        )
          continue;
        test(`${framework} ${mode} ${profile}${frames === 'slow' ? ' with slow frames' : ''}: maximum reserved layout across upgrade, hydration and outcomes`, async ({
          page,
          browserName,
        }, info) => {
          if (frames === 'slow')
            await page.addInitScript(() => {
              const frame = window.requestAnimationFrame.bind(window);
              window.requestAnimationFrame = (callback) =>
                frame(() => setTimeout(() => callback(performance.now()), 60));
            });
          const errors: string[] = [],
            csp: string[] = [];
          page.on('pageerror', (e) => errors.push(String(e)));
          page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
          });
          await observe(page);
          await page.goto(`/${framework}?profile=${profile}&mode=${mode}`);
          await page.waitForFunction(() => Boolean(window.layoutTest));
          await page.evaluate(() =>
            document.addEventListener('securitypolicyviolation', (e) => {
              (window as unknown as { violations: string[] }).violations ??= [];
              (window as unknown as { violations: string[] }).violations.push(
                `${e.violatedDirective}:${e.blockedURI}`,
              );
            }),
          );
          await settle(page);
          const before = await snapshot(page);
          expect(before.owner?.height).toBe(profiles[profile].height);
          await page.evaluate(() => window.layoutProbe.start());
          // The server description is useful before any registration or hydration.
          expect(
            await page.locator('#owner').evaluate((e) => e.shadowRoot),
          ).toBeNull();
          if (profile === 'multiline' || profile === 'multilineOverlimit') {
            const lines = page.locator('#owner [data-dotquilt-static-line]');
            await expect(lines).toHaveCount(50);
            expect(
              await lines.evaluateAll((nodes) =>
                nodes.every((node) => node.closest('[aria-hidden="true"]')),
              ),
            ).toBe(true);
          }
          await page.evaluate(() => window.layoutTest.enhance());
          await expect
            .poll(() =>
              page.locator('#owner').evaluate((e) => Boolean(e.shadowRoot)),
            )
            .toBe(true);
          await settle(page);
          stable(before, await snapshot(page));
          if (framework === 'react') {
            await page.evaluate(() => window.layoutTest.hydrate());
            await expect
              .poll(() => page.evaluate(() => window.layoutTest.commits()))
              .toBeGreaterThan(0);
            await settle(page);
            stable(before, await snapshot(page));
          }
          const p = profiles[profile];
          const admitted: Record<string, number | undefined> = (await page
            .locator('#source')
            .count())
            ? await page.locator('#source').evaluate((e) => ({
                lines: Reflect.get(e, 'lines'),
                count: Reflect.get(e, 'count'),
                rows: Reflect.get(e, 'rows'),
                columns: Reflect.get(e, 'columns')?.length,
                rowHeight: Reflect.get(e, 'rowHeight'),
              }))
            : {};
          if ('lines' in p) expect(admitted.lines).toBe(Math.min(p.lines, 50));
          if ('count' in p) expect(admitted.count).toBe(8);
          if ('rows' in p) {
            expect(admitted.rows).toBe(
              Math.min(p.rows, 100, Math.floor(1000 / p.columns.length)),
            );
            expect(admitted.columns).toBe(p.columns.length);
            expect(admitted.rowHeight).toBe(p.rowHeight);
          }
          if (await page.locator('#value').count())
            await page.locator('#value').evaluate((e: HTMLInputElement) => {
              e.value = 'retained maximum';
            });
          for (const [state, cycle] of [
            ['ready', 'initial'],
            ['refreshing', 'refresh'],
            ['ready', 'refresh'],
            ['pending', 'replacement'],
            ['ready', 'replacement'],
          ] as const) {
            await page.evaluate(([s, c]) => window.layoutTest.update(s, c), [
              state,
              cycle,
            ] as const);
            await expect(page.locator('#owner')).toHaveAttribute(
              'data-presentation',
              state,
            );
            await settle(page);
            stable(before, await snapshot(page));
            expect(
              await page.evaluate(() => window.layoutTest.identity()),
            ).toBe(true);
          }
          if ('text' in p) {
            expect(
              await page.locator('[data-dotquilt-text-content]').textContent(),
            ).toBe(p.text);
            await page.evaluate(() =>
              document.getElementById('stage')?.classList.add('font-change'),
            );
            await settle(page);
            stable(before, await snapshot(page));
          }
          await page.evaluate(() => window.layoutProbe.stop());
          const result = await page.evaluate(() => ({
            supported: window.layoutProbe.supported,
            shifts: window.layoutProbe.shifts,
            samples: window.layoutProbe.samples,
            errors: window.layoutTest.errors,
            csp: Reflect.get(window, 'violations') ?? [],
          }));
          for (const sample of result.samples)
            stable(before, sample, animatingSlack(browserName));
          const cls = result.supported ? layoutScore(result.shifts) : null;
          if (result.supported)
            expect(
              cls,
              `layout shifts: ${JSON.stringify(result.shifts.filter((shift) => !shift.hadRecentInput))}`,
            ).toBeLessThanOrEqual(0.01);
          expect(result.errors).toEqual([]);
          expect(result.csp).toEqual(csp);
          expect(errors).toEqual([]);
          if (await page.locator('#value').count())
            await expect(page.locator('#value')).toHaveValue(
              'retained maximum',
            );
          await info.attach('complete-scenario-layout', {
            body: JSON.stringify({
              framework,
              mode,
              profile,
              before,
              ...result,
              cls,
            }),
            contentType: 'application/json',
          });
          await page.evaluate(() => window.layoutTest.remove());
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document
                    .getAnimations()
                    .filter((a) => a.playState === 'running').length,
              ),
            )
            .toBe(0);
        });
      }

test('raw layout observer detects application resize even when recent input excludes it from CLS', async ({
  page,
}, info) => {
  await observe(page);
  await page.goto('/native?profile=region');
  await page.waitForFunction(() => Boolean(window.layoutTest));
  await settle(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.id = 'resize';
    b.textContent = 'Resize content';
    b.onclick = () =>
      (document.getElementById('owner') as HTMLElement).classList.add(
        'natural',
      );
    document.body.append(b);
  });
  await page.locator('#resize').click();
  await settle(page);
  const after = await snapshot(page);
  expect((after.after as Rect).y).not.toBe((before.after as Rect).y);
  const result = await probe(page);
  if (result.supported) {
    expect(result.shifts.some((e) => e.value > 0 && e.hadRecentInput)).toBe(
      true,
    );
    expect(result.cls).toBe(0);
  }
  await info.attach('input-excluded-positive-control', {
    body: JSON.stringify({ before, after, ...result }),
    contentType: 'application/json',
  });
});

for (const framework of ['native', 'react'])
  test(`${framework}: caller resize, typography and outgrown content remain natural`, async ({
    page,
  }, info) => {
    await observe(page);
    await page.goto(`/${framework}?profile=region`);
    await page.waitForFunction(() => Boolean(window.layoutTest));
    await page.evaluate(() => {
      window.layoutTest.enhance();
      window.layoutTest.hydrate();
    });
    if (framework === 'react')
      await expect
        .poll(() => page.evaluate(() => window.layoutTest.commits()))
        .toBeGreaterThan(0);
    await settle(page);
    const fixed = await snapshot(page);
    await page.setViewportSize({ width: 768, height: 2400 });
    await settle(page);
    const resized = await snapshot(page);
    expect((resized.owner as Rect).width).toBeGreaterThan(
      (fixed.owner as Rect).width,
    );
    expect((resized.owner as Rect).height).toBe((fixed.owner as Rect).height);
    await page.evaluate(() =>
      (document.getElementById('stage') as HTMLElement).classList.add(
        'font-change',
      ),
    );
    await settle(page);
    stable(resized, await snapshot(page));
    await page.evaluate(() => {
      (document.getElementById('owner') as HTMLElement).classList.add(
        'natural',
      );
      (document.getElementById('content') as HTMLElement).classList.add(
        'grown',
      );
    });
    await settle(page);
    const natural = await snapshot(page);
    expect((natural.owner as Rect).height).toBeGreaterThan(
      (resized.owner as Rect).height,
    );
    expect((natural.after as Rect).y).toBeGreaterThan(
      (resized.after as Rect).y,
    );
    await page.evaluate(() => window.layoutTest.update('ready'));
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.layoutTest.identity())).toBe(true);
    await info.attach('caller-policy-resize', {
      body: JSON.stringify({
        fixed,
        resized,
        natural,
        probe: await probe(page),
      }),
      contentType: 'application/json',
    });
    await page.evaluate(() => window.layoutTest.remove());
  });
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  animating?: boolean;
};
declare global {
  interface Window {
    layoutProbe: {
      supported: boolean;
      shifts: {
        value: number;
        startTime: number;
        hadRecentInput: boolean;
        sources: unknown[];
      }[];
      samples: Record<string, Rect | null>[];
      rects(): Record<string, Rect | null>;
      start(): void;
      stop(): void;
    };
  }
}

for (const framework of ['native', 'react']) {
  for (const delivery of ['delayed', 'failed'] as const)
    test(`${framework}: ${delivery} external appearance preserves reservation and recovery`, async ({
      page,
    }, info) => {
      const requests: string[] = [];
      await page.route(/\/(?:react-)?styles\/[^/]+\.css$/, async (route) => {
        requests.push(route.request().url());
        if (delivery === 'failed') await route.abort('failed');
        else {
          await new Promise((resolve) => setTimeout(resolve, 200));
          await route.continue();
        }
      });
      await observe(page);
      await page.goto(`/${framework}?profile=multiline`);
      await page.waitForFunction(() => Boolean(window.layoutTest));
      expect(requests.length).toBeGreaterThan(0);
      const before = await snapshot(page);
      expect(before.owner?.height).toBe(1092);
      await page.evaluate(() => {
        window.layoutTest.enhance();
        window.layoutTest.hydrate();
      });
      if (framework === 'react')
        await expect
          .poll(() => page.evaluate(() => window.layoutTest.commits()))
          .toBeGreaterThan(0);
      await settle(page);
      const pending = await snapshot(page);
      const outer = (rects: Awaited<ReturnType<typeof snapshot>>) =>
        Object.fromEntries(
          Object.entries(rects).filter(([id]) => id !== 'source'),
        );
      stable(outer(before), outer(pending));
      stable(outer(before), outer(await snapshot(page)));
      await page.evaluate(() => window.layoutTest.update('ready'));
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      await expect(page.locator('#value')).toBeVisible();
      stable(outer(before), outer(await snapshot(page)));
      await info.attach('stylesheet-delivery', {
        body: JSON.stringify({
          delivery,
          pending,
          requests,
          before,
          after: await snapshot(page),
          observer: await probe(page),
        }),
        contentType: 'application/json',
      });
      await page.evaluate(() => window.layoutTest.remove());
    });
  test(`${framework}: no JavaScript preserves maximum static geometry and ready content`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 2400 },
    });
    try {
      const page = await context.newPage();
      const results = [];
      for (const profile of [
        'multiline',
        'tableRows',
        'tableProduct',
        'tableExtreme',
        'long',
      ] as const) {
        await page.goto(`/${framework}?profile=${profile}&state=ready`);
        expect(
          await page.locator('#owner').evaluate((e) => e.shadowRoot),
        ).toBeNull();
        const box = await page.locator('#owner').boundingBox();
        expect(box?.height).toBe(profiles[profile].height);
        if (profile === 'long')
          expect(await page.locator('#owner').textContent()).toContain(
            profiles.long.text,
          );
        else await expect(page.locator('#value')).toBeVisible();
        results.push({
          profile,
          box,
          after: await page.locator('#after').boundingBox(),
        });
      }
      await info.attach('no-javascript', {
        body: JSON.stringify(results),
        contentType: 'application/json',
      });
    } finally {
      await context.close();
    }
  });
}

for (const framework of ['native', 'react'])
  for (const mode of ['external', 'nonce'])
    test(`${framework} ${mode}: inline TypingDots preserves its baseline`, async ({
      page,
      browserName,
    }, info) => {
      await observe(page);
      await page.goto(`/${framework}?profile=typing&mode=${mode}&inline=1`);
      await page.waitForFunction(() => Boolean(window.layoutTest));
      await settle(page);
      const before = await snapshot(page);
      await page.evaluate(() => {
        window.layoutProbe.start();
        window.layoutTest.enhance();
      });
      await settle(page);
      stable(before, await snapshot(page));
      if (framework === 'react') {
        await page.evaluate(() => window.layoutTest.hydrate());
        await expect
          .poll(() => page.evaluate(() => window.layoutTest.commits()))
          .toBeGreaterThan(0);
      }
      await settle(page);
      stable(before, await snapshot(page));
      const observation = await probe(page);
      if (observation.supported)
        expect(observation.cls).toBeLessThanOrEqual(0.01);
      const samples = await page.evaluate(() => {
        window.layoutProbe.stop();
        return window.layoutProbe.samples;
      });
      for (const sample of samples)
        stable(before, sample, animatingSlack(browserName));
      await info.attach('inline-baseline', {
        body: JSON.stringify({
          before,
          after: await snapshot(page),
          samples,
          ...observation,
        }),
        contentType: 'application/json',
      });
      await page.evaluate(() => window.layoutTest.remove());
    });

// The `external` style policy loads each upgraded host's shadow stylesheet
// after upgrade. Until it applies, the host must keep the layout its static
// markup reserved; rendered unstyled, long text shifted by 0.94 and inline
// TypingDots lost their baseline. Every stylesheet requested after
// enhancement is held, so the late arrival is deterministic.
for (const framework of ['native', 'react'])
  for (const profile of Object.keys(profiles) as Profile[])
    test(`${framework} ${profile}: a late shadow stylesheet keeps the static layout until it applies`, async ({
      page,
      browserName,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      let release = () => {};
      let gate: Promise<void> | undefined;
      await page.route(/\/(?:react-)?styles\/[^/]+\.css$/, async (route) => {
        await gate;
        await route.continue();
      });
      const shadowSheets = () =>
        page.evaluate(() => {
          const links = [...document.querySelectorAll('*')].flatMap((e) => [
            ...(e.shadowRoot?.querySelectorAll('link') ?? []),
          ]);
          return {
            requested: links.length,
            loaded: links.filter((link) => link.sheet).length,
          };
        });
      await observe(page);
      await page.addInitScript(() => {
        const reported: string[] = [];
        Reflect.set(window, 'loaderErrors', reported);
        document.addEventListener('dotquilt-error', (event) => {
          const { code, field } = (event as CustomEvent).detail;
          reported.push(`${(event.target as Element).id}:${code}:${field}`);
        });
      });
      const loaderErrors = () =>
        page.evaluate(() =>
          [...(Reflect.get(window, 'loaderErrors') as string[])].sort(),
        );
      const path = (mode: string) =>
        `/${framework}?profile=${profile}&mode=${mode}${profile === 'typing' ? '&inline=1' : ''}`;
      // Inline styles apply at upgrade. Waiting for an external stylesheet
      // may delay what the element reports, but must not change it.
      await page.goto(path('nonce'));
      await page.waitForFunction(() => Boolean(window.layoutTest));
      await page.evaluate(() => {
        window.layoutTest.enhance();
        window.layoutTest.hydrate();
      });
      await settle(page);
      const reported = await loaderErrors();
      const results: Record<string, unknown> = { reported };
      // `natural` drops the fixture's height reservation, so the static
      // markup alone sizes every host.
      for (const reservation of ['reserved', 'natural'] as const) {
        if (reservation === 'natural')
          await page.route('**/reservation.css*', (route) =>
            route.fulfill({ contentType: 'text/css', body: '' }),
          );
        gate = undefined;
        await page.goto(path('external'));
        await page.waitForFunction(() => Boolean(window.layoutTest));
        await settle(page);
        const before = await snapshot(page);
        if (reservation === 'reserved')
          expect(before.owner?.height).toBe(profiles[profile].height);
        gate = new Promise((resolve) => {
          release = resolve;
        });
        await page.evaluate(() => {
          window.layoutProbe.start();
          window.layoutTest.enhance();
          window.layoutTest.hydrate();
        });
        if (framework === 'react')
          await expect
            .poll(() => page.evaluate(() => window.layoutTest.commits()))
            .toBeGreaterThan(0);
        await settle(page);
        await settle(page);
        const held = await snapshot(page);
        const sheets = await shadowSheets();
        expect(sheets.requested).toBeGreaterThan(0);
        expect(sheets.loaded).toBe(0);
        stable(before, held);
        // Pending content stays unavailable while the static layout holds.
        if ('text' in profiles[profile])
          expect(
            await page
              .locator('[data-dotquilt-text-content]')
              .evaluate((e) => e.checkVisibility({ visibilityProperty: true })),
          ).toBe(false);
        else {
          await page.locator('#value').evaluate((e) => e.focus());
          await expect(page.locator('#value')).not.toBeFocused();
        }
        release();
        await expect
          .poll(async () => {
            const { requested, loaded } = await shadowSheets();
            return loaded === requested;
          })
          .toBe(true);
        await settle(page);
        const styled = await snapshot(page);
        const probe = await page.evaluate(() => {
          window.layoutProbe.stop();
          return {
            supported: window.layoutProbe.supported,
            shifts: window.layoutProbe.shifts,
            samples: window.layoutProbe.samples,
          };
        });
        const cls = probe.supported ? layoutScore(probe.shifts) : null;
        // A natural layout may still settle once styled; that is the
        // caller's reservation to make, not the stylesheet's arrival.
        if (reservation === 'reserved') {
          stable(before, styled);
          for (const sample of probe.samples)
            stable(before, sample, animatingSlack(browserName));
          if (probe.supported) expect(cls).toBeLessThanOrEqual(0.01);
        }
        expect(await page.evaluate(() => window.layoutTest.errors)).toEqual([]);
        expect(await loaderErrors()).toEqual(reported);
        results[reservation] = { before, held, styled, sheets, cls };
        await page.evaluate(() => window.layoutTest.remove());
      }
      expect(errors).toEqual([]);
      await info.attach('late-shadow-stylesheet', {
        body: JSON.stringify({ framework, profile, ...results }),
        contentType: 'application/json',
      });
    });
