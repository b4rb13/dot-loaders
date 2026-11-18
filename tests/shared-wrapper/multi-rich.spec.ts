import { expect, type Page, test } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    Reflect.set(window, 'multiCSP', []);
    document.addEventListener('securitypolicyviolation', (e) =>
      Reflect.get(window, 'multiCSP').push(e.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) return;
  expect(pageErrors.get(page)).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, 'multiCSP'))).toEqual(
    [],
  );
  await page.evaluate(() => window.shared.remove());
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      animations: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, animations: 0 });
});
async function open(page: Page, framework: string, extra = '') {
  await page.clock.install();
  await page.goto(`/${framework}?family=region${extra}`);
  await page.waitForFunction(() => !!window.shared);
  await page.clock.runFor(80);
}
async function ready(page: Page, duration?: number) {
  await page.evaluate(
    (duration) =>
      window.shared.patch('owner', {
        state: 'ready',
        timing: duration === undefined ? undefined : { duration },
      }),
    duration,
  );
  await page.clock.runFor(80);
}

for (const framework of ['native', 'react']) {
  for (const mode of ['double-reveal', 'one-shot'])
    test(`${framework}: ${mode} reveal command retains its standalone meaning`, async ({
      page,
    }) => {
      await open(page, framework);
      await page.evaluate((mode) => window.shared.multi(mode), mode);
      await ready(page);
      const output = await page.locator('#owner').evaluate((host) => {
        const content = host.shadowRoot?.querySelector(
          '[part=content]',
        ) as HTMLElement;
        for (const animation of content.getAnimations())
          if (
            (animation.effect as KeyframeEffect)
              .getKeyframes()
              .some((frame) => 'clipPath' in frame)
          )
            animation.finish();
        return {
          opacity: getComputedStyle(content).opacity,
          clip: getComputedStyle(content).clipPath,
        };
      });
      expect(output).toEqual({
        opacity: '0.4',
        clip: 'inset(0px 75% 0px 0px)',
      });
    });
  for (const variant of ['bar', 'scatter']) {
    test(`${framework}: ${variant} geometry keeps its rich source beside table convergence`, async ({
      page,
    }) => {
      await open(page, framework);
      await page.evaluate((variant) => {
        window.shared.source(4, false);
        window.shared.provider(variant);
        window.shared.patch('chart', { variant });
      }, variant);
      await ready(page);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      expect(
        await page.evaluate(
          () =>
            (
              window.shared.plans.find((plan) => plan.family === 'chart')
                ?.input as { kind: string } | undefined
            )?.kind,
        ),
      ).toBe(variant);
      for (const id of ['chart', 'table'])
        expect(
          await page
            .locator(`#${id}`)
            .locator('[data-dotquilt-painter] circle')
            .count(),
        ).toBeGreaterThan(0);
      await page.clock.runFor(1000);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    });
  }
  for (const during of [false, true]) {
    test(`${framework}: local child pause restricts its owning choreography (${during})`, async ({
      page,
    }) => {
      await open(page, framework);
      if (during) await ready(page);
      await page.evaluate(() =>
        window.shared.patch('chart', { motion: 'paused' }),
      );
      await page.clock.runFor(50);
      if (!during) await ready(page);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
      expect(
        await page.evaluate(() => window.shared.events.at(-1)?.reason),
      ).toBe(during ? 'restricted' : 'immediate');
      await page.evaluate(() =>
        window.shared.patch('chart', { motion: undefined }),
      );
      await page.clock.runFor(100);
      expect(
        await page.evaluate(() =>
          window.shared.events.map((event) => event.type),
        ),
      ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    });
  }
  test(`${framework}: automatic multi-rich prepares and morphs every rich source on one owner`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(`/${framework}?family=region`);
    await page.waitForFunction(() => !!window.shared);
    await page.clock.runFor(80);
    await page.evaluate(() =>
      window.shared.patch('owner', { state: 'ready', timing: undefined }),
    );
    await page.clock.runFor(80);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(
      await page.evaluate(() => ({
        chart: window.shared.calls.chart,
        table: window.shared.calls.table,
      })),
    ).toEqual({ chart: 1, table: 1 });
    for (const id of ['chart', 'table'])
      expect(
        await page.locator(`#${id}`).locator('[data-dotquilt-painter]').count(),
      ).toBe(1);
    await page.clock.runFor(1000);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() =>
        window.shared.events.map((event) => event.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    await page.evaluate(() => window.shared.remove());
    await page.clock.runFor(80);
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
  test(`${framework}: two tables reveal only their own supplied rows and share the chart total`, async ({
    page,
  }) => {
    await open(page, framework, '&second=1');
    // RPCs that inspect four row effects must not consume the asserted timeline.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await ready(page);
    expect(
      await page.evaluate(() => ({
        chart: window.shared.calls.chart,
        table: window.shared.calls.table,
        table2: window.shared.calls.table2,
      })),
    ).toEqual({ chart: 1, table: 1, table2: 1 });
    for (const id of ['chart', 'table', 'table2'])
      expect(
        await page.locator(`#${id}`).locator('[data-dotquilt-painter]').count(),
      ).toBe(1);
    for (const id of ['row-a', 'row-b', 'row-c', 'row-d'])
      expect(
        await page
          .locator(`#${id}`)
          .evaluate((el) => el.getAnimations().length),
      ).toBe(1);
    await page.clock.runFor(600);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.clock.runFor(300);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    expect(
      await page.evaluate(() => window.shared.events.map((e) => e.animation)),
    ).toEqual(['dotquilt/coordinated', 'dotquilt/coordinated']);
  });
  for (const reverse of [false, true]) {
    test(`${framework}: custom source clocks and composed output are independent of DOM order (${reverse})`, async ({
      page,
    }) => {
      await open(page, framework, reverse ? '&reverse=1' : '');
      await page.evaluate(() => window.shared.multi('normal'));
      await ready(page);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      const output = await page.locator('#owner').evaluate((host) => {
        const el = host.shadowRoot?.querySelector<HTMLElement>(
          '[part=content]',
        ) as HTMLElement;
        // The virtual JS clock does not advance the compositor's one-ms effect.
        // Finish only the scoped reveal, leaving the owner's timed fade active.
        for (const animation of el.getAnimations())
          if (
            (animation.effect as KeyframeEffect)
              .getKeyframes()
              .some((frame) => 'clipPath' in frame)
          )
            animation.finish();
        const css = getComputedStyle(el);
        return {
          opacity: css.opacity,
          clip: css.clipPath,
          translate: css.translate,
          effects: el.getAnimations().length,
          inert: el.inert,
        };
      });
      expect(output).toMatchObject({
        opacity: '0.4',
        clip: 'inset(0px 75% 0px 0px)',
        translate: '0px -4px',
        effects: 2,
        inert: false,
      });
      const samples = await page.evaluate(() => window.shared.samples);
      expect(
        [...new Set(samples.map((sample) => sample.family))].sort(),
      ).toEqual(['chart', 'table']);
      for (const sample of samples)
        expect(sample.time).toBeCloseTo(sample.linear * 1100, 5);
      const last = new Map(samples.map((sample) => [sample.family, sample]));
      expect(last.get('chart')?.linear).toBe(last.get('table')?.linear);
      await page.clock.runFor(1100);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.shared.identity())).toBe(true);
      expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    });
  }
  test(`${framework}: explicit duration/easing applies to all captured sources without appended phases`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.evaluate(() => {
      window.shared.multi('normal');
      window.shared.patch('owner', {
        state: 'ready',
        timing: { duration: 600, easing: 'linear' },
      });
    });
    await page.clock.runFor(1);
    await page.locator('#owner').evaluate((host) => {
      for (const animation of host.shadowRoot
        ?.querySelector('[part=content]')
        ?.getAnimations() ?? []) {
        if (
          !(animation.effect as KeyframeEffect)
            .getKeyframes()
            .some((frame) => 'clipPath' in frame)
        ) {
          animation.pause();
          animation.currentTime = 300;
        }
      }
    });
    await page.clock.runFor(80);
    const samples = await page.evaluate(() => window.shared.samples);
    for (const sample of samples) {
      expect(sample.time).toBeCloseTo(sample.linear * 600, 5);
    }
    const last = new Map(samples.map((sample) => [sample.family, sample]));
    expect(last.get('chart')?.progress).toBe(0.5);
    expect(last.get('table')?.progress).toBe(0.5);
    await page.clock.runFor(600);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => window.shared.events.map((e) => e.type)),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  });
  test(`${framework}: conflicting child target commands settle safely and release every child`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.evaluate(() => window.shared.multi('conflict'));
    await ready(page);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.shared.errors)).toEqual([
      'conflicting-target',
      'animation-failed',
    ]);
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    expect(
      await page.evaluate(() => window.shared.events.map((e) => e.type)),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  });
  for (const mode of ['prepare-throw', 'mutate-content']) {
    test(`${framework}: later ${mode} discards already-prepared sources before drawing`, async ({
      page,
    }) => {
      await open(page, framework);
      await page.evaluate(
        (mode) =>
          mode === 'prepare-throw'
            ? window.shared.multi(mode)
            : window.shared.provider(mode),
        mode,
      );
      await ready(page);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      expect(await page.evaluate(() => window.shared.errors)).toEqual([
        'animation-failed',
      ]);
      expect(await page.evaluate(() => window.shared.samples)).toEqual([]);
      for (const id of ['table', 'chart'])
        expect(
          await page
            .locator(`#${id}`)
            .locator('[data-dotquilt-painter]')
            .count(),
        ).toBe(0);
      if (mode === 'mutate-content')
        await expect(page.locator('#row-a')).toContainText(
          'Changed during another source preparation',
        );
    });
  }
  for (const action of [
    'focus',
    'pause',
    'supersede',
    'remove-source',
    'recycle-target',
  ]) {
    test(`${framework}: ${action} terminates the entire owning choreography once`, async ({
      page,
    }) => {
      await open(page, framework);
      await ready(page);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      if (action === 'focus') await page.locator('#keep').focus();
      else
        await page.evaluate((action) => {
          if (action === 'pause')
            window.shared.patch('owner', { motion: 'paused' });
          if (action === 'supersede')
            window.shared.patch('owner', { state: 'pending', cycle: 'new' });
          if (action === 'remove-source')
            document.getElementById('chart')?.remove();
          if (action === 'recycle-target')
            document.getElementById('row-a')?.replaceWith(
              Object.assign(document.createElement('div'), {
                id: 'row-a',
                textContent: 'New row',
              }),
            );
        }, action);
      await page.clock.runFor(1000);
      await expect(page.locator('#owner')).toHaveAttribute(
        'data-presentation',
        action === 'supersede' ? 'pending' : 'ready',
      );
      const events = await page.evaluate(() => window.shared.events);
      expect(events.map((e) => e.type)).toEqual([
        'dotquilt-handoff-start',
        action === 'supersede'
          ? 'dotquilt-handoff-cancel'
          : 'dotquilt-handoff-end',
      ]);
      expect(
        await page
          .locator('#row-b')
          .evaluate((el) => el.getAnimations().length),
      ).toBe(0);
      if (action === 'focus') await expect(page.locator('#keep')).toBeFocused();
    });
  }
  test(`${framework}: max recommended sequence must fit the remaining shared four-second window`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.clock.runFor(3200);
    await ready(page);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.shared.events.at(-1)?.reason)).toBe(
      'immediate',
    );
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
  });
  test(`${framework}: missing chart geometry falls back locally while table convergence remains active`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.evaluate(() => window.shared.provider('chart-null'));
    await ready(page);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(
      await page.evaluate(() => ({
        chart: window.shared.calls.chart,
        table: window.shared.calls.table,
      })),
    ).toEqual({ chart: 2, table: 1 });
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(1);
    await page.clock.runFor(650);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
  });
  test(`${framework}: compatible source painters share the document cap and release every reservation`, async ({
    page,
  }) => {
    await open(page, framework, '&second=1');
    await page.evaluate(() => window.shared.multi('saturate'));
    await page.clock.runFor(30);
    await page.evaluate(() => {
      const original = document.getElementById('chart') as HTMLElement;
      for (let i = 0; i < 2; i++) {
        const el = document.createElement('dotquilt-chart-loader');
        Object.assign(el, {
          id: `extra-${i}`,
          stylePolicy: { mode: 'external', href: '/styles/chart.css' },
          animations: Reflect.get(original, 'animations'),
        });
        document.getElementById('placeholder')?.append(el);
      }
    });
    await page.clock.runFor(80);
    await ready(page);
    expect(
      await page.evaluate(
        () => Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger'))?.dots,
      ),
    ).toBe(16384);
    const counts = await page
      .locator('dotquilt-chart-loader,dotquilt-table-loader')
      .evaluateAll((hosts) =>
        hosts.map(
          (host) =>
            host.shadowRoot?.querySelectorAll('[data-dotquilt-painter] circle')
              .length ?? 0,
        ),
      );
    expect(counts).toHaveLength(5);
    expect(counts.every((count) => count <= 4096)).toBe(true);
    expect(await page.evaluate(() => window.shared.errors)).toContain(
      'document-dot-limit',
    );
    await page.locator('#keep').focus();
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
  });
  test(`${framework}: nested owners remain outside automatic source discovery`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.evaluate(() => {
      const nested = document.createElement('dotquilt-region'),
        child = document.createElement('dotquilt-chart-loader');
      Object.assign(nested, {
        id: 'nested',
        state: 'pending',
        motion: 'paused',
        stylePolicy: { mode: 'external', href: '/styles/region.css' },
      });
      Object.assign(child, {
        slot: 'placeholder',
        stylePolicy: { mode: 'external', href: '/styles/chart.css' },
        targetProvider: () => {
          Reflect.set(window, 'nestedProviderCalled', true);
          return null;
        },
      });
      nested.append(child, document.createTextNode('Independent outcome'));
      document.getElementById('placeholder')?.append(nested);
    });
    await page.clock.runFor(80);
    await ready(page);
    expect(
      await page.evaluate(() => Reflect.get(window, 'nestedProviderCalled')),
    ).toBeUndefined();
    await expect(page.locator('#nested')).toHaveAttribute(
      'data-presentation',
      'pending',
    );
    await page.clock.runFor(1000);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator('#nested')).toHaveAttribute(
      'data-presentation',
      'pending',
    );
  });
  test(`${framework}: a competing application row animation survives coordinated settlement`, async ({
    page,
  }) => {
    await open(page, framework);
    await ready(page);
    await page.locator('#row-a').evaluate((el) => {
      const animation = el.animate(
        { opacity: [0.7, 0.8] },
        { duration: 2000, fill: 'both' },
      );
      animation.pause();
      Reflect.set(window, 'multiAppAnimation', animation);
    });
    await page.clock.runFor(50);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.locator('#row-a').evaluate((el) => el.getAnimations().length),
    ).toBe(1);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([
      'animation-failed',
    ]);
    await page.evaluate(() =>
      Reflect.get(window, 'multiAppAnimation').cancel(),
    );
    expect(await page.evaluate(() => window.shared.identity())).toBe(true);
  });
}
