import { expect, test } from '@playwright/test';
import type { LoadingRegion } from '../../packages/core/dist/region';
import type { SkeletonBlock } from '../../packages/core/dist/skeleton';

for (const mode of ['inline', 'nonce', 'hash', 'external'])
  test(`server ${mode}: pending/ready/refresh survive missing and delayed enhancement`, async ({
    page,
  }) => {
    for (const state of ['pending', 'ready', 'refreshing']) {
      await page.goto(`/?ssr=${state}&mode=${mode}&failed`);
      await expect(page.locator('#action')).toBeVisible({
        visible: state !== 'pending',
      });
      await expect(page.locator('#recovery')).toBeVisible();
      await expect(page.locator('#status')).toHaveText(
        'Loading account activity',
      );
      if (state === 'pending') {
        await expect(page.locator('#content')).toHaveAttribute('inert', '');
        await expect(
          page.locator('#region [data-dotquilt-static]'),
        ).toBeVisible();
        await page.locator('#outside').focus();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#action')).not.toBeFocused();
      }
    }
    await page.goto(`/?ssr=pending&mode=${mode}&static`);
    await expect(page.locator('#action')).toBeHidden();
    await page.evaluate(async () => {
      await import(String('/init.js'));
    });
    await page.waitForFunction(() => window.booted);
    await expect(page.locator('#action')).toBeHidden();
    await page.evaluate(() =>
      (document.getElementById('region') as LoadingRegion).update({
        state: 'ready',
        timing: { duration: 0 },
      }),
    );
    await expect(page.locator('#action')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.getElementById('content') === window.contentIdentity,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.violations)).toEqual([]);
  });

test('no JavaScript: supplied ready content works and pending content stays unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4181/?ssr=ready&mode=external');
  await expect(page.locator('#action')).toBeVisible();
  await page.goto('http://127.0.0.1:4181/?ssr=pending&mode=external');
  await expect(page.locator('#action')).toBeHidden();
  await expect(page.locator('#region [data-dotquilt-static]')).toBeVisible();
  await expect(page.locator('#recovery')).toBeVisible();
  await context.close();
});

test('a second copy of the library is refused while the first copy keeps working', async ({
  page,
}) => {
  await page.goto('/?static');
  expect(
    await page.evaluate(async () => {
      const first = await import(String('/pkg/dist/index.js'));
      const second = await import(String('/pkg-copy/dist/index.js'));
      const secondAll = await import(String('/pkg-copy/dist/register-all.js'));
      const { pulse } = await import(
        String('/pkg-copy/dist/skeleton-animations.js')
      );
      const refused = (register: () => void) => {
        try {
          register();
          return 'registered';
        } catch (error) {
          return (error as { code?: string }).code ?? String(error);
        }
      };
      const results = {
        first: refused(first.registerSkeletonBlock),
        again: refused(first.registerSkeletonBlock),
        second: refused(second.registerSkeletonBlock),
        secondAll: refused(secondAll.registerAll),
      };
      const block = document.getElementById('block') as SkeletonBlock;
      const errors: string[] = [];
      block.addEventListener('dotquilt-error', (event) =>
        errors.push((event as CustomEvent<{ code: string }>).detail.code),
      );
      // A binding made by the second copy is not one of this copy's animations.
      block.animations = { idle: pulse() };
      await Promise.resolve();
      return {
        ...results,
        kept:
          customElements.get('dotquilt-skeleton-block') === first.SkeletonBlock,
        errors,
      };
    }),
  ).toEqual({
    first: 'registered',
    again: 'registered',
    second: 'registration-conflict',
    secondAll: 'registration-conflict',
    kept: true,
    errors: ['invalid-binding'],
  });
});

