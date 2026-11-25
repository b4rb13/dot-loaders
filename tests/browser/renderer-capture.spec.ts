import { expect, test } from '@playwright/test';

for (const backend of ['available', 'unavailable'])
  test(`outgoing rich source uses committed numeric primitives, not mutable SVG attributes (${backend})`, async ({
    page,
  }) => {
    if (backend === 'unavailable')
      await page.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = (() =>
          null) as typeof HTMLCanvasElement.prototype.getContext;
      });
    await page.goto('/m2/catalog?profile=individual&family=chart-line');
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async () => {
      const native = (await import(
        String('/pkg/dist/index.js')
      )) as typeof import('../../packages/core/dist/index');
      const { defineAnimation } = (await import(
        String('/pkg/dist/animations.js')
      )) as typeof import('../../packages/core/dist/animations');
      let captured: readonly { x: number; y: number }[] = [];
      const region = document.createElement('dotquilt-region') as InstanceType<
        typeof native.LoadingRegion
      >;
      const chart = document.createElement(
        'dotquilt-chart-loader',
      ) as InstanceType<typeof native.ChartLoader>;
      region.state = 'pending';
      region.motion = 'paused';
      chart.slot = 'placeholder';
      chart.animations = {
        idle: defineAnimation({
          contractVersion: 1,
          id: 'test/capture-idle',
          family: 'chart',
          phase: 'idle',
          options: { parse: () => ({}) },
          still(ctx) {
            ctx.dot({
              x: 1 / 3,
              y: 12.125,
              size: 2,
              opacity: 0.5,
              tone: 'accent',
            });
          },
          frame(ctx) {
            ctx.dot({
              x: 1 / 3,
              y: 12.125,
              size: 2,
              opacity: 0.5,
              tone: 'accent',
            });
          },
        })(),
        handoff: defineAnimation({
          contractVersion: 1,
          id: 'test/capture-handoff',
          family: 'chart',
          phase: 'handoff',
          options: { parse: () => ({}) },
          duration: () => 100,
          prepare(surface) {
            captured = surface.source;
            return null;
          },
          frame(ctx) {
            ctx.reveal({ opacity: ctx.frame.progress });
          },
        })(),
      };
      region.append(chart, document.createElement('article'));
      document.body.append(region);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      for (const circle of chart.shadowRoot?.querySelectorAll('circle') ?? [])
        circle.setAttribute('cx', '99');
      region.update({ state: 'ready', motion: 'system' });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const source = [...captured].map((d) => ({ x: d.x, y: d.y }));
      const frozen =
        Object.isFrozen(captured) && captured.every(Object.isFrozen);
      region.remove();
      return { source, frozen };
    });
    expect(result).toEqual({ source: [{ x: 1 / 3, y: 12.125 }], frozen: true });
  });

