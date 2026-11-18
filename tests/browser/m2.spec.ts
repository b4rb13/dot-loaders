import { expect, type Page, test } from '@playwright/test';

const kinds = ['svg', 'canvas', 'dom'] as const;
async function boot(
  page: Page,
  candidate = 'svg',
  family = 'line',
  mode = 'inline',
) {
  await page.goto(`/m2?candidate=${candidate}&family=${family}&mode=${mode}`);
  await page.waitForFunction(() => window.m2Booted);
}
for (const candidate of kinds)
  for (const mode of ['inline', 'nonce', 'hash', 'external'])
    test(`M2 ${candidate}/${mode}: same commands render under real CSP and release after handoff`, async ({
      page,
    }) => {
      await boot(page, candidate, 'line', mode);
      await expect(
        page.locator('#proof-surface [data-dotquilt-painter]'),
      ).toHaveCount(1);
      await expect(page.locator('#proof-content')).toBeHidden();
      expect(
        // Read the committed painter in the same turn as preparation, before
        // a protocol round trip can consume the short real handoff.
        await page.evaluate(async () => {
          await window.m2.reveal(300);
          return document
            .getElementById('proof-surface')
            ?.shadowRoot?.querySelector('[data-dotquilt-painter]')
            ?.tagName.toLowerCase();
        }),
      ).toBe(candidate === 'dom' ? 'div' : candidate);
      await expect(page.locator('#proof-region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      await expect(page.locator('#proof-content')).toBeVisible();
      expect(
        await page.evaluate(() => ({
          identity:
            document.getElementById('proof-content') === window.m2.identity,
          events: window.m2.events,
          violations: window.m2.violations,
        })),
      ).toEqual({ identity: true, events: ['start', 'end'], violations: [] });
      await expect(
        page.locator('#proof-surface [data-dotquilt-painter]'),
      ).toHaveCount(0);
      expect(await page.locator('#proof-region [style]').count()).toBe(0);
    });
for (const family of ['line', 'bar', 'scatter', 'text', 'table'])
  test(`M2 ${family}: representative handoff uses the current engine and actual content`, async ({
    page,
  }) => {
    await boot(page, 'canvas', family);
    await page.evaluate(() => window.m2.reveal());
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(
      await page.evaluate(() =>
        document
          .getElementById('proof-surface')
          ?.shadowRoot?.querySelector('[data-dotquilt-painter]')
          ?.getAttribute('aria-hidden'),
      ),
    ).toBe('true');
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.m2.events)).toEqual([
      'start',
      'end',
    ]);
    if (family === 'table')
      expect(await page.locator('#proof-content tr').count()).toBe(6);
    if (family === 'text')
      await expect(page.locator('#proof-content p')).toHaveText('42.50');
  });
for (const candidate of kinds)
  test(`M2 ${candidate}: replacement/reduction/focus interrupt rich effects without stale drawing`, async ({
    page,
  }) => {
    await boot(page, candidate, 'table');
    await page.evaluate(() => window.m2.reveal(1200));
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.evaluate(() => window.m2.pending('superseding'));
    await expect(page.locator('#proof-content')).toBeHidden();
    expect(await page.evaluate(() => window.m2.events)).toEqual([
      'start',
      'cancel',
    ]);
    await page.evaluate(() => window.m2.reveal(1200));
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.locator('#proof-content button').focus();
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#proof-content button')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.m2.pending('reduced'));
    await page.evaluate(() => window.m2.reveal(1200));
    await expect(page.locator('#proof-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.m2.events)).toEqual([
      'start',
      'cancel',
      'start',
      'end',
      'start',
      'end',
    ]);
    await page.evaluate(() => window.m2.dispose());
    expect(
      await page.evaluate(() => [
        Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
        Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
      ]),
    ).toEqual([false, false]);
  });