test('independent nested regions, event propagation and refresh interruption preserve application identity', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  const result = await page.evaluate(async () => {
    const outer = document.getElementById('region') as LoadingRegion;
    const nested = document.createElement('dotquilt-region');
    nested.state = 'pending';
    nested.motion = 'paused';
    nested.textContent = 'Nested outcome';
    const placeholder = document.createElement('dotquilt-skeleton-block');
    placeholder.slot = 'placeholder';
    nested.append(placeholder);
    document.getElementById('content')?.append(nested);
    const observed: boolean[][] = [];
    document.body.addEventListener('dotquilt-handoff-start', (e) =>
      observed.push([e.bubbles, e.composed, e.cancelable]),
    );
    outer.update({ state: 'ready', timing: { duration: 700 } });
    await Promise.resolve();
    const wrapper = outer.shadowRoot?.querySelector('[part=content]') as
      | HTMLElement
      | undefined;
    if (!wrapper) throw new Error('Missing content wrapper');
    const immediateAccess = !wrapper.inert;
    outer.update({ state: 'refreshing', cycle: 'fresh' });
    await Promise.resolve();
    return {
      immediateAccess,
      outer: outer.presentation,
      nested: nested.presentation,
      owner: placeholder.owner === nested,
      identity: document.getElementById('content') === window.contentIdentity,
      observed,
    };
  });
  expect(result).toEqual({
    immediateAccess: true,
    outer: 'refreshing',
    nested: 'pending',
    owner: true,
    identity: true,
    observed: [[true, true, false]],
  });
  await expect(page.locator('#action')).toBeVisible();
  expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual([
    'start',
    'cancel',
  ]);
});

test('app failure/cancellation/retry and stale responses preserve values, handlers and input state', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  const result = await page.evaluate(async () => {
    const region = document.getElementById('region') as LoadingRegion;
    const article = document.getElementById('content');
    const input = document.createElement('input');
    input.value = 'draft';
    article?.append(input);
    let clicks = 0;
    document
      .getElementById('action')
      ?.addEventListener('click', () => clicks++);
    const value = document.getElementById('value');
    const complete = (id: string, text: string) => {
      if (id !== region.cycle) return;
      if (value) value.textContent = text;
      region.update({ state: 'ready', timing: { duration: 0 } });
    };
    region.update({ state: 'pending', cycle: 'A' });
    await Promise.resolve();
    region.update({ state: 'pending', cycle: 'B' });
    await Promise.resolve();
    complete('A', 'stale');
    const staleRejected =
      value?.textContent === '0' && region.state === 'pending';
    complete('B', 'Error — retry');
    await Promise.resolve();
    region.update({ state: 'pending', cycle: 'retry' });
    await Promise.resolve();
    complete('retry', 'Canceled');
    await Promise.resolve();
    region.update({ state: 'refreshing', cycle: 'refresh' });
    await Promise.resolve();
    complete('refresh', '');
    await Promise.resolve();
    document.getElementById('action')?.click();
    return {
      staleRejected,
      value: value?.textContent,
      input: input.value,
      clicks,
      identity: article === window.contentIdentity,
      presentation: region.presentation,
      terminals: window.events.map((e) => e.type),
    };
  });
  expect(result).toEqual({
    staleRejected: true,
    value: '',
    input: 'draft',
    clicks: 1,
    identity: true,
    presentation: 'ready',
    terminals: ['start', 'end', 'start', 'end'],
  });
});