for (const dpr of [1, 2, 3])
  test(`scrolling catalog admits only visible rich Canvas resources at DPR ${dpr}`, async ({
    browser,
    browserName,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: dpr,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4181/m2/catalog?profile=list&phase=idle');
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async (browserName) => {
      const errors: unknown[] = [];
      document.addEventListener('dotquilt-error', (event) =>
        errors.push((event as CustomEvent).detail),
      );
      // The loaders' idle motion starts after this, so it may stop no
      // sooner than 4 s from here.
      const opened = performance.now();
      await window.catalogFixture.prepare();
      const running = window.catalogFixture.run(true);
      const rows = [];
      const container = document.getElementById('bench');
      if (!container) throw Error('Missing scrolling fixture');
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const unpainted = (ids: readonly string[]) =>
        ids.filter((id) => {
          const host = document.getElementById(id);
          if (!host) throw Error('Missing visible catalog host');
          return (
            /chart|table|text-loader/.test(host.localName) &&
            !host.shadowRoot?.querySelector('[data-dotquilt-painter]')
          );
        });
      // Surfaces that left the view and still hold a canvas.
      const held = (visibleIds: readonly string[]) =>
        [...document.querySelectorAll('.catalog-surface')].filter(
          (host) =>
            !visibleIds.includes(host.id) &&
            host.shadowRoot?.querySelector('canvas[data-dotquilt-bitmap]'),
        );
      for (const top of [0, 960, 2400, 4320, 2400, 0]) {
        container.scrollTop = top;
        // Newly visible surfaces get their painter within a few frames; a
        // slow runner may need more than three. Firefox can report the
        // surfaces that left only several frames later (its intersection
        // notifications wait while frames are busy), so there the wait also
        // covers releasing their canvases.
        for (let waited = 0; waited < 30; waited++) {
          await frame();
          const { visibleIds } = window.catalogFixture.snapshot();
          if (
            waited >= 2 &&
            !unpainted(visibleIds).length &&
            (browserName !== 'firefox' || !held(visibleIds).length)
          )
            break;
        }
        const snapshot = window.catalogFixture.snapshot();
        const visible = new Set(snapshot.visibleIds);
        rows.push({
          top,
          at: performance.now() - opened,
          moving: snapshot.visibleIds.filter((id) =>
            document.getElementById(id)?.hasAttribute('data-moving'),
          ).length,
          visible: snapshot.visible,
          ledger: snapshot.ledger,
          canvases: snapshot.canvases,
          missing: unpainted(snapshot.visibleIds),
          offscreen: held([...visible]).map((host) => host.id),
        });
      }
      await running;
      const cleanup = await window.catalogFixture.teardown();
      return { rows, errors, cleanup };
    }, browserName);
    await context.close();
    expect(result.errors).toEqual([]);
    expect(result.cleanup).toEqual({
      drawing: false,
      frames: false,
      views: false,
    });
    for (const row of result.rows) {
      expect(row.visible).toBe(20);
      expect(row.missing).toEqual([]);
      expect(row.offscreen).toEqual([]);
      // Moving loaders draw with Canvas. Idle motion stops after 4 s, and
      // still loaders draw SVG: a slow runner (Firefox on CI) can reach the
      // last stops after that, but never before.
      if (row.moving) expect(row.canvases.length).toBeGreaterThan(0);
      else expect(row.at).toBeGreaterThanOrEqual(4000);
      expect(row.ledger?.pixels ?? 0).toBeLessThanOrEqual(4194304);
      expect(row.ledger?.bytes ?? 0).toBeLessThanOrEqual(2097152);
      expect(
        row.canvases.every(
          (canvas) =>
            canvas.width <= 2048 &&
            canvas.height <= 2048 &&
            canvas.width * canvas.height <= 1048576,
        ),
      ).toBe(true);
    }
  });

for (const fallback of ['context', 'bitmap', 'buffer'] as const)
  test(`rich idle and reveal survive ${fallback} admission failure with SVG`, async ({
    page,
  }) => {
    if (fallback === 'context')
      await page.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = (() =>
          null) as typeof HTMLCanvasElement.prototype.getContext;
      });
    await page.goto('/m2/catalog?profile=normal&phase=handoff');
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async (reason) => {
      const ledgerKey = Symbol.for('dotquilt.v1.dot-ledger');
      const reserved =
        reason === 'bitmap'
          ? { pixels: 4194304, bytes: 0 }
          : reason === 'buffer'
            ? { pixels: 0, bytes: 2097152 }
            : null;
      if (reserved)
        Reflect.set(document, ledgerKey, { dots: 0, users: 1, ...reserved });
      await window.catalogFixture.prepare();
      const rich = [
        ...document.querySelectorAll(
          'dotquilt-chart-loader,dotquilt-table-loader',
        ),
      ];
      const before = rich.map((host) => ({
        circles: host.shadowRoot?.querySelectorAll('circle').length ?? 0,
        canvas: !!host.shadowRoot?.querySelector('canvas'),
      }));
      const result = await window.catalogFixture.run(true);
      if (reserved) {
        const ledger = Reflect.get(document, ledgerKey);
        ledger.users--;
        ledger.pixels -= reserved.pixels;
        ledger.bytes -= reserved.bytes;
        if (!ledger.users) Reflect.deleteProperty(document, ledgerKey);
      }
      const cleanup = await window.catalogFixture.teardown();
      return { before, result, cleanup };
    }, fallback);
    expect(result.before.length).toBe(6);
    expect(
      result.before.every((host) => host.circles > 0 && !host.canvas),
    ).toBe(true);
    expect(result.result.final.ready).toBe(10);
    expect(result.result.final.catalog.identitiesRetained).toBe(true);
    expect(
      result.result.errors.some((error) => error.code === 'animation-failed'),
    ).toBe(false);
    expect(result.result.final.violations).toEqual([]);
    expect(result.cleanup).toEqual({
      drawing: false,
      frames: false,
      views: false,
    });
  });