for (const candidate of kinds)
  test(`M2 ${candidate}: transactional commands, finite values, dot/buffer caps and late writers`, async ({
    page,
  }) => {
    await boot(page, candidate);
    await page.evaluate(() => window.m2.dispose());
    const result = await page.evaluate(async (kind) => {
      const { candidatePainter } = await import(
        String('/pkg/dist/internal/dense/painter.js')
      );
      const host = document.createElement('div');
      host.className = 'm2-block';
      host.attachShadow({ mode: 'open' });
      document.body.append(host);
      const issues: string[] = [];
      const painter = candidatePainter(kind)(host, (code: string) =>
        issues.push(code),
      );
      painter.draw((dot: (v: object) => void) =>
        dot({ x: 10, y: 10, size: 3, opacity: 1, tone: 'base' }),
      );
      const before = host.shadowRoot?.innerHTML;
      let failed = false;
      try {
        painter.draw((dot: (v: object) => void) => {
          dot({ x: 50, y: 20, size: 3, opacity: 1, tone: 'base' });
          throw new Error('expected');
        });
      } catch {
        failed = true;
      }
      const atomic = before === host.shadowRoot?.innerHTML;
      let expired: ((v: object) => void) | undefined;
      painter.draw((dot: (v: object) => void) => {
        expired = dot;
        for (let i = 0; i < 4097; i++)
          dot({ x: i % 100, y: 10, size: 2, opacity: 0.4, tone: 'base' });
        dot({ x: Number.NaN, y: 1, size: 1, opacity: 1, tone: 'base' });
      });
      const ledger = Reflect.get(
        document,
        Symbol.for('dotquilt.v1.dot-ledger'),
      );
      const snapshot = {
        dots: ledger.dots,
        bytes: ledger.bytes,
        pixels: ledger.pixels,
      };
      expired?.({ x: 1, y: 1, size: 1, opacity: 1, tone: 'base' });
      painter.dispose();
      painter.dispose();
      host.remove();
      return {
        failed,
        atomic,
        snapshot,
        issues,
        closed: !Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
      };
    }, candidate);
    expect(result.failed && result.atomic && result.closed).toBe(true);
    expect(result.snapshot.dots).toBe(4096);
    expect(result.snapshot.bytes).toBeLessThanOrEqual(262144);
    expect(result.snapshot.pixels).toBeLessThanOrEqual(1048576);
    expect(result.issues).toEqual(['dot-limit', 'invalid-dot']);
  });