test('local themes, international content and style refresh preserve cycle and native semantics', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  const result = await page.evaluate(async () => {
    const { refreshStyles } = await import(String('/pkg/dist/index.js'));
    const region = document.getElementById('region') as LoadingRegion;
    const style = document.createElement('style');
    style.textContent =
      '.themeA{--dotquilt-color:rgb(10, 20, 30)}.themeB{--dotquilt-color:rgb(40, 50, 60)}';
    document.head.append(style);
    const second = document.createElement('dotquilt-skeleton-block');
    second.className = 'themeB';
    document.body.append(second);
    const block = document.getElementById('block') as SkeletonBlock;
    block.className = 'block themeA';
    const text = document.getElementById('value');
    if (text) {
      text.dir = 'rtl';
      text.lang = 'ar';
      text.textContent = 'مرحبا 0 é 👩🏽‍💻';
    }
    region.update({ state: 'ready', timing: { duration: 0 } });
    await Promise.resolve();
    const events = window.events.length;
    const cycle = region.cycle;
    refreshStyles(region);
    await Promise.resolve();
    return {
      colors: [
        getComputedStyle(block).getPropertyValue('--dotquilt-color'),
        getComputedStyle(second).getPropertyValue('--dotquilt-color'),
      ],
      text: text?.textContent,
      dir: text?.dir,
      lang: text?.lang,
      stable: events === window.events.length && cycle === region.cycle,
      decorative: block.getAttribute('aria-hidden'),
      role: region.getAttribute('role'),
      tabindex: region.getAttribute('tabindex'),
    };
  });
  expect(result).toEqual({
    colors: ['rgb(10, 20, 30)', 'rgb(40, 50, 60)'],
    text: 'مرحبا 0 é 👩🏽‍💻',
    dir: 'rtl',
    lang: 'ar',
    stable: true,
    decorative: 'true',
    role: 'group',
    tabindex: null,
  });
});

test('invalid preset is diagnosed and recovers to safe built-in rendering', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await page.evaluate(() => {
    const block = document.getElementById('block') as SkeletonBlock;
    Reflect.set(window, 'presetErrors', []);
    block.addEventListener('dotquilt-error', (e) =>
      Reflect.get(window, 'presetErrors').push(e.detail.code),
    );
    Reflect.set(block, 'preset', {
      kind: 'skeleton',
      animations: { idle: { family: 'skeleton', phase: 'idle' } },
    });
  });
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'presetErrors')))
    .toEqual(['invalid-preset']);
  await expect(page.locator('#action')).toBeHidden();
  await page.evaluate(() => {
    const block = document.getElementById('block') as SkeletonBlock;
    block.preset = undefined;
    block.refresh();
  });
  expect(errors).toEqual([]);
});

for (const boundary of ['duplicate-element', 'nested-owner', 'outside', 'host'])
  test(`reveal target ${boundary} uses safe fallback`, async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.booted);
    await page.evaluate(async (kind) => {
      const { defineAnimation } = await import(
        String('/pkg/dist/animations.js')
      );
      const region = document.getElementById('region') as LoadingRegion;
      const article = document.getElementById('content') as HTMLElement;
      const nested = document.createElement('dotquilt-region');
      nested.textContent = 'Nested';
      article.append(nested);
      await new Promise((resolve) => setTimeout(resolve, 30));
      Reflect.set(window, 'targetFrames', 0);
      Reflect.set(window, 'targetErrors', []);
      region.addEventListener('dotquilt-error', (event) =>
        Reflect.get(window, 'targetErrors').push(event.detail.code),
      );
      const target =
        kind === 'host'
          ? region
          : kind === 'outside'
            ? (document.getElementById('outside') as HTMLElement)
            : kind === 'nested-owner'
              ? nested
              : article;
      const binding = defineAnimation({
        contractVersion: 1,
        id: 'example/target-boundary',
        family: 'region',
        phase: 'handoff',
        options: { parse: () => ({}) },
        duration: () => 800,
        prepare: () => undefined,
        frame({
          revealTarget,
        }: {
          revealTarget: (id: string, value: object) => void;
        }) {
          Reflect.set(
            window,
            'targetFrames',
            Reflect.get(window, 'targetFrames') + 1,
          );
          revealTarget('first', { opacity: 0 });
        },
      });
      region.update({
        state: 'ready',
        animations: { handoff: binding() },
        revealTargets: [
          { id: 'first', element: target },
          ...(kind === 'duplicate-element'
            ? [{ id: 'second', element: target }]
            : []),
        ],
      });
    }, boundary);
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#action')).toBeVisible();
    expect(
      await page.evaluate(() => [
        Reflect.get(window, 'targetFrames'),
        Reflect.get(window, 'targetErrors'),
      ]),
    ).toEqual([0, ['animation-failed']]);
    expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual(
      ['start', 'end'],
    );
  });

