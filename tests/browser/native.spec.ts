import { expect, type Page, test } from '@playwright/test';
import type { LoadingRegion } from '../../packages/core/dist/region';
import type { SkeletonBlock } from '../../packages/core/dist/skeleton';

declare global {
  interface Window {
    booted: boolean;
    contentIdentity: Element;
    events: { type: string; cycle?: string; handoffId: number }[];
    violations: string[];
  }
}
const r = '#region';
async function boot(page: Page, mode = 'inline') {
  await page.goto(`/?mode=${mode}`);
  await page.waitForFunction(() => window.booted);
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'pending');
}
async function ready(page: Page, duration = 0) {
  await page.evaluate(
    (ms) =>
      (document.getElementById('region') as LoadingRegion).update({
        state: 'ready',
        timing: { duration: ms },
      }),
    duration,
  );
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
}
for (const mode of ['inline', 'nonce', 'hash', 'external'])
  test(`real CSP ${mode}: static, upgrade, handoff and original nodes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await boot(page, mode);
    expect(
      await page.evaluate(() => {
        const w = document
          .getElementById('region')
          ?.shadowRoot?.querySelector('[part=content]');
        return [
          w?.getAttribute('aria-busy'),
          w?.getAttribute('aria-hidden'),
          (w as HTMLElement).inert,
        ];
      }),
    ).toEqual(['true', 'true', true]);
    await ready(page, 180);
    expect(
      await page.evaluate(
        () => document.getElementById('content') === window.contentIdentity,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual(
      ['start', 'end'],
    );
    expect(await page.evaluate(() => window.violations)).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.locator('#region [style]').count()).toBe(0);
  });
test('refresh keeps useful content/focus; replacement moves focus before hiding and ready does not restore', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  await page.locator('#action').focus();
  await page.evaluate(() =>
    (document.getElementById('region') as LoadingRegion).update({
      state: 'refreshing',
      cycle: 'refresh',
    }),
  );
  await expect(page.locator('#action')).toBeFocused();
  await expect(page.locator('#action')).toBeVisible();
  await page.evaluate(() =>
    (document.getElementById('region') as LoadingRegion).update({
      state: 'pending',
      cycle: 'replacement',
    }),
  );
  await expect(page.locator(r)).toBeFocused();
  await expect(page.locator('#action')).toBeHidden();
  await ready(page);
  await expect(page.locator(r)).toBeFocused();
});
test('reentrant focus handler changes intent before content can be hidden', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  await page.locator('#action').focus();
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.addEventListener(
      'focus',
      () => region.update({ state: 'ready', cycle: 'focus-won' }),
      { once: true },
    );
    region.state = 'pending';
  });
  await expect(page.locator('#action')).toBeVisible();
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
});
test('superseded start gets one cancel, never a stale end', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.addEventListener(
      'dotquilt-handoff-start',
      () => region.update({ state: 'pending', cycle: 'new' }),
      { once: true },
    );
    region.update({ state: 'ready', timing: { duration: 300 } });
  });
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'pending');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'cancel',
  ]);
  await ready(page);
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'cancel',
    'start',
    'end',
  ]);
});
test('synchronous uncommitted values produce no fictional events; ready reconnect never replays', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  await page.evaluate(() => {
    window.events = [];
    const region = document.getElementById('region') as LoadingRegion;
    region.state = 'pending';
    region.state = 'ready';
  });
  await page.waitForTimeout(30);
  expect(await page.evaluate(() => window.events)).toEqual([]);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.remove();
    document.body.append(region);
  });
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
  expect(await page.evaluate(() => window.events)).toEqual([]);
});
test('pause/reduced motion settle active handoff with end; settings do not replay ready', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() =>
    (document.getElementById('region') as LoadingRegion).update({
      state: 'ready',
      timing: { duration: 1500 },
    }),
  );
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'handoff');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'end',
  ]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(
    () =>
      ((document.getElementById('region') as LoadingRegion).timing = {
        duration: 500,
      }),
  );
  expect(await page.evaluate(() => window.events.length)).toBe(2);
});
test('equivalent configuration keeps captured handoff; focus makes constrained content fully visible', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() =>
    (document.getElementById('region') as LoadingRegion).update({
      state: 'ready',
      timing: { duration: 800 },
    }),
  );
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'handoff');
  await page.evaluate(() =>
    (document.getElementById('region') as LoadingRegion).update({
      timing: { duration: 0 },
    }),
  );
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'handoff');
  await page.locator('#action').focus();
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
  await expect(page.locator('#action')).toBeFocused();
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'end',
  ]);
});
test('four-second window is not renewed by cycle churn or same-instance reconnect', async ({
  page,
}) => {
  await boot(page);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.cycle = 'again';
    region.remove();
    document.body.append(region);
  });
  await page.waitForTimeout(2050);
  expect(
    await page.evaluate(
      () =>
        document
          .getElementById('block')
          ?.shadowRoot?.getAnimations()
          .filter((a) => a.playState === 'running').length,
    ),
  ).toBe(0);
  await ready(page, 900);
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'end',
  ]);
});
test('oversized requested handoff skips instead of exceeding remaining window', async ({
  page,
}) => {
  await boot(page);
  await ready(page, 5000);
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'end',
  ]);
});
test('invalid state/motion recover conservatively; immediate error/zero/empty stay app-owned', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.setAttribute('state', 'invalid');
    // State alone must recover to a static pending presentation.
  });
  await expect(page.locator('#action')).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getElementById('block')
            ?.shadowRoot?.getAnimations()
            .filter((a) => a.playState === 'running').length,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.setAttribute('motion', 'invalid');
    const value = document.getElementById('value');
    if (value) value.textContent = '';
    region.update({ state: 'ready', timing: { duration: 0 } });
  });
  await expect(page.locator('#action')).toBeVisible();
  await expect(page.locator('#value')).toHaveText('');
});
test('typed custom idle invokes still when restricted and keeps pending content hidden', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    const custom = defineAnimation({
      contractVersion: 1,
      id: 'example/custom',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame({ dot }: { dot: (v: object) => void }) {
        dot({ x: 20, y: 20, size: 2, opacity: 0.5, tone: 'base' });
      },
      still({ dot }: { dot: (v: object) => void }) {
        dot({ x: 10, y: 10, size: 3, opacity: 0.4, tone: 'base' });
      },
    });
    (document.getElementById('block') as SkeletonBlock).animations = {
      idle: custom(),
    };
  });
  await expect(page.locator('#block circle')).toHaveAttribute('cx', '20');
  await page.evaluate(
    () =>
      ((document.getElementById('region') as LoadingRegion).motion = 'paused'),
  );
  await expect(page.locator('#block circle')).toHaveAttribute('cx', '10');
  await expect(page.locator('#action')).toBeHidden();
});
test('last-consumer disposal releases observers and decorations through 100 reconnections', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  const result = await page.evaluate(async () => {
    const region = document.getElementById('region') as LoadingRegion;
    const block = document.getElementById('block') as SkeletonBlock;
    const content = document.getElementById('content');
    for (let i = 0; i < 100; i++) {
      region.update({ state: 'pending', cycle: String(i) });
      await Promise.resolve();
      region.update({ state: 'ready', timing: { duration: 0 } });
      await Promise.resolve();
      region.remove();
      document.body.append(region);
      await Promise.resolve();
    }
    region.remove();
    document.getElementById('static')?.remove();
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      same: region.querySelector('#content') === content,
      animations: block.shadowRoot
        ?.getAnimations()
        .filter((a) => a.playState === 'running').length,
      duplicates:
        new Set(window.events.map((e) => `${e.handoffId}:${e.type}`)).size ===
        window.events.length,
    };
  });
  expect(result).toEqual({ same: true, animations: 0, duplicates: true });
});
test('static/no-JavaScript output leaves supplied content available', async ({
  page,
}) => {
  await page.goto('/?static&mode=nonce');
  await expect(page.locator('#action')).toBeVisible();
  await expect(page.locator('#value')).toHaveText('0');
  expect(await page.locator('#static [data-dotquilt-static]').count()).toBe(1);
});

test('pre-upgrade state/cycle/timing values are delivered atomically without ready replay', async ({
  page,
}) => {
  await page.goto('/?preupgrade');
  await page.waitForFunction(() => window.booted);
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
  expect(
    await page.evaluate(() => {
      const region = document.getElementById('region') as LoadingRegion;
      return [
        region.cycle,
        region.timing.duration,
        Object.hasOwn(region, 'state'),
        window.events.length,
      ];
    }),
  ).toEqual(['preupgrade', 0, false, 0]);
});
test('custom handoff draws bounded decoration and explicit targets, then restores author styles', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    const handoff = defineAnimation({
      contractVersion: 1,
      id: 'example/reveal',
      family: 'region',
      phase: 'handoff',
      options: { parse: () => ({}) },
      duration: () => 350,
      prepare: () => ({ marker: 1 }),
      frame({
        dot,
        revealTarget,
        frame,
      }: {
        dot: (value: object) => void;
        revealTarget: (id: string, value: object) => void;
        frame: { progress: number };
      }) {
        dot({ x: 30, y: 30, size: 2, opacity: 0.5, tone: 'accent' });
        revealTarget('row', {
          opacity: frame.progress,
          translateY: 8 * (1 - frame.progress),
        });
      },
    });
    const region = document.getElementById('region') as LoadingRegion;
    region.update({
      animations: { handoff: handoff() },
      revealTargets: [
        {
          id: 'row',
          element: document.getElementById('content') as HTMLElement,
        },
      ],
      state: 'ready',
    });
  });
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'handoff');
  await expect(page.locator('#block circle')).toHaveAttribute('cx', '30');
  await expect(page.locator(r)).toHaveAttribute('data-presentation', 'ready');
  expect(await page.locator('#block circle').count()).toBe(0);
  expect(await page.locator('#content').getAttribute('style')).toBe(null);
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'end',
  ]);
});
test('same-document adoption releases old services and preserves content in a new document', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  expect(
    await page.evaluate(async () => {
      const region = document.getElementById('region') as LoadingRegion;
      const content = document.getElementById('content');
      const iframe = document.createElement('iframe');
      document.body.append(iframe);
      iframe.contentDocument?.body.append(region);
      await new Promise((resolve) => setTimeout(resolve, 30));
      region.update({ state: 'pending', cycle: 'adopted' });
      await Promise.resolve();
      region.update({ state: 'ready', timing: { duration: 0 } });
      await Promise.resolve();
      return (
        region.querySelector('#content') === content &&
        region.presentation === 'ready'
      );
    }),
  ).toBe(true);
});

test('ancestor pause, hidden hosts and zero-size suspend decoration while readiness still advances', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => document.body.setAttribute('motion', 'paused'));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getElementById('block')
            ?.shadowRoot?.getAnimations()
            .filter((a) => a.playState === 'running').length,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    document.body.removeAttribute('motion');
    document.getElementById('block')?.setAttribute('hidden', '');
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getElementById('block')
            ?.shadowRoot?.getAnimations()
            .filter((a) => a.playState === 'running').length,
      ),
    )
    .toBe(0);
  await ready(page);
  await expect(page.locator('#action')).toBeVisible();
});
test('all imports are inert, root/family constructors match and selective registration is idempotent', async ({
  page,
}) => {
  await page.goto('/?static');
  const result = await page.evaluate(async () => {
    const root = await import(String('/pkg/dist/index.js'));
    const family = await import(String('/pkg/dist/skeleton.js'));
    const inert =
      !customElements.get('dotquilt-skeleton-block') &&
      !customElements.get('dotquilt-region');
    family.registerSkeletonBlock();
    family.registerSkeletonBlock();
    return {
      inert,
      same: root.SkeletonBlock === family.SkeletonBlock,
      selective: !customElements.get('dotquilt-region'),
    };
  });
  expect(result).toEqual({ inert: true, same: true, selective: true });
});
test('conflicting registration fails explicitly without overwriting the existing tag', async ({
  page,
}) => {
  await page.goto('/?static');
  const result = await page.evaluate(async () => {
    class Other extends HTMLElement {}
    customElements.define('dotquilt-skeleton-block', Other);
    const api = await import(String('/pkg/dist/skeleton.js'));
    let code = '';
    try {
      api.registerSkeletonBlock();
    } catch (error) {
      code = (error as { code: string }).code;
    }
    return {
      code,
      kept: customElements.get('dotquilt-skeleton-block') === Other,
      region: !!customElements.get('dotquilt-region'),
    };
  });
  expect(result).toEqual({
    code: 'registration-conflict',
    kept: true,
    region: false,
  });
});

test('structurally missing pending/refresh content has a static fallback without invented outcomes', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.replaceChildren();
    region.update({ state: 'refreshing', cycle: 'empty-structure' });
  });
  await expect(page.locator('#region .r .fallback')).toBeVisible();
  await expect(page.locator(r)).toHaveAttribute('state', 'refreshing');
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.update({ state: 'pending' });
  });
  await expect(page.locator('#region .p .fallback')).toBeVisible();
  await ready(page);
  await expect(page.locator(r)).toHaveAttribute('state', 'ready');
});

test('switching custom and built-in idle keeps ownership, clears old painters and preserves live options', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    // A custom ID matching a built-in must still use its own definition.
    const factory = defineAnimation({
      contractVersion: 1,
      id: 'dotquilt/pulse',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: (v: { x?: number }) => ({ x: v.x ?? 20 }) },
      frame({ dot }: { dot: (v: object) => void }, options: { x: number }) {
        dot({ x: options.x, y: 10, size: 2, opacity: 0.5, tone: 'base' });
      },
      still({ dot }: { dot: (v: object) => void }, options: { x: number }) {
        dot({ x: options.x, y: 10, size: 2, opacity: 0.3, tone: 'base' });
      },
    });
    const block = document.getElementById('block') as SkeletonBlock;
    block.animations = { idle: factory({ x: 20 }) };
    (window as unknown as { replaceIdle: () => void }).replaceIdle = () => {
      block.animations = { idle: factory({ x: 40 }) };
    };
  });
  await expect(page.locator('#block circle')).toHaveAttribute('cx', '20');
  await page.evaluate(() =>
    (window as unknown as { replaceIdle: () => void }).replaceIdle(),
  );
  await expect(page.locator('#block circle')).toHaveAttribute('cx', '40');
  await page.evaluate(() => {
    (document.getElementById('block') as SkeletonBlock).animations = {};
  });
  await expect(page.locator('#block svg')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getElementById('block')
            ?.shadowRoot?.getAnimations()
            .filter((a) => a.playState === 'running').length,
      ),
    )
    .toBe(1);
  await expect(page.locator('#action')).toBeHidden();
});

test('pointer lift is opt-in and suppressed for touch, pause and content handoff', async ({
  page,
}) => {
  await boot(page);
  const box = await page.locator('#block').boundingBox();
  if (!box) throw new Error('Missing pointer target');
  await page.mouse.move(box.x + 10, box.y + 10);
  const translate = () =>
    page.evaluate(
      () =>
        getComputedStyle(
          document
            .getElementById('block')
            ?.shadowRoot?.querySelector('.pulse') as Element,
        ).translate,
    );
  expect(await translate()).toBe('none');
  await page.evaluate(() => {
    (document.getElementById('block') as SkeletonBlock).pointerResponse =
      'lift';
  });
  await page.mouse.move(box.x + 20, box.y + 20);
  await expect.poll(translate).toBe('0px -1px');
  await page.evaluate(() =>
    document.getElementById('block')?.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'touch',
        bubbles: true,
        composed: true,
      }),
    ),
  );
  await expect.poll(translate).toBe('none');
  await page.mouse.move(box.x + 25, box.y + 25);
  await expect.poll(translate).toBe('0px -1px');
  await page.evaluate(() => {
    (document.getElementById('region') as LoadingRegion).motion = 'paused';
  });
  await expect.poll(translate).toBe('none');
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.motion = 'system';
    region.state = 'ready';
  });
  await page.mouse.move(box.x + 30, box.y + 30);
  await expect.poll(translate).toBe('none');
});

test('a minified production chart bundle draws every variant and hands off under strict CSP', async ({
  page,
}) => {
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (event) =>
      Reflect.set(window, 'violations', [
        ...(Reflect.get(window, 'violations') ?? []),
        event.violatedDirective,
      ]),
    ),
  );
  await page.goto('/?production=chart');
  const charts = page.locator('dotquilt-chart-loader');
  await expect(charts).toHaveCount(3);
  expect(
    await charts.evaluateAll((all) =>
      all.map((c) => c.getAttribute('variant')),
    ),
  ).toEqual(['line', 'bar', 'scatter']);
  const painters = () =>
    charts.evaluateAll(
      (all) =>
        all.filter((c) =>
          c.shadowRoot?.querySelector('[data-dotquilt-painter]'),
        ).length,
    );
  await expect.poll(painters).toBe(3);
  await page.evaluate(() => {
    for (const region of document.querySelectorAll('dotquilt-region'))
      (region as HTMLElement & { state: string }).state = 'ready';
  });
  await expect(
    page.locator('dotquilt-region[data-presentation=ready]'),
  ).toHaveCount(3);
  await expect.poll(painters).toBe(0);
  await expect(page.getByText('bar chart')).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'violations'))).toBe(
    undefined,
  );
});

for (const family of ['skeleton', 'region'])
  test(`measured production ${family} bundle registers and renders`, async ({
    page,
  }) => {
    await page.goto(`/?production=${family}`);
    const selector =
      family === 'skeleton' ? 'dotquilt-skeleton-block' : 'dotquilt-region';
    await expect(page.locator(selector)).toHaveCount(1);
    await expect
      .poll(() => page.locator(selector).evaluate((el) => !!el.shadowRoot))
      .toBe(true);
    if (family === 'skeleton')
      await expect(page.locator(`${selector} [part=surface]`)).toBeVisible();
    else {
      await expect(page.locator(selector)).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      await expect(page.locator(`${selector} [part=content]`)).toHaveAttribute(
        'aria-busy',
        'false',
      );
    }
  });

test('custom idle phase survives same-instance reconnection without retaining an operational painter', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    (window as unknown as { idleTime: number }).idleTime = 0;
    const factory = defineAnimation({
      contractVersion: 1,
      id: 'example/clock',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame({
        frame,
        dot,
      }: {
        frame: { timeMs: number };
        dot: (v: object) => void;
      }) {
        (window as unknown as { idleTime: number }).idleTime = frame.timeMs;
        dot({ x: 10, y: 10, size: 2, opacity: 0.5, tone: 'base' });
      },
      still() {},
    });
    (document.getElementById('block') as SkeletonBlock).animations = {
      idle: factory(),
    };
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { idleTime: number }).idleTime),
    )
    .toBeGreaterThan(80);
  const before = await page.evaluate(
    () => (window as unknown as { idleTime: number }).idleTime,
  );
  const after = await page.evaluate(async () => {
    const region = document.getElementById('region') as LoadingRegion;
    region.remove();
    const cleared = !region
      .querySelector('dotquilt-skeleton-block')
      ?.shadowRoot?.querySelector('svg');
    document.body.append(region);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return {
      cleared,
      time: (window as unknown as { idleTime: number }).idleTime,
    };
  });
  expect(after.cleared).toBe(true);
  expect(after.time).toBeGreaterThanOrEqual(before);
});

test('a settled result followed by a new load gets one bounded motion window', async ({
  page,
}) => {
  await boot(page);
  await ready(page);
  await page.evaluate(() => {
    (document.getElementById('region') as LoadingRegion).update({
      state: 'pending',
      cycle: 'new-load',
    });
  });
  await expect(page.locator('#block')).toHaveAttribute('data-moving', '');
  await expect(page.locator('#block')).not.toHaveAttribute('data-moving', '', {
    timeout: 4700,
  });
  await page.evaluate(() => {
    (document.getElementById('block') as SkeletonBlock).speed = 2;
  });
  await expect(page.locator('#block')).not.toHaveAttribute('data-moving', '');
  expect(
    await page.evaluate(
      () =>
        document
          .getElementById('block')
          ?.shadowRoot?.getAnimations()
          .filter((a) => a.playState === 'running').length,
    ),
  ).toBe(0);
});

test('reentrant frame removal keeps one shared frame pending and last consumer releases it', async ({
  page,
}) => {
  await boot(page);
  const result = await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set<number>();
    let peak = 0,
      removed = false;
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      peak = Math.max(peak, pending.size);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    const first = document.createElement(
      'dotquilt-skeleton-block',
    ) as SkeletonBlock;
    const second = document.createElement(
      'dotquilt-skeleton-block',
    ) as SkeletonBlock;
    const factory = defineAnimation({
      contractVersion: 1,
      id: 'example/removal',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame({ frame }: { frame: { timeMs: number } }) {
        if (!removed && frame.timeMs > 0) {
          removed = true;
          first.remove();
        }
      },
      still() {},
    });
    first.animations = { idle: factory() };
    second.animations = { idle: factory() };
    document.body.append(first, second);
    await new Promise((resolve) => setTimeout(resolve, 160));
    first.remove();
    second.remove();
    await new Promise((resolve) => setTimeout(resolve, 30));
    window.requestAnimationFrame = request;
    window.cancelAnimationFrame = cancel;
    return { peak, remaining: pending.size, removed };
  });
  expect(result).toEqual({ peak: 1, remaining: 0, removed: true });
});

test('equivalent idle options retain the animation and live speed retains its phase', async ({
  page,
}) => {
  await boot(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getElementById('block')
            ?.shadowRoot?.getAnimations()[0]
            ?.effect?.getComputedTiming().progress ?? 0,
      ),
    )
    .toBeGreaterThan(0.05);
  const result = await page.evaluate(async () => {
    const block = document.getElementById('block') as SkeletonBlock;
    const animation = block.shadowRoot?.getAnimations()[0];
    const { pulse } = await import(String('/pkg/dist/skeleton-animations.js'));
    block.animations = { idle: pulse({ periodMs: 1600 }) };
    await Promise.resolve();
    const same = animation === block.shadowRoot?.getAnimations()[0];
    const before = animation?.effect?.getComputedTiming().progress ?? 0;
    block.speed = 2;
    await Promise.resolve();
    const after =
      block.shadowRoot?.getAnimations()[0]?.effect?.getComputedTiming()
        .progress ?? 0;
    return {
      same,
      delta: (after - before + 1) % 1,
      events: window.events.length,
    };
  });
  expect(result.same).toBe(true);
  expect(result.delta).toBeLessThan(0.1);
  expect(result.events).toBe(0);
});

for (const failurePhase of ['frame', 'still'] as const)
  test(`custom ${failurePhase} failure releases drawing and scheduling, latches safely and permits explicit recovery`, async ({
    page,
  }) => {
    await boot(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(async (phase) => {
      const { defineAnimation } = await import(
        String('/pkg/dist/animations.js')
      );
      const block = document.getElementById('block') as SkeletonBlock;
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Set<number>();
      let failures = 0;
      const diagnostics: string[] = [];
      block.addEventListener('dotquilt-error', (event) => {
        diagnostics.push(event.detail.code);
      });
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
      const factory = defineAnimation({
        contractVersion: 1,
        id: 'example/failure-recovery',
        family: 'skeleton',
        phase: 'idle',
        options: {
          parse: (value: { fail?: boolean }) => ({ fail: value.fail ?? true }),
        },
        frame(
          {
            dot,
            frame,
          }: { dot: (v: object) => void; frame: { timeMs: number } },
          options: { fail: boolean },
        ) {
          dot({ x: 20, y: 20, size: 2, opacity: 0.5, tone: 'base' });
          if (phase === 'frame' && options.fail && frame.timeMs > 0) {
            failures++;
            throw new Error('expected frame failure');
          }
        },
        still(
          { dot }: { dot: (v: object) => void },
          options: { fail: boolean },
        ) {
          dot({ x: 10, y: 10, size: 2, opacity: 0.5, tone: 'base' });
          if (phase === 'still' && options.fail) {
            failures++;
            throw new Error('expected still failure');
          }
        },
      });
      Reflect.set(window, 'failureProbe', {
        snapshot: () => ({
          failures,
          diagnostics: [...diagnostics],
          pending: pending.size,
        }),
        recover: () => {
          block.animations = { idle: factory({ fail: false }) };
        },
        restore: () => {
          window.requestAnimationFrame = request;
          window.cancelAnimationFrame = cancel;
        },
      });
      block.animations = { idle: factory() };
    }, failurePhase);
    if (failurePhase === 'still') {
      await expect(page.locator('#block circle')).toHaveCount(1);
      await page.evaluate(() => {
        (document.getElementById('block') as SkeletonBlock).motion = 'paused';
      });
    }
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, 'failureProbe').snapshot()),
      )
      .toEqual({
        failures: 1,
        diagnostics: ['animation-failed'],
        pending: 0,
      });
    await expect(page.locator('#block svg')).toHaveCount(0);
    await expect(page.locator('#block [part=surface]')).toBeVisible();
    await expect(page.locator('#action')).toBeHidden();
    await page.evaluate(() => {
      const block = document.getElementById('block') as SkeletonBlock;
      block.update({ speed: 1.5, motion: 'system' });
      block.refresh();
    });
    await page.waitForTimeout(60);
    expect(
      await page.evaluate(() => Reflect.get(window, 'failureProbe').snapshot()),
    ).toEqual({
      failures: 1,
      diagnostics: ['animation-failed'],
      pending: 0,
    });
    await page.evaluate(() => Reflect.get(window, 'failureProbe').recover());
    await expect(page.locator('#block circle')).toHaveAttribute('cx', '20');
    await page.evaluate(() => {
      (document.getElementById('region') as LoadingRegion).remove();
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => Reflect.get(window, 'failureProbe').snapshot().pending,
        ),
      )
      .toBe(0);
    await page.evaluate(() => Reflect.get(window, 'failureProbe').restore());
    expect(errors).toEqual([]);
  });

for (const mode of ['inline', 'nonce', 'hash', 'external'])
  test(`custom decoration retains a visible forced-colors fallback under ${mode} CSP`, async ({
    page,
  }) => {
    await boot(page, mode);
    await page.evaluate(async () => {
      const { defineAnimation } = await import(
        String('/pkg/dist/animations.js')
      );
      const draw = ({ dot }: { dot: (value: object) => void }) => {
        dot({ x: 20, y: 20, size: 2, opacity: 0.5, tone: 'base' });
      };
      const animation = defineAnimation({
        contractVersion: 1,
        id: 'example/forced-colors',
        family: 'skeleton',
        phase: 'idle',
        options: { parse: () => ({}) },
        frame: draw,
        still: draw,
      });
      (document.getElementById('block') as SkeletonBlock).animations = {
        idle: animation(),
      };
    });
    await expect(page.locator('#block circle')).toHaveCount(1);
    await expect(page.locator('#block [part=surface]')).toBeHidden();
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(page.locator('#block [part=surface]')).toBeVisible();
    expect(
      await page.locator('#block [part=surface]').evaluate((element) => {
        const css = getComputedStyle(element);
        return { border: css.borderTopStyle, width: css.borderTopWidth };
      }),
    ).toEqual({ border: 'dotted', width: '1px' });
    await expect(page.locator('#block svg')).toBeHidden();
    await expect(page.locator('#action')).toBeHidden();
    await page.evaluate(() => {
      (document.getElementById('block') as SkeletonBlock).motion = 'paused';
    });
    await expect(page.locator('#block [part=surface]')).toBeVisible();
    await page.emulateMedia({ forcedColors: 'none' });
    await expect(page.locator('#block [part=surface]')).toBeHidden();
    await expect(page.locator('#block svg')).toBeVisible();
    await ready(page);
    await expect(page.locator('#action')).toBeVisible();
    expect(await page.evaluate(() => window.violations)).toEqual([]);
  });
