import { expect, test } from '@playwright/test';
import type { ChartLoader } from 'dotquilt/chart';
import type { LoadingRegion } from 'dotquilt/region';
import { capture } from '../capture';
import { expectPaint, paintCount, readPaint } from '../paint-output';

declare global {
  interface Window {
    m4Chart: {
      errors: string[];
      events: { type: string; reason?: string; animation?: string }[];
      violations: string[];
      provider(mode: string): void;
      calls(): number;
      update(patch: Parameters<ChartLoader['update']>[0]): void;
      ready(duration?: number, easing?: string): void;
      pending(cycle?: string): void;
      recipe(
        name:
          | 'ridge'
          | 'scan'
          | 'terrain'
          | 'bars'
          | 'scatter'
          | 'cycle'
          | 'morphWipe',
        options?: object,
      ): void;
      custom(): void;
      broken(): void;
      preset(): void;
      customFrames(): number;
      frozen(): boolean;
      stale(): void;
      identity(): boolean;
      detach(): void;
    };
    m4ChartReact: {
      errors: string[];
      events: string[];
      change(state: 'pending' | 'ready' | 'refreshing'): void;
      identity(): boolean;
      ref(): string;
      unmount(): void;
    };
  }
}
// The chart's painted dots: Canvas commands or SVG circles (tests/paint-output).
const chart = '#chart';
for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  test(`native chart static enhancement, actual geometry and CSP: ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/chart?mode=${mode}`);
    await expectPaint(page.locator(chart));
    expect(await page.evaluate(() => window.m4Chart.calls())).toBe(0);
    await page.evaluate(() => window.m4Chart.ready());
    await expect(page.locator('#chart-region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(await page.evaluate(() => window.m4Chart.calls())).toBe(1);
    await expect(page.locator('#chart-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => ({
        errors: window.m4Chart.errors,
        csp: window.m4Chart.violations,
        identity: window.m4Chart.identity(),
      })),
    ).toEqual({ errors: [], csp: [], identity: true });
    await expect.poll(() => paintCount(page.locator(chart))).toBe(0);
  });
  test(`React chart hydration/property bridge and owned content identity: ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/chart-react?mode=${mode}`);
    await expectPaint(page.locator(chart));
    expect(await page.evaluate(() => window.m4ChartReact.ref())).toBe(
      'dotquilt-chart-loader',
    );
    await page.evaluate(() => window.m4ChartReact.change('ready'));
    await expect(page.locator('#chart-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => ({
        errors: window.m4ChartReact.errors,
        events: window.m4ChartReact.events,
        identity: window.m4ChartReact.identity(),
      })),
    ).toEqual({ errors: [], events: ['start', 'end'], identity: true });
    await page.evaluate(() => window.m4ChartReact.unmount());
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      ),
    ).toBeUndefined();
  });
}
test('all six idle silhouettes and all three final geometries: fixed progress and natural playback', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(150000);
  const names = [
    'ridge',
    'scan',
    'terrain',
    'bars',
    'scatter',
    'cycle',
  ] as const;
  // Natural-speed playback in its own context, so motion is not restricted.
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL ?? 'http://127.0.0.1:4194',
    reducedMotion: 'no-preference',
    viewport: { width: 640, height: 480 },
  });
  try {
    // One page per variant, side by side: each still plays every idle and its
    // handoff at natural speed, in a third of the time.
    await Promise.all(
      ['line', 'bar', 'scatter'].map(async (variant) => {
        const live = await context.newPage();
        for (const name of names) {
          await live.goto(`/chart?variant=${variant}`);
          await expectPaint(live.locator(chart));
          await live.evaluate((n) => window.m4Chart.recipe(n), name);
          await live.waitForTimeout(150);
          await live.evaluate(() => window.m4Chart.ready());
          await expect(live.locator('#chart-region')).toHaveAttribute(
            'data-presentation',
            'ready',
          );
          expect(await live.evaluate(() => window.m4Chart.errors)).toEqual([]);
        }
      }),
    );
  } finally {
    await context.close();
  }
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  for (const variant of ['line', 'bar', 'scatter'])
    for (const name of names) {
      await page.goto(`/chart?variant=${variant}`);
      await page.clock.runFor(50);
      await page.evaluate((n) => window.m4Chart.recipe(n), name);
      await page.clock.runFor(100);
      // Commit one idle draw at the paused inspection time. Otherwise the last
      // RAF can land a millisecond earlier depending on clock installation.
      await page.evaluate(() => {
        (document.getElementById('chart') as ChartLoader).refresh();
      });
      await page.evaluate(() => window.m4Chart.ready(900, 'linear'));
      await page.evaluate(() => {
        for (const a of document
          .getElementById('chart-region')
          ?.shadowRoot?.getAnimations() ?? [])
          if (a.effect?.getTiming().duration === 900) a.pause();
      });
      for (const [index, advance] of [0, 225, 270, 225, 180].entries()) {
        await page.clock.runFor(advance);
        await page.evaluate((index) => {
          const host = document.getElementById('chart-region') as LoadingRegion;
          for (const animation of host.shadowRoot?.getAnimations() ?? [])
            if (animation.effect?.getTiming().duration === 900)
              animation.currentTime = [0, 225, 495, 720, 900][index] ?? 900;
          Reflect.get(host, 'frame').call(host);
          for (const animation of host.shadowRoot?.getAnimations() ?? [])
            if (animation.effect?.getTiming().duration === 1) {
              animation.pause();
              animation.currentTime = 1;
            }
        }, index);
        await capture(page, {
          path: testInfo.outputPath(
            `chart-fixed-${variant}-${name}-${index}.png`,
          ),
          animations: 'allow',
        });
      }
      await expect(page.locator('#chart-region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.m4Chart.identity())).toBe(true);
    }
});
test('provider null retries twice, invalid/throwing/oversize settles with bounded diagnostics and valid recovery', async ({
  page,
}) => {
  for (const [mode, calls] of [
    ['null', 2],
    ['throw', 1],
    ['oversize', 1],
    ['nan', 1],
    ['retry', 2],
    ['valid', 1],
  ] as const) {
    await page.goto('/chart');
    await expectPaint(page.locator(chart));
    await page.evaluate((m) => window.m4Chart.provider(m), mode);
    await page.evaluate(() => window.m4Chart.ready());
    await expect(page.locator('#chart-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.m4Chart.calls())).toBe(calls);
    expect(await page.evaluate(() => window.m4Chart.identity())).toBe(true);
    expect(await page.evaluate(() => window.m4Chart.errors)).toEqual(
      ['throw', 'oversize', 'nan'].includes(mode) ? ['invalid-geometry'] : [],
    );
  }
});
test('custom authoring gets immutable semantic input and inferred prepared state; stale commands cannot hide settled content', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.custom());
  await expect
    .poll(() => page.evaluate(() => window.m4Chart.customFrames()))
    .toBeGreaterThan(0);
  await page.evaluate(() => window.m4Chart.ready());
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  expect(await page.evaluate(() => window.m4Chart.frozen())).toBe(true);
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.evaluate(() => window.m4Chart.stale());
  expect(
    await page
      .locator('#chart-region')
      .evaluate(
        (e) =>
          getComputedStyle(e.shadowRoot?.querySelector('.c') as Element)
            .opacity,
      ),
  ).toBe('1');
  expect(await page.evaluate(() => window.m4Chart.errors)).toEqual([]);
});
test('focus wins during reveal; refreshing retains interactive useful content and has no replacement replay', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.ready(1500));
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.locator('#chart-control').focus();
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator('#chart-control')).toBeFocused();
  await page
    .locator('#chart-region')
    .evaluate((e) => ((e as LoadingRegion).state = 'refreshing'));
  await expect(page.locator('#chart-control')).toBeVisible();
  await expect(page.locator('#chart-control')).toBeFocused();
  await page.evaluate(() => window.m4Chart.ready());
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => window.m4Chart.events.map((e) => e.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
});
test('supersession and removal cancel once with no old completion or scheduling; disconnect releases provider references', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  // These actions test cancellation before completion. Protocol round trips
  // between them must not consume the bounded real loading window.
  const result = await page.evaluate(async () => {
    const region = document.getElementById('chart-region') as HTMLElement,
      chart = document.getElementById('chart') as ChartLoader,
      states: (string | null)[] = [];
    window.m4Chart.ready(1000);
    await Promise.resolve();
    states.push(region.getAttribute('data-presentation'));
    window.m4Chart.pending();
    await Promise.resolve();
    states.push(region.getAttribute('data-presentation'));
    window.m4Chart.ready(1000);
    await Promise.resolve();
    states.push(region.getAttribute('data-presentation'));
    region.remove();
    return { states, released: chart.targetProvider === undefined };
  });
  expect(result).toEqual({
    states: ['handoff', 'pending', 'handoff'],
    released: true,
  });
  expect(
    await page.evaluate(() => window.m4Chart.events.map((e) => e.type)),
  ).toEqual([
    'dotquilt-handoff-start',
    'dotquilt-handoff-cancel',
    'dotquilt-handoff-start',
    'dotquilt-handoff-cancel',
  ]);
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
test('reduced motion, pause, forced colors and four-second exhaustion remain static without replay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/chart');
  await expect(page.locator('#chart')).not.toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4Chart.ready());
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/chart');
  await page.clock.runFor(200);
  await page.evaluate(() => window.m4Chart.update({ motion: 'paused' }));
  await page.clock.runFor(5000);
  await page.evaluate(() => window.m4Chart.update({ motion: 'system' }));
  await page.clock.runFor(50);
  await expect(page.locator('#chart')).not.toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4Chart.ready());
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
    ),
  ).toBeUndefined();
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/chart');
  await page.clock.runFor(50);
  await expect.poll(() => paintCount(page.locator(chart))).toBe(0);
});
test('content mutation, resize and provider reentrancy discard stale plans; normal option changes remain captured', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.ready(1500));
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => window.m4Chart.recipe('morphWipe', { edge: 80 }));
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page
    .locator('#chart-content')
    .evaluate((e) => e.append(document.createTextNode(' updated')));
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.locator('#chart').evaluate((e) => {
    (e as ChartLoader).targetProvider = () => {
      (document.getElementById('chart-region') as LoadingRegion).update({
        state: 'pending',
        cycle: 'reentrant',
      });
      return { kind: 'scatter', points: [{ x: 1, y: 1 }] };
    };
  });
  await page.evaluate(() => window.m4Chart.ready());
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  expect(await page.evaluate(() => window.m4Chart.events)).toEqual([]);
  await page.locator('#chart-region').evaluate((e) => e.remove());
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toBeUndefined();
});
test('preset precedence, removed overrides, standalone no sampling, pointer policy and pre-upgrade properties', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.preset());
  expect(
    await page
      .locator('#chart')
      .evaluate((e) => [(e as ChartLoader).variant, (e as ChartLoader).speed]),
  ).toEqual(['line', 0.6]);
  await page.evaluate(() => window.m4Chart.update({ variant: undefined }));
  expect(
    await page.locator('#chart').evaluate((e) => (e as ChartLoader).variant),
  ).toBe('scatter');
  await page.locator('#chart').evaluate((e) => {
    const loader = e as ChartLoader,
      region = document.getElementById('chart-region');
    document.body.append(loader);
    let sampled = 0;
    loader.targetProvider = () => {
      sampled++;
      return null;
    };
    Reflect.set(window, 'standaloneCalls', () => sampled);
    region?.remove();
    loader.pointerResponse = 'lift';
  });
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => Reflect.get(window, 'standaloneCalls')()),
  ).toBe(0);
  await page.locator('#chart').dispatchEvent('pointermove', {
    clientX: 20,
    clientY: 20,
    pointerType: 'touch',
  });
  expect(
    await page
      .locator('#chart')
      .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
});
test('no JavaScript and delayed enhancement retain reserved static layout and application content', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: 'http://127.0.0.1:4194',
  });
  try {
    const page = await context.newPage();
    await page.goto('/chart?enhance=0&mode=external');
    await expect(page.locator('#chart')).toBeVisible();
    await expect(page.locator('#chart')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('#chart').boundingBox()).toMatchObject({
      width: 320,
      height: 200,
    });
    await expect(page.locator('#chart [data-dotquilt-static]')).toBeVisible();
    await expect(page.locator('#chart-control')).toBeHidden();
    await expect(page.locator('#chart-content')).toHaveAttribute('inert', '');
  } finally {
    await context.close();
  }
});
test('ready on mount and zero duration never delay the outcome; a long load still animates the reveal', async ({
  page,
}) => {
  await page.goto('/chart?enhance=0');
  await page
    .locator('#chart-region')
    .evaluate((e) => e.setAttribute('state', 'ready'));
  await page.evaluate(() => import(String('/chart.js')));
  await expect.poll(() => page.evaluate(() => !!window.m4Chart)).toBe(true);
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => [
      window.m4Chart.calls(),
      window.m4Chart.events.length,
    ]),
  ).toEqual([0, 0]);
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.ready(0));
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => window.m4Chart.events.map((e) => e.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  await page.clock.install();
  await page.goto('/chart');
  await page.clock.runFor(3500);
  await page.evaluate(() => window.m4Chart.ready());
  // Decision 3: the morph plays however long the load took.
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.clock.runFor(1500);
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Chart.events.at(-1)?.reason)).toBe(
    'complete',
  );
});
test('actual CSS content-box geometry, density and surface part survive border/padding and recover from excessive dots', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.addStyleTag({
    content:
      '#chart{box-sizing:border-box;width:360px;height:240px;border:5px solid;padding:15px;--dotquilt-dot-size:4px;--dotquilt-dot-gap:0px}',
  });
  await page.locator('#chart').evaluate((e) => (e as ChartLoader).refresh());
  await expect(page.locator('#chart svg[part=surface]')).toBeVisible();
  const result = await page.locator('#chart').evaluate((e) => {
    const host = e as ChartLoader;
    let bounds: unknown;
    host.targetProvider = (value) => {
      bounds = value;
      return {
        kind: 'scatter',
        points: [{ x: value.width / 2, y: value.height / 2 }],
      };
    };
    (document.getElementById('chart-region') as LoadingRegion).state = 'ready';
    return new Promise((resolve) => queueMicrotask(() => resolve(bounds)));
  });
  expect(result).toEqual({ width: 320, height: 200 });
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.addStyleTag({ content: '#chart{width:2000px;height:2000px}' });
  await page.locator('#chart').evaluate((e) => (e as ChartLoader).refresh());
  await expect.poll(() => paintCount(page.locator(chart))).toBe(0);
  await page.addStyleTag({ content: '#chart{width:320px;height:200px}' });
  await page.locator('#chart').evaluate((e) => (e as ChartLoader).refresh());
  await expectPaint(page.locator(chart));
  expect(await paintCount(page.locator(chart))).toBeLessThanOrEqual(4096);
});
test('pre-upgrade properties, provider replacement and adoption release document resources safely', async ({
  page,
}) => {
  await page.goto('/chart?enhance=0');
  await page.locator('#chart').evaluate((e) => {
    Reflect.set(e, 'variant', 'scatter');
    Reflect.set(e, 'speed', 0.6);
    Reflect.set(e, 'pointerResponse', 'lift');
  });
  await page.evaluate(() => import(String('/chart.js')));
  await expectPaint(page.locator(chart));
  expect(
    await page
      .locator('#chart')
      .evaluate((e) => [
        (e as ChartLoader).variant,
        (e as ChartLoader).speed,
        (e as ChartLoader).pointerResponse,
      ]),
  ).toEqual(['scatter', 0.6, 'lift']);
  const released = await page.locator('#chart').evaluate((e) => {
    const other = document.implementation.createHTMLDocument('adopted');
    other.body.append(e);
    return (e as ChartLoader).targetProvider === undefined;
  });
  expect(released).toBe(true);
  await page.locator('#chart-region').evaluate((e) => e.remove());
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
test('CSS rem and calc dot lengths resolve like their pixel equivalents, including external styles', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  for (const mode of ['inline', 'external']) {
    await page.goto(`/chart?mode=${mode}`);
    await page.clock.runFor(50);
    await page.locator('#chart').evaluate((e) => {
      e.classList.add('relative-dots');
    });
    await page.locator('#chart').evaluate((e) => (e as ChartLoader).refresh());
    await page.clock.runFor(0);
    const relative = await page.locator(chart).evaluate(readPaint);
    expect(relative.length).toBeGreaterThan(0);
    const first = relative[0]?.x ?? 0;
    expect((relative.find((dot) => dot.x !== first)?.x ?? first) - first).toBe(
      7,
    );
    await page.locator('#chart').evaluate((e) => {
      e.classList.remove('relative-dots');
      e.classList.add('pixel-dots');
    });
    await page.locator('#chart').evaluate((e) => (e as ChartLoader).refresh());
    await page.clock.runFor(0);
    const pixels = await page.locator(chart).evaluate(readPaint);
    expect(pixels).toEqual(relative);
  }
});
test('real fine-hover input reaches an inert region placeholder through its owning region and stops during handoff', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => window.m4Chart.update({ pointerResponse: 'lift' }));
  const bounds = await page.locator('#chart').boundingBox();
  if (!bounds) throw new Error('Missing chart bounds');
  await page.mouse.move(bounds.x + 40, bounds.y + 80);
  await expect
    .poll(() =>
      page
        .locator('#chart')
        .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
    )
    .toEqual({ x: 40, y: 80 });
  await page.evaluate(() => window.m4Chart.update({ motion: 'paused' }));
  expect(
    await page
      .locator('#chart')
      .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
  await page.evaluate(() => window.m4Chart.update({ motion: 'system' }));
  await page.mouse.move(bounds.x + 50, bounds.y + 90);
  await expect
    .poll(() =>
      page
        .locator('#chart')
        .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
    )
    .toEqual({ x: 50, y: 90 });
  await page.evaluate(() => {
    Reflect.set(window, 'pointerAtStart', 'uncommitted');
    document
      .getElementById('chart-region')
      ?.addEventListener('dotquilt-handoff-start', () =>
        Reflect.set(
          window,
          'pointerAtStart',
          Reflect.get(
            document.getElementById('chart') as HTMLElement,
            Symbol.for('dotquilt.pointer.v1'),
          ),
        ),
      );
    window.m4Chart.ready();
  });
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => Reflect.get(window, 'pointerAtStart')),
  ).toBeUndefined();
  expect(
    await page
      .locator('#chart')
      .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
});
test('preparation failure releases captured buffers even when its diagnostic supersedes the load', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => {
    window.m4Chart.broken();
    document.getElementById('chart-region')?.addEventListener(
      'dotquilt-error',
      (e) => {
        if ((e as CustomEvent).detail.code === 'animation-failed')
          window.m4Chart.pending('error-recovery');
      },
      { once: true },
    );
    window.m4Chart.ready();
  });
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  const snapshot = await page
    .locator('#chart')
    .evaluate((e) =>
      Reflect.get(e, Symbol.for('dotquilt.surface.v1')).call(e, 'chart'),
    );
  expect(snapshot.input).toEqual({ kind: 'scatter', points: [] });
  expect(snapshot.source).toEqual([]);
  expect(await page.evaluate(() => window.m4Chart.events)).toEqual([]);
  await page.evaluate(() => {
    window.m4Chart.update({ animations: {} });
    window.m4Chart.ready(100);
  });
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
});
test('removing the chart in the start handler never resurrects its painter and settles the owning result', async ({
  page,
}) => {
  await page.goto('/chart');
  await expectPaint(page.locator(chart));
  await page.evaluate(() => {
    const chart = document.getElementById('chart') as ChartLoader;
    Reflect.set(window, 'removedChart', chart);
    document
      .getElementById('chart-region')
      ?.addEventListener('dotquilt-handoff-start', () => chart.remove(), {
        once: true,
      });
    window.m4Chart.ready();
  });
  await expect(page.locator('#chart-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, 'removedChart').shadowRoot.querySelectorAll(
          '[data-dotquilt-painter]',
        ).length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(() => window.m4Chart.events.map((e) => e.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toBeUndefined();
});

test('external chart CSS preserves ordinary application surfaces and SVG pointer behavior', async ({
  page,
}) => {
  await page.goto('/chart?mode=external');
  await expectPaint(page.locator(chart));
  const styles = await page.evaluate(() => {
    const surface = document.createElement('div');
    surface.className = 'surface';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(surface, svg);
    const a = getComputedStyle(surface),
      b = getComputedStyle(svg);
    return {
      position: a.position,
      opacity: a.opacity,
      background: a.backgroundImage,
      pointerEvents: b.pointerEvents,
    };
  });
  expect(styles).toEqual({
    position: 'static',
    opacity: '1',
    background: 'none',
    pointerEvents: 'auto',
  });
  await expect(page.locator('#chart svg[part=surface]')).toBeVisible();
  expect(await page.evaluate(() => window.m4Chart.violations)).toEqual([]);
});