test('non-invalidating target additions apply next handoff while removed targets settle current content', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.revealTargets = [
      {
        id: 'first',
        element: document.getElementById('content') as HTMLElement,
      },
    ];
    region.update({ state: 'ready', timing: { duration: 2000 } });
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.revealTargets = [
      ...region.revealTargets,
      { id: 'next', element: document.getElementById('value') as HTMLElement },
    ];
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => {
    (document.getElementById('region') as LoadingRegion).revealTargets = [];
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
});

test('synchronous reconnect from a cancellation callback releases both connection observers', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observed = new Map<MutationObserver, Set<Node>>();
    const Native = window.MutationObserver;
    window.MutationObserver = class extends Native {
      override observe(target: Node, options?: MutationObserverInit): void {
        super.observe(target, options);
        const targets = observed.get(this) ?? new Set<Node>();
        targets.add(target);
        observed.set(this, targets);
      }
      override disconnect(): void {
        super.disconnect();
        observed.delete(this);
      }
    };
    Reflect.set(
      window,
      'activeContentObservers',
      (host: Node) =>
        [...observed.values()].filter((targets) => targets.has(host)).length,
    );
  });
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    region.timing = { duration: 2000 };
    let reconnected = false;
    region.addEventListener('dotquilt-handoff-cancel', () => {
      if (reconnected) return;
      reconnected = true;
      document.body.append(region);
      region.state = 'pending';
    });
    region.state = 'ready';
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => document.getElementById('region')?.remove());
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  const result = await page.evaluate(() => {
    const region = document.getElementById('region') as LoadingRegion;
    const count = Reflect.get(window, 'activeContentObservers') as (
      host: Node,
    ) => number;
    const reconnected = count(region);
    region.remove();
    return { reconnected, removed: count(region) };
  });
  expect(result).toEqual({ reconnected: 1, removed: 0 });
});

test('shared observers/listeners release after disposal; paused custom idle has no recurring frames for ten seconds', async ({
  page,
}) => {
  test.setTimeout(30000);
  await page.addInitScript(() => {
    const observed = new Map<object, Set<Node>>();
    for (const name of [
      'MutationObserver',
      'ResizeObserver',
      'IntersectionObserver',
    ]) {
      const Native = Reflect.get(window, name);
      Reflect.set(
        window,
        name,
        class extends Native {
          observe(target: Node, options?: object) {
            if (!this.owned) return super.observe(target, options);
            const targets = observed.get(this) ?? new Set<Node>();
            targets.add(target);
            observed.set(this, targets);
            super.observe(target, options);
          }
          unobserve(target: Node) {
            observed.get(this)?.delete(target);
            super.unobserve(target);
          }
          disconnect() {
            observed.delete(this);
            super.disconnect();
          }
        },
      );
    }
    const visibility = new Set<unknown>();
    const media = new Set<unknown>();
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === 'visibilitychange') visibility.add(listener);
      add(type, listener, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      if (type === 'visibilitychange') visibility.delete(listener);
      remove(type, listener, options);
    }) as typeof document.removeEventListener;
    const match = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = match(query);
      const add = result.addEventListener.bind(result);
      const remove = result.removeEventListener.bind(result);
      result.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (type === 'change') media.add(listener);
        add(type, listener, options);
      }) as typeof result.addEventListener;
      result.removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) => {
        if (type === 'change') media.delete(listener);
        remove(type, listener, options);
      }) as typeof result.removeEventListener;
      return result;
    };
    let calls = 0;
    const pending = new Set<number>();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      calls++;
      const id = request((t) => {
        pending.delete(id);
        callback(t);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    Reflect.set(window, 'resourcesProbe', () => ({
      observers: [...observed.values()].filter((v) => v.size).length,
      visibility: visibility.size,
      media: media.size,
      pending: pending.size,
      calls,
    }));
  });
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    const custom = defineAnimation({
      contractVersion: 1,
      id: 'example/disposal',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame() {},
      still() {},
    });
    (document.getElementById('block') as SkeletonBlock).animations = {
      idle: custom(),
    };
  });
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, 'resourcesProbe')().calls),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    (document.getElementById('region') as LoadingRegion).motion = 'paused';
  });
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, 'resourcesProbe')().pending),
    )
    .toBe(0);
  const before = await page.evaluate(
    () => Reflect.get(window, 'resourcesProbe')().calls,
  );
  await page.waitForTimeout(10100);
  expect(
    await page.evaluate(() => Reflect.get(window, 'resourcesProbe')().calls),
  ).toBe(before);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      'dotquilt-region,dotquilt-skeleton-block',
    ))
      el.remove();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const { calls: _calls, ...resources } = Reflect.get(
          window,
          'resourcesProbe',
        )();
        return resources;
      }),
    )
    .toEqual({ observers: 0, visibility: 0, media: 0, pending: 0 });
});