test('a lost Canvas context releases its bitmap and continues rich motion in SVG without replay', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&family=chart-line&phase=idle',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  await page.evaluate(async () => {
    await window.catalogFixture.prepare();
    Reflect.set(window, 'contextLossRun', window.catalogFixture.run(true));
  });
  await expect(page.locator('canvas[data-dotquilt-bitmap]')).toBeVisible();
  await page
    .locator('canvas[data-dotquilt-bitmap]')
    .dispatchEvent('contextlost');
  await expect
    .poll(() => page.locator('[data-dotquilt-painter] circle').count(), {
      timeout: 1000,
    })
    .toBeGreaterThan(0);
  const result = await page.evaluate(async () => {
    const source = document.querySelector('dotquilt-chart-loader');
    const active = source?.hasAttribute('data-moving');
    const ledger = {
      ...Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
    const cleanup = await window.catalogFixture.teardown();
    return { active, ledger, cleanup };
  });
  expect(result.active).toBe(true);
  expect(result.ledger.pixels ?? 0).toBe(0);
  expect(result.ledger.bytes ?? 0).toBe(0);
  expect(result.cleanup).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

for (const family of ['chart-line', 'table'])
  test(`the initial ${family} handoff keeps its committed bitmap through queued invalidation`, async ({
    page,
  }) => {
    const start = new Date('2026-10-21T00:00:00Z');
    await page.clock.install({ time: start });
    await page.goto(
      `/m2/catalog?profile=individual&family=${family}&phase=handoff`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    await page.clock.pauseAt(new Date(start.getTime() + 1000));
    await page.evaluate(() =>
      Reflect.set(window, 'initialPrepare', window.catalogFixture.prepare()),
    );
    await page.clock.runFor(64);
    await page.evaluate(() => Reflect.get(window, 'initialPrepare'));
    const result = await page.evaluate(async () => {
      Reflect.set(window, 'initialRun', window.catalogFixture.run(true));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      const host = document.querySelector(
        'dotquilt-chart-loader,dotquilt-table-loader',
      );
      const bitmap = host?.shadowRoot?.querySelector('canvas');
      return {
        width: bitmap?.width ?? 0,
        height: bitmap?.height ?? 0,
        particles:
          Reflect.get(
            host ?? {},
            Symbol.for('dotquilt.painter.v1'),
          )?.capture?.().length ?? 0,
      };
    });
    expect(result.particles).toBeGreaterThan(0);
    expect(result.width * result.height).toBeGreaterThan(0);
    await page.clock.runFor(1200);
    await page.evaluate(() => window.catalogFixture.teardown());
  });

for (const customization of [
  'fill-opacity:.4',
  'transform:scale(1.25)',
  'shape-rendering:crispEdges',
])
  test(`SVG-specific surface customization ${customization} retains SVG output`, async ({
    page,
  }) => {
    await page.goto(
      '/m2/catalog?profile=individual&family=chart-line&phase=idle',
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    await page.addStyleTag({
      content: `dotquilt-chart-loader::part(surface){${customization}}`,
    });
    await page.evaluate(async () => {
      await window.catalogFixture.prepare();
      Reflect.set(window, 'customizationRun', window.catalogFixture.run(true));
    });
    await expect(
      page.locator('[data-dotquilt-painter] circle').first(),
    ).toBeVisible();
    expect(await page.locator('canvas[data-dotquilt-bitmap]').count()).toBe(0);
    await page.evaluate(() => window.catalogFixture.teardown());
  });

for (const family of ['chart-line', 'table'])
  test(`paused ${family} refresh retains its SVG painter and live styling before Canvas resumes`, async ({
    page,
  }) => {
    await page.goto(
      `/m2/catalog?profile=individual&family=${family}&phase=idle`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async () => {
      await window.catalogFixture.prepare();
      const host = document.querySelector('.catalog-surface') as HTMLElement & {
        refresh(): void;
      };
      const first = host.shadowRoot?.querySelector(
        'svg[data-dotquilt-painter]',
      );
      const dot = first?.querySelector('circle');
      if (!first || !dot) throw Error('Missing paused painter');
      const source = JSON.stringify(
        Reflect.get(host, Symbol.for('dotquilt.painter.v1')).capture(),
      );
      host.style.setProperty('--dotquilt-color', 'rgb(82, 113, 97)');
      for (let i = 0; i < 3; i++) {
        host.refresh();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }
      const current = host.shadowRoot?.querySelector(
        'svg[data-dotquilt-painter]',
      );
      const stable =
        current === first && current.querySelector('circle') === dot;
      const color = getComputedStyle(
        current?.querySelector('circle') ?? host,
      ).fill;
      const sameSource =
        source ===
        JSON.stringify(
          Reflect.get(host, Symbol.for('dotquilt.painter.v1')).capture(),
        );
      const running = window.catalogFixture.run(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = host.shadowRoot?.querySelector('canvas');
      const resumed = !!canvas?.width && !!canvas.height;
      const active = await running;
      const cleanup = await window.catalogFixture.teardown();
      return {
        stable,
        color,
        sameSource,
        resumed,
        errors: active.errors,
        cleanup,
      };
    });
    expect(result).toEqual({
      stable: true,
      color: 'rgb(82, 113, 97)',
      sameSource: true,
      resumed: true,
      errors: [],
      cleanup: { drawing: false, frames: false, views: false },
    });
  });

for (const family of ['chart-line', 'table'])
  test(`active ${family} refresh reuses admitted Canvas and its bounded command buffer`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      let buffers = 0;
      Reflect.set(
        window,
        'Float64Array',
        new Proxy(Float64Array, {
          construct(target, args) {
            if (args[0] === 4096 * 5) buffers++;
            return Reflect.construct(target, args);
          },
        }),
      );
      Reflect.set(window, 'readPainterBuffers', () => buffers);
    });
    await page.goto(
      `/m2/catalog?profile=individual&family=${family}&phase=idle`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async () => {
      await window.catalogFixture.prepare();
      const running = window.catalogFixture.run(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const host = document.querySelector('.catalog-surface') as HTMLElement & {
        refresh(): void;
      };
      const first = host.shadowRoot?.querySelector('canvas');
      if (!first?.width || !first.height) throw Error('Missing active bitmap');
      const buffers = Reflect.get(window, 'readPainterBuffers')();
      for (let i = 0; i < 3; i++) {
        host.refresh();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }
      const current = host.shadowRoot?.querySelector('canvas');
      const retained =
        first === current && !!current?.width && !!current.height;
      const allocated = Reflect.get(window, 'readPainterBuffers')() - buffers;
      const active = await running;
      const cleanup = await window.catalogFixture.teardown();
      return { retained, allocated, errors: active.errors, cleanup };
    });
    expect(result).toEqual({
      retained: true,
      allocated: 0,
      errors: [],
      cleanup: { drawing: false, frames: false, views: false },
    });
  });

for (const family of ['chart-line', 'table'])
  test(`ready ${family} from pause avoids a discarded idle bitmap before handoff`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      let contexts = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof original>
      ) {
        if (args[0] === '2d') contexts++;
        return original.apply(this, args);
      } as typeof original;
      Reflect.set(window, 'readPainterContexts', () => contexts);
    });
    await page.goto(
      `/m2/catalog?profile=individual&family=${family}&phase=handoff`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async () => {
      await window.catalogFixture.prepare();
      const before = Reflect.get(window, 'readPainterContexts')();
      const active = await window.catalogFixture.run(true);
      const contexts = Reflect.get(window, 'readPainterContexts')() - before;
      const cleanup = await window.catalogFixture.teardown();
      return {
        contexts,
        ready: active.final.ready,
        errors: active.errors,
        reasons: active.catalog.terminal
          .filter((event) => event.type === 'dotquilt-handoff-end')
          .map((event) => event.reason),
        cleanup,
      };
    });
    expect(result).toEqual({
      contexts: 1,
      ready: 1,
      errors: [],
      reasons: ['complete'],
      cleanup: { drawing: false, frames: false, views: false },
    });
  });