test('M2 canvas: optimized drawing matches ordered circle pixels across frames', async ({
  page,
}) => {
  await boot(page, 'canvas');
  await page.evaluate(() => window.m2.dispose());
  const result = await page.evaluate(async () => {
    const { candidatePainter } = await import(
      String('/pkg/dist/internal/dense/painter.js')
    );
    const { acquireProjection } = await import(
      String('/pkg/dist/internal/dense/projection.js')
    );
    const { prepareRecipe } = await import(
      String('/pkg/dist/internal/dense/recipes.js')
    );
    const host = document.createElement('div');
    host.className = 'm2-block';
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const issues: string[] = [];
    const painter = candidatePainter('canvas')(host, (code: string) =>
      issues.push(code),
    );
    const recipe = prepareRecipe(
      acquireProjection(() => ({
        family: 'chart',
        input: {
          kind: 'line',
          baseline: 145,
          points: [
            { x: 20, y: 80 },
            { x: 60, y: 10 },
            { x: 60, y: 100 },
            { x: 300, y: 30 },
          ],
        },
      })).value,
      320,
      160,
    );
    type Command = {
      x: number;
      y: number;
      size: number;
      opacity: number;
      tone: string;
    };
    const frames: Command[][] = [];
    for (const time of [0, 350, 925]) {
      const commands: Command[] = [];
      recipe.idle(time, (dot: Command) => commands.push(dot));
      frames.push(commands);
    }
    for (const progress of [0, 0.2, 0.5, 0.65, 0.9, 1]) {
      const commands: Command[] = [];
      recipe.handoff(
        progress,
        (dot: Command) => commands.push(dot),
        () => {},
        () => {},
        [],
      );
      frames.push(commands);
    }
    frames.push(
      Array.from({ length: 200 }, (_, i) => ({
        x: ((i * 71) % 350) - 15.3,
        y: ((i * 37) % 180) - 10.7,
        size: i % 7 === 0 ? 0 : (i % 37) + 0.37,
        opacity: i % 9 === 0 ? 0 : (i % 15) / 12,
        tone: i % 3 === 0 ? 'accent' : 'base',
      })),
    );
    let differingChannels = 0;
    for (const commands of frames) {
      painter.draw((dot: (value: Command) => void) => commands.forEach(dot));
      const actual = host.shadowRoot?.querySelector(
        'canvas',
      ) as HTMLCanvasElement;
      const expected = document.createElement('canvas');
      expected.width = actual.width;
      expected.height = actual.height;
      const context = expected.getContext('2d') as CanvasRenderingContext2D;
      const css = getComputedStyle(host);
      const ratio = Math.min(2, devicePixelRatio);
      context.setTransform(
        ratio,
        0,
        0,
        ratio,
        parseFloat(css.paddingLeft) * ratio,
        parseFloat(css.paddingTop) * ratio,
      );
      for (const dot of commands) {
        context.fillStyle =
          css
            .getPropertyValue(
              dot.tone === 'accent'
                ? '--dotquilt-accent-color'
                : '--dotquilt-color',
            )
            .trim() || css.color;
        context.globalAlpha = Math.fround(
          Math.max(0, Math.min(1, dot.opacity)),
        );
        context.beginPath();
        context.arc(
          Math.fround(dot.x),
          Math.fround(dot.y),
          Math.fround(Math.max(0, Math.min(32, dot.size))),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      const a = actual
        .getContext('2d')
        ?.getImageData(0, 0, actual.width, actual.height)
        .data as Uint8ClampedArray;
      const b = context.getImageData(0, 0, actual.width, actual.height).data;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differingChannels++;
    }
    painter.dispose();
    host.remove();
    return {
      differingChannels,
      issues,
      released: !Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
  });
  expect(result).toEqual({ differingChannels: 0, issues: [], released: true });
});

test('M2 handoff: repeated reveal styles avoid effect writes without bypassing validation', async ({
  page,
}) => {
  await boot(page, 'canvas');
  const result = await page.evaluate(async () => {
    const { createHandoff } = await import(
      String('/pkg/dist/internal/handoff.js')
    );
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    window.m2.pause();
    await Promise.resolve();
    const region = document.getElementById('proof-region') as HTMLElement;
    const host = document.getElementById('proof-surface') as HTMLElement;
    const content = region.shadowRoot?.querySelector(
      '[part="content"]',
    ) as HTMLElement;
    const target = document.createElement('span');
    document.getElementById('proof-content')?.append(target);
    const effects: Animation[] = [];
    let invalid = false;
    const binding = defineAnimation({
      contractVersion: 1,
      id: 'example/repeated-reveal',
      family: 'region',
      phase: 'handoff',
      options: { parse: () => ({}) },
      duration: () => 300,
      prepare: () => ({}),
      frame({
        frame,
        reveal,
        revealTarget,
      }: {
        frame: { progress: number };
        reveal(value: object): void;
        revealTarget(id: string, value: object): void;
      }) {
        reveal({
          opacity: invalid ? Number.NaN : 0.5,
          translateY: 20 + frame.progress,
        });
        revealTarget('row', { opacity: 0.5, translateY: -20 - frame.progress });
      },
    })();
    const driver = createHandoff(
      binding,
      host,
      content,
      [{ id: 'row', element: target }],
      300,
      () => true,
      (animation: Animation) => effects.push(animation),
      () => {},
    );
    driver.draw(0);
    let writes = 0;
    for (const animation of effects) {
      const effect = animation.effect as KeyframeEffect;
      const original = effect.setKeyframes.bind(effect);
      effect.setKeyframes = (keys) => {
        writes++;
        original(keys);
      };
    }
    driver.draw(0.2);
    driver.draw(0.4);
    invalid = true;
    let invalidRejected = false;
    try {
      driver.draw(0.5);
    } catch {
      invalidRejected = true;
    }
    invalid = false;
    const competing = target.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 1000,
    });
    let conflictRejected = false;
    try {
      driver.draw(0.6);
    } catch {
      conflictRejected = true;
    }
    competing.cancel();
    driver.dispose();
    for (const animation of effects) animation.cancel();
    target.remove();
    window.m2.dispose();
    return { writes, owned: effects.length, invalidRejected, conflictRejected };
  });
  expect(result).toEqual({
    writes: 0,
    owned: 2,
    invalidRejected: true,
    conflictRejected: true,
  });
});

test('M2 canvas: bitmap/document admission and unavailable contexts release every reservation', async ({
  page,
}) => {
  await boot(page, 'canvas');
  await page.evaluate(() => window.m2.dispose());
  const result = await page.evaluate(async () => {
    const { candidatePainter } = await import(
      String('/pkg/dist/internal/dense/painter.js')
    );
    const style = document.createElement('style');
    style.textContent = '.huge{position:relative;width:5000px;height:5000px}';
    document.head.append(style);
    const all: { dispose(): void }[] = [];
    const roots: HTMLElement[] = [];
    let denied = 0;
    for (let i = 0; i < 5; i++) {
      const host = document.createElement('div');
      host.className = 'huge';
      host.attachShadow({ mode: 'open' });
      document.body.append(host);
      roots.push(host);
      const painter = candidatePainter('canvas')(host, () => {});
      all.push(painter);
      try {
        painter.draw((dot: (v: object) => void) =>
          dot({ x: 10, y: 10, size: 1, opacity: 1, tone: 'base' }),
        );
      } catch {
        denied++;
      }
    }
    const canvases = roots.flatMap((h) => [
      ...(h.shadowRoot?.querySelectorAll('canvas') ?? []),
    ]);
    const dimensions = canvases.map((c) => [c.width, c.height]);
    const pixels = Reflect.get(
      document,
      Symbol.for('dotquilt.v1.dot-ledger'),
    ).pixels;
    for (const painter of all) painter.dispose();
    for (const root of roots) root.remove();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof original;
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    let unavailable = false;
    try {
      candidatePainter('canvas')(host, () => {});
    } catch {
      unavailable = true;
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
      host.remove();
    }
    return {
      denied,
      dimensions,
      pixels,
      unavailable,
      closed: !Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
  });
  expect(result.denied).toBe(1);
  expect(result.unavailable && result.closed).toBe(true);
  expect(result.pixels).toBe(4194304);
  expect(
    result.dimensions.every(
      ([w = 0, h = 0]) => w <= 2048 && h <= 2048 && w * h <= 1048576,
    ),
  ).toBe(true);
});

test('M2 canvas: explicit stylesheet refresh updates cached color without per-frame style polling', async ({
  page,
}) => {
  await boot(page, 'canvas');
  await page.evaluate(() => window.m2.dispose());
  const result = await page.evaluate(async () => {
    const { candidatePainter } = await import(
      String('/pkg/dist/internal/dense/painter.js')
    );
    const { refreshStyles } = await import(String('/pkg/dist/index.js'));
    const host = document.createElement('dotquilt-skeleton-block');
    host.motion = 'paused';
    host.className = 'm2-block';
    document.body.append(host);
    await Promise.resolve();
    const style = document.createElement('style');
    style.textContent = '.m2-block{--dotquilt-color:rgb(10,20,30)}';
    document.head.append(style);
    await Promise.resolve();
    const painter = candidatePainter('canvas')(host, () => {});
    const draw = () =>
      painter.draw((dot: (v: object) => void) =>
        dot({ x: 10, y: 10, size: 3, opacity: 1, tone: 'base' }),
      );
    draw();
    const canvas = host.shadowRoot?.querySelector('canvas');
    if (!canvas) throw new Error('Missing canvas');
    const read = () => [
      ...(canvas.getContext('2d')?.getImageData(10, 10, 1, 1).data ?? []),
    ];
    const before = read();
    const rule = style.sheet?.cssRules[0] as CSSStyleRule | undefined;
    if (!rule) throw new Error('Missing fixture stylesheet');
    rule.style.setProperty('--dotquilt-color', 'rgb(40,50,60)');
    refreshStyles(host);
    draw();
    const after = read();
    painter.dispose();
    host.remove();
    return { before, after };
  });
  expect(result).toEqual({
    before: [10, 20, 30, 255],
    after: [40, 50, 60, 255],
  });
});

test('M2 active custom rendering uses invalidation rather than polling computed styles every frame', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.getComputedStyle.bind(window);
    let reads = 0;
    window.getComputedStyle = (element, pseudo) => {
      if (element.localName.startsWith('dotquilt-')) reads++;
      return original(element, pseudo);
    };
    let frames = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      request((time) => {
        frames++;
        callback(time);
      });
    Reflect.set(window, 'readProbe', () => ({ reads, frames }));
  });
  await boot(page, 'canvas');
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => Reflect.get(window, 'readProbe')());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => Reflect.get(window, 'readProbe')());
  expect(after.frames - before.frames).toBeGreaterThan(3);
  expect(after.reads - before.reads).toBeLessThanOrEqual(2);
});