test('native pulse has a finite effect bound and settles after a main-thread stall', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getElementById('block')?.shadowRoot?.getAnimations().length,
      ),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() => {
      const animation = document
        .getElementById('block')
        ?.shadowRoot?.getAnimations()[0];
      if (!animation?.effect) throw new Error('Missing pulse');
      const end = animation.effect.getComputedTiming().endTime;
      const until = performance.now() + 4100;
      while (performance.now() < until) {
        /* Deliberately block timer-driven cancellation. */
      }
      return {
        finite: typeof end === 'number' && end <= 4000,
        bounded: Number.isFinite(Number(end)),
      };
    }),
  ).toEqual({ finite: true, bounded: true });
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
});

for (const mode of ['inline', 'nonce', 'hash', 'external'])
  test(`custom reveal bounds ${mode}, easing progress and exact completion preserve current application styles`, async ({
    page,
  }) => {
    await page.goto(`/?mode=${mode}`);
    await page.waitForFunction(() => window.booted);
    await page.evaluate(async () => {
      const { defineAnimation } = await import(
        String('/pkg/dist/animations.js')
      );
      const region = document.getElementById('region') as LoadingRegion;
      Reflect.set(window, 'easingSamples', []);
      const custom = defineAnimation({
        contractVersion: 1,
        id: 'example/complete',
        family: 'region',
        phase: 'handoff',
        options: { parse: () => ({}) },
        duration: () => 1000,
        prepare: () => undefined,
        frame({
          frame,
          reveal,
          revealTarget,
        }: {
          frame: { progress: number; linearProgress: number };
          reveal: (v: object) => void;
          revealTarget: (id: string, v: object) => void;
        }) {
          Reflect.get(window, 'easingSamples').push([
            frame.progress,
            frame.linearProgress,
          ]);
          reveal({ opacity: 2, translateY: 99, clipStart: 0.5 });
          revealTarget('article', { opacity: -0.5, translateY: -99 });
        },
      });
      region.update({
        state: 'ready',
        timing: { duration: 1000, easing: 'cubic-bezier(0, 0, 0, 1)' },
        animations: { handoff: custom() },
        revealTargets: [
          {
            id: 'article',
            element: document.getElementById('content') as HTMLElement,
          },
        ],
      });
    });
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(
      await page.evaluate(() => {
        const region = document.getElementById('region') as LoadingRegion;
        const effects =
          region.shadowRoot
            ?.querySelector('[part=content]')
            ?.getAnimations()
            .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()) ?? [];
        return effects.some(
          (f) =>
            String(f.clipPath).includes('50%') &&
            String(f.translate).endsWith('8px') &&
            Number(f.opacity) === 1,
        );
      }),
    ).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (Reflect.get(window, 'easingSamples') as number[][]).some(
            ([p = 0, linear = 0]) => p - linear > 0.1,
          ),
        ),
      )
      .toBe(true);
    await page.evaluate(() => document.body.classList.add('app-final'));
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => {
        const element = document.getElementById('content') as HTMLElement;
        return {
          opacity: getComputedStyle(element).opacity,
          owned: element.getAnimations().length,
          eased: (Reflect.get(window, 'easingSamples') as number[][]).some(
            ([p = 0, linear = 0]) => p - linear > 0.1,
          ),
          inline: element.getAttribute('style'),
        };
      }),
    ).toEqual({ opacity: '0.8', owned: 0, eased: true, inline: null });
    expect(await page.evaluate(() => window.violations)).toEqual([]);
  });