for (const conflict of ['none', 'target', 'pseudo', 'unrelated'])
  test(`Table handoff preserves application effects (${conflict})`, async ({
    page,
  }) => {
    await page.goto(
      '/m2/catalog?profile=individual&family=table&phase=handoff',
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async (conflict) => {
      await window.catalogFixture.prepare();
      const owner = document.querySelector('dotquilt-region') as HTMLElement & {
        revealTargets: readonly { id: string; element: HTMLElement }[];
      };
      const rows = owner.revealTargets.map((target) => target.element);
      const appTarget =
        conflict === 'target' ? rows[0] : document.createElement('span');
      if (!appTarget) throw Error('Missing reveal target');
      if (conflict === 'unrelated') owner.append(appTarget);
      if (conflict === 'pseudo')
        rows[0]?.setAttribute('data-pseudo-conflict', '');
      const running = window.catalogFixture.run(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const style = document.createElement('style');
      if (conflict === 'pseudo') {
        style.textContent =
          '[data-pseudo-conflict]::before{content:"";animation:dq-conflict 10s infinite}@keyframes dq-conflict{from{opacity:0}to{opacity:1}}';
        document.head.append(style);
      }
      const animation =
        conflict === 'target' || conflict === 'unrelated'
          ? appTarget.animate(
              { opacity: [0.2, 0.8] },
              { duration: 10000, fill: 'both' },
            )
          : undefined;
      const active = await running;
      animation?.cancel();
      style.remove();
      if (conflict === 'unrelated') appTarget.remove();
      const cleanup = await window.catalogFixture.teardown();
      return {
        ready: active.final.ready,
        errors: active.errors,
        reasons: active.catalog.terminal
          .filter((event) => event.type === 'dotquilt-handoff-end')
          .map((event) => event.reason),
        cleanup,
      };
    }, conflict);
    expect(result.ready).toBe(1);
    expect(result.reasons).toEqual([
      conflict === 'target' ? 'fallback' : 'complete',
    ]);
    expect(result.cleanup).toEqual({
      drawing: false,
      frames: false,
      views: false,
    });
    if (conflict === 'target')
      expect(
        result.errors.some((error) => error.code === 'animation-failed'),
      ).toBe(true);
    else expect(result.errors).toEqual([]);
  });

for (const backend of ['svg', 'canvas'] as const)
  test(`the ${backend} painter caps dots, rejects invalid and late dots and releases its reservations`, async ({
    page,
  }) => {
    await page.goto('/m2/catalog?profile=individual&family=chart-line');
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async (backend) => {
      const { createPainter } = (await import(
        String('/pkg/dist/internal/painter.js')
      )) as typeof import('../../packages/core/dist/internal/painter');
      const { managedPainter } = (await import(
        String('/pkg/dist/internal/dense/managed-painter.js')
      )) as typeof import('../../packages/core/dist/internal/dense/managed-painter');
      type Dot = import('../../packages/core/dist/animations').Dot;
      const key = Symbol.for('dotquilt.v1.dot-ledger');
      const ledger = () => ({ ...Reflect.get(document, key) });
      const host = document.createElement('div');
      Object.assign(host.style, {
        position: 'fixed',
        inset: '0 auto auto 0',
        width: '320px',
        height: '160px',
      });
      const shadow = host.attachShadow({ mode: 'open' });
      document.body.append(host);
      const before = ledger();
      const issues: string[] = [];
      const report = (code: string) => issues.push(code);
      const painter =
        backend === 'svg'
          ? createPainter(host, report)
          : managedPainter(host, report);
      const dot = (x: number): Dot => ({
        x,
        y: 10,
        size: 2,
        opacity: 0.5,
        tone: 'base',
      });
      painter.draw((emit) => emit(dot(10)));
      let thrown = false;
      try {
        painter.draw((emit) => {
          emit(dot(50));
          throw new Error('author failure');
        });
      } catch {
        thrown = true;
      }
      painter.draw((emit) => emit({ ...dot(1), x: Number.NaN }));
      let late: ((value: Dot) => void) | undefined;
      painter.draw((emit) => {
        late = emit;
        for (let i = 0; i < 4097; i++) emit(dot(i % 300));
      });
      const during = ledger();
      const bitmap = shadow.querySelector<HTMLCanvasElement>(
        'canvas[data-dotquilt-bitmap]',
      );
      const canvas = !!bitmap?.width;
      const drawn =
        painter.capture?.().length ??
        shadow.querySelectorAll('svg[data-dotquilt-painter] circle').length;
      late?.(dot(1));
      const afterLate =
        painter.capture?.().length ??
        shadow.querySelectorAll('svg[data-dotquilt-painter] circle').length;
      painter.dispose();
      painter.dispose();
      const left = shadow.querySelectorAll('[data-dotquilt-painter]').length;
      // Disposing frees the bitmap before the element is dropped.
      const bitmapFreed = !bitmap || bitmap.width * bitmap.height === 0;
      host.remove();
      return {
        thrown,
        canvas,
        bitmapFreed,
        reserved: (during.dots ?? 0) - (before.dots ?? 0),
        released: (ledger().dots ?? 0) - (before.dots ?? 0),
        drawn,
        afterLate,
        left,
        issues,
      };
    }, backend);
    expect(result).toEqual({
      thrown: true,
      canvas: backend === 'canvas',
      bitmapFreed: true,
      reserved: 4096,
      released: 0,
      drawn: 4096,
      afterLate: 4096,
      left: 0,
      issues: ['invalid-dot', 'dot-limit'],
    });
  });