test('M2 diagnostic snapshots and command-commit samples retain comparable inputs without claiming reference timing', async ({
  browserName,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(`.artifacts/m2/${browserName}`, { recursive: true });
  const results: unknown[] = [];
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:4181',
      deviceScaleFactor: dpr,
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    try {
      for (const family of ['line', 'bar', 'scatter', 'text', 'table'])
        for (const candidate of kinds) {
          await boot(page, candidate, family);
          const values: number[] = [];
          for (let i = 0; i < 23; i++) {
            const elapsed = await page.evaluate(
              async (p) => {
                const start = performance.now();
                await window.m2.sample(p);
                return performance.now() - start;
              },
              0.25 + (i % 8) * 0.075,
            );
            if (i >= 3) values.push(elapsed);
          }
          for (const phase of [0, 0.25, 0.55, 0.8, 1]) {
            await page.evaluate((p) => window.m2.sample(p), phase);
            await page.locator('#proof-region').screenshot({
              path: `.artifacts/m2/${browserName}/${family}-${candidate}-dpr${dpr}-${phase}.png`,
              animations: 'disabled',
            });
          }
          await page.evaluate(() => window.m2.sample(0.55));
          const state = await page.evaluate(() => {
            const host = document.getElementById('proof-surface');
            const bounds = host?.getBoundingClientRect();
            const ledger = Reflect.get(
              document,
              Symbol.for('dotquilt.v1.dot-ledger'),
            );
            return {
              width: bounds?.width,
              height: bounds?.height,
              dots: ledger?.dots,
              bytes: ledger?.bytes,
              pixels: ledger?.pixels,
              domNodes: host?.shadowRoot?.querySelectorAll('*').length,
              canvases: [
                ...(host?.shadowRoot?.querySelectorAll('canvas') ?? []),
              ].map((c) => [c.width, c.height]),
              projection: window.m2.projection,
              violations: window.m2.violations,
              issues: window.m2.issues,
              dpr: devicePixelRatio,
            };
          });
          expect(state.dots).toBe(360);
          expect(state.violations).toEqual([]);
          expect(state.issues).toEqual([]);
          results.push({
            family,
            candidate,
            rawJavaScriptCommandCommitMs: values,
            ...state,
          });
        }
    } finally {
      await context.close();
    }
  }
  const metadata = {
    project: testInfo.project.name,
    browser: browserName,
    engineVersion: browser.version(),
    measurement:
      'isolated JavaScript command generation and commit latency only; no whole rendering CPU, cadence, paired four-second reference protocol or hardware qualification claimed',
    warmups: 3,
    samples: 20,
    artifact: testInfo.config.metadata.artifactSha256,
    results,
  };
  await writeFile(
    `.artifacts/m2/${browserName}/comparison.json`,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
});

for (const candidate of kinds)
  test(`M2 ${candidate}: diagnostic normal/list/stress cohorts have real visibility and bounded shared resources`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(60000);
    const results: unknown[] = [];
    await page.setViewportSize({ width: 1280, height: 1000 });
    await boot(page, candidate);
    for (const profile of ['normal', 'list', 'stress'] as const) {
      await page.evaluate((p) => window.m2.cohort(p), profile);
      await expect
        .poll(() => page.evaluate(() => window.m2.cohortState().visible))
        .toBe(profile === 'normal' ? 24 : profile === 'list' ? 20 : 100);
      // Off-screen tiles release their dots once the IntersectionObserver
      // reports them. With the DOM candidate the first render creates ~16k
      // elements, and on slow CI runners that first delivery takes seconds.
      if (profile !== 'stress')
        await expect
          .poll(
            () => page.evaluate(() => window.m2.cohortState().ledger?.dots),
            { timeout: 20000 },
          )
          .toBe((profile === 'normal' ? 24 : 20) * 360);
      const state = await page.evaluate(() => window.m2.cohortState());
      results.push({ profile, ...state });
      expect(state.mounted).toBe(
        profile === 'normal' ? 24 : profile === 'list' ? 200 : 100,
      );
      expect(state.ledger.dots).toBeLessThanOrEqual(16384);
      expect(state.ledger.bytes).toBeLessThanOrEqual(2097152);
      expect(state.ledger.pixels).toBeLessThanOrEqual(4194304);
      await page.evaluate(() => window.m2.dispose());
      await expect
        .poll(() =>
          page.evaluate(() => [
            Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
            Reflect.has(document, Symbol.for('dotquilt.view.v1')),
            Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
          ]),
        )
        .toEqual([false, false, false]);
    }
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(`.artifacts/m2/${browserName}`, { recursive: true });
    await writeFile(
      `.artifacts/m2/${browserName}/cohort-${candidate}.json`,
      JSON.stringify(
        {
          artifact: testInfo.config.metadata.artifactSha256,
          candidate,
          viewport: [1280, 1000],
          dpr: 1,
          motion:
            'paused admission/visibility diagnostics; not timing protocol',
          results,
        },
        null,
        2,
      ),
    );
  });