for (const change of ['resize', 'competing-animation', 'target-removed'])
  test(`captured custom handoff settles on ${change} without stale effects`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.booted);
    await page.evaluate(async () => {
      const { defineAnimation } = await import(
        String('/pkg/dist/animations.js')
      );
      const region = document.getElementById('region') as LoadingRegion;
      const custom = defineAnimation({
        contractVersion: 1,
        id: 'example/invalidation',
        family: 'region',
        phase: 'handoff',
        options: { parse: () => ({}) },
        duration: () => 2000,
        prepare: () => undefined,
        frame({
          revealTarget,
        }: {
          revealTarget: (id: string, value: object) => void;
        }) {
          revealTarget('text', { opacity: 0.3 });
        },
      });
      region.update({
        state: 'ready',
        animations: { handoff: custom() },
        revealTargets: [
          {
            id: 'text',
            element: document.getElementById('value') as HTMLElement,
          },
        ],
      });
    });
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.evaluate((mode) => {
      if (mode === 'target-removed') document.getElementById('value')?.remove();
      else if (mode === 'resize') {
        const style = document.createElement('style');
        style.textContent = '.example{width:400px}';
        document.head.append(style);
      } else {
        const animation = document
          .getElementById('value')
          ?.animate([{ opacity: 1 }, { opacity: 0.9 }], { duration: 2000 });
        Reflect.set(window, 'appAnimation', animation);
      }
    }, change);
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#action')).toBeVisible();
    expect(await page.evaluate(() => window.events.map((e) => e.type))).toEqual(
      ['start', 'end'],
    );
    if (change === 'competing-animation')
      expect(
        await page.evaluate(
          () => Reflect.get(window, 'appAnimation').playState,
        ),
      ).toBe('running');
  });

test('dot/target limits are enforced before allocation and asynchronous commands cannot retain drawing authority', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  const result = await page.evaluate(async () => {
    const { defineAnimation } = await import(String('/pkg/dist/animations.js'));
    const dots = defineAnimation({
      contractVersion: 1,
      id: 'example/caps',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame() {},
      still({ dot }: { dot: (v: object) => void }) {
        for (let i = 0; i < 4097; i++)
          dot({ x: i % 50, y: 1, size: 2, opacity: 0.4, tone: 'base' });
        Reflect.set(window, 'expiredDot', dot);
      },
    });
    const hosts = Array.from({ length: 5 }, () => {
      const block = document.createElement('dotquilt-skeleton-block');
      block.motion = 'paused';
      block.animations = { idle: dots() };
      document.body.append(block);
      return block;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const counts = hosts.map(
      (host) => host.shadowRoot?.querySelectorAll('circle').length ?? 0,
    );
    const before = counts.reduce((a, b) => a + b, 0);
    Reflect.get(
      window,
      'expiredDot',
    )({ x: 1, y: 1, size: 1, opacity: 1, tone: 'base' });
    const after = hosts.reduce(
      (n, host) =>
        n + (host.shadowRoot?.querySelectorAll('circle').length ?? 0),
      0,
    );
    for (const host of hosts) host.remove();
    const region = document.getElementById('region') as LoadingRegion;
    region.revealTargets = Array.from({ length: 101 }, (_, i) => ({
      id: String(i),
      element: document.getElementById('content') as HTMLElement,
    }));
    return {
      perHost: counts.every((count) => count <= 4096),
      before,
      after,
      ledgerReleased: !Reflect.has(
        document,
        Symbol.for('dotquilt.v1.dot-ledger'),
      ),
      targets: region.revealTargets.length,
    };
  });
  expect(result).toEqual({
    perHost: true,
    before: 16384,
    after: 16384,
    ledgerReleased: true,
    targets: 100,
  });
});

test('replacement handles open/closed shadow focus and preserves authored role/tabindex', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  for (const mode of ['open', 'closed'] as const) {
    await page.evaluate((shadowMode) => {
      const region = document.getElementById('region') as LoadingRegion;
      region.setAttribute('role', 'region');
      region.tabIndex = 0;
      region.update({ state: 'ready', timing: { duration: 0 } });
      const custom = document.createElement('span');
      const root = custom.attachShadow({ mode: shadowMode });
      const button = document.createElement('button');
      button.textContent = 'Shadow action';
      root.append(button);
      document.getElementById('content')?.append(custom);
      queueMicrotask(() => {
        button.focus();
        region.update({ state: 'pending', cycle: shadowMode });
      });
    }, mode);
    await expect(page.locator('#region')).toBeFocused();
    await expect(page.locator('#action')).toBeHidden();
    await expect(page.locator('#region')).toHaveAttribute('role', 'region');
    await expect(page.locator('#region')).toHaveAttribute('tabindex', '0');
  }
});

test('zero-size/offscreen and invalid/late style policies keep current intent and per-host authorization', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent =
      '.zero{width:0!important;height:0!important;min-height:0!important}.away{position:absolute;top:100000px}';
    document.head.append(style);
  });
  for (const className of ['zero', 'away']) {
    await page.evaluate((name) => {
      (document.getElementById('region') as HTMLElement).className = name;
    }, className);
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
  }
  const result = await page.evaluate(async () => {
    const block = document.getElementById('block') as SkeletonBlock;
    const codes: string[] = [];
    block.addEventListener('dotquilt-error', (e) => codes.push(e.detail.code));
    block.stylePolicy = { mode: 'external', href: '/different.css' };
    const circular: Record<string, unknown> = { mode: 'inline' };
    circular.loop = circular;
    Reflect.set(block, 'stylePolicy', circular);
    const fresh = document.createElement('dotquilt-skeleton-block');
    const invalid: string[] = [];
    fresh.addEventListener('dotquilt-error', (e) =>
      invalid.push(e.detail.code),
    );
    fresh.stylePolicy = { mode: 'external', href: 'javascript:bad()' };
    document.body.append(fresh);
    const region = document.getElementById('region') as LoadingRegion;
    region.update({ state: 'ready', timing: { duration: 0 } });
    await Promise.resolve();
    region.className = 'example';
    return {
      codes,
      invalid,
      original: block.stylePolicy.mode,
      safe: fresh.stylePolicy.mode,
      presentation: region.presentation,
    };
  });
  expect(result).toEqual({
    codes: ['late-style-policy', 'invalid-style-policy'],
    invalid: ['invalid-style-policy'],
    original: 'inline',
    safe: 'inline',
    presentation: 'ready',
  });
  await expect(page.locator('#action')).toBeVisible();
});

test('published decorative speed cap and native option defaults recover from invalid numbers', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.booted);
  expect(
    await page.evaluate(() => {
      const block = document.getElementById('block') as SkeletonBlock;
      const defaults = [block.speed, block.pointerResponse, block.motion];
      block.speed = 999;
      const capped = block.speed;
      block.speed = Number.NaN;
      const invalid = block.speed;
      block.removeAttribute('speed');
      return { defaults, capped, invalid, restored: block.speed };
    }),
  ).toEqual({
    defaults: [1, 'none', 'system'],
    capped: 4,
    invalid: 1,
    restored: 1,
  });
});