test('M2 actual row effects stagger, retain node identity and relinquish styles on completion', async ({
  page,
}) => {
  await boot(page, 'canvas', 'table');
  await page.evaluate(() => window.m2.reveal(1200));
  await expect(page.locator('#proof-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const rows = document.querySelectorAll('#proof-content tr');
        const first = rows[0],
          last = rows[5];
        if (!first || !last) throw new Error('Missing owned row targets');
        return (
          Number(getComputedStyle(first).opacity) -
          Number(getComputedStyle(last).opacity)
        );
      }),
    )
    .toBeGreaterThan(0.1);
  await expect(page.locator('#proof-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('#proof-content tr')].every(
        (row) =>
          !row.getAnimations().length && getComputedStyle(row).opacity === '1',
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.getElementById('proof-content') === window.m2.identity,
    ),
  ).toBe(true);
});

test('M2 dense active cohort uses one outstanding frame request and pause releases it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pending = new Set<number>();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    Reflect.set(window, 'frameProbe', () => pending.size);
  });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await boot(page, 'canvas');
  await page.evaluate(() => {
    window.m2.cohort('normal');
    window.m2.cohortMotion('system');
  });
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'frameProbe')()))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.m2.cohortState().ledger.dots))
    .toBe(8640);
  await page.evaluate(() => window.m2.cohortMotion('paused'));
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'frameProbe')()))
    .toBe(0);
  expect(
    await page.evaluate(() =>
      Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
    ),
  ).toBe(false);
  await page.evaluate(() => {
    window.m2.cohort('stress');
    window.m2.cohortMotion('system');
  });
  await expect
    .poll(() => page.evaluate(() => window.m2.cohortState().ledger.users))
    .toBeLessThanOrEqual(46);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'frameProbe')()))
    .toBe(1);
  await page.evaluate(() => window.m2.cohortMotion('paused'));
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'frameProbe')()))
    .toBe(0);
  await page.evaluate(() => window.m2.dispose());
});
