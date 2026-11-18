import { expect, test } from '@playwright/test';
import type { FixtureAPI } from './shared.js';

const ids = [
  'block',
  'line',
  'circle',
  'multiline',
  'typing',
  'text',
  'chart',
  'table',
];
test('native explicit pre-upgrade geometry survives static preset enhancement and can be cleared', async ({
  page,
}) => {
  await page.goto('/native?enhance=0');
  await page.evaluate(async () => {
    Reflect.set(
      document.getElementById('chart') as HTMLElement,
      'variant',
      'scatter',
    );
    Reflect.set(document.getElementById('typing') as HTMLElement, 'count', 5);
    const entry: string = '/native.js';
    await import(entry);
  });
  await expect
    .poll(() =>
      page
        .locator('#chart')
        .evaluate((host) => Reflect.get(host, 'preset')?.kind),
    )
    .toBe('chart');
  await page.evaluate(() => {
    window.presets.patch('chart', {
      preset: { kind: 'chart', variant: 'bar' },
    });
    window.presets.patch('typing', { preset: { kind: 'typing', count: 6 } });
  });
  expect(
    await page
      .locator('#chart')
      .evaluate((host) => Reflect.get(host, 'variant')),
  ).toBe('scatter');
  expect(
    await page
      .locator('#typing')
      .evaluate((host) => Reflect.get(host, 'count')),
  ).toBe(5);
  await page.evaluate(() => {
    window.presets.patch('chart', { variant: undefined });
    window.presets.patch('typing', { count: undefined });
  });
  await expect
    .poll(() =>
      page.locator('#chart').evaluate((host) => Reflect.get(host, 'variant')),
    )
    .toBe('bar');
  await expect
    .poll(() =>
      page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
    )
    .toBe(6);
  expect(await page.evaluate(() => window.presets.identity())).toBe(true);
  expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
});
for (const framework of ['native', 'react']) {
  test(`${framework}: authored handoff presets and explicit phase overrides share the region lifecycle`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page
          .locator('#region')
          .evaluate((host) => Reflect.get(host, 'preset')?.kind),
      )
      .toBe('region');
    for (const [index, explicit] of [false, true, false].entries()) {
      await page.evaluate(
        ({ index, explicit }) => {
          window.presets.patch('region', {
            state: 'pending',
            cycle: `preset-${index}`,
          });
          window.presets.customHandoff(explicit);
        },
        { index, explicit },
      );
      await expect(page.locator('#region')).toHaveAttribute(
        'data-presentation',
        'pending',
      );
      await expect
        .poll(() =>
          page
            .locator('#region')
            .evaluate(
              (host) => Reflect.get(host, 'preset')?.animations?.handoff?.id,
            ),
        )
        .toBe('fixture/preset-reveal');
      await page.evaluate(() =>
        window.presets.patch('region', { state: 'ready' }),
      );
      await expect(page.locator('#region')).toHaveAttribute(
        'data-presentation',
        'ready',
      );
      const events = await page.evaluate(() =>
        window.presets.events.filter((event) => event.id === 'region'),
      );
      expect(events).toHaveLength((index + 1) * 2);
      expect(events.at(-2)?.animation).toBe(
        explicit ? 'fixture/explicit-reveal' : 'fixture/preset-reveal',
      );
      expect(events.at(-1)?.type).toBe('dotquilt-handoff-end');
      expect(await page.evaluate(() => window.presets.identity())).toBe(true);
    }
    expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
  });
  test(`${framework}: static geometry and original content survive preset enhancement under strict CSP`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`/${framework}?enhance=0`);
    await expect(
      page.locator('#typing [data-dotquilt-static] .dot'),
    ).toHaveCount(5);
    await expect(page.locator('#chart')).toHaveAttribute('variant', 'scatter');
    await expect(page.locator('#value')).toBeHidden();
    const before = await page.locator('#chart').boundingBox();
    await page.evaluate(async (framework) => {
      const value = document.getElementById('value');
      Reflect.set(window, 'originalPresetInput', value);
      Reflect.set(window, 'presetCSP', [] as string[]);
      document.addEventListener('securitypolicyviolation', (event) =>
        (Reflect.get(window, 'presetCSP') as string[]).push(
          event.violatedDirective,
        ),
      );
      const entry: string = `/${framework}.js`;
      await import(entry);
    }, framework);
    await expect
      .poll(() =>
        page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
      )
      .toBe(5);
    await expect
      .poll(() =>
        page
          .locator('#chart')
          .evaluate((host) => Reflect.get(host, 'preset')?.kind),
      )
      .toBe('chart');
    expect(await page.locator('#chart').boundingBox()).toEqual(before);
    expect(
      await page.evaluate(
        () =>
          Reflect.get(window, 'originalPresetInput') ===
          document.getElementById('value'),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => Reflect.get(window, 'presetCSP'))).toEqual(
      [],
    );
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
    await page.evaluate(() => {
      window.presets.patch('chart', {
        preset: { kind: 'chart', variant: 'bar' },
      });
      window.presets.patch('typing', { preset: { kind: 'typing', count: 6 } });
    });
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'variant')),
      )
      .toBe('bar');
    await expect
      .poll(() =>
        page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
      )
      .toBe(6);
  });

  test(`${framework}: all catalog defaults resolve and undefined overrides restore presets`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'speed')),
      )
      .toBe(0.5);
    const original = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const host = document.getElementById(id) as HTMLElement;
          return {
            id,
            speed: Reflect.get(host, 'speed'),
            pointer: Reflect.get(host, 'pointerResponse'),
            motion: Reflect.get(host, 'motion'),
            frozen: Object.isFrozen(Reflect.get(host, 'preset')),
          };
        }),
      ids,
    );
    expect(original.map((row) => row.speed)).toEqual([
      0.6, 0.6, 0.6, 0.6, 0.8, 0.7, 0.5, 0.4,
    ]);
    expect(original.every((row) => row.motion === 'system' && row.frozen)).toBe(
      true,
    );
    await page.evaluate((ids) => {
      for (const id of ids)
        window.presets.patch(id, {
          speed: 2,
          ...(id !== 'typing' ? { pointerResponse: 'none' } : {}),
        });
      window.presets.patch('chart', { variant: 'bar' });
      window.presets.patch('typing', { count: 2 });
    }, ids);
    await expect
      .poll(() =>
        page.locator('#table').evaluate((host) => Reflect.get(host, 'speed')),
      )
      .toBe(2);
    await expect(page.locator('#chart')).toHaveAttribute('variant', 'bar');
    await expect
      .poll(() =>
        page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
      )
      .toBe(2);
    await page.evaluate((ids) => {
      for (const id of ids)
        window.presets.patch(id, {
          speed: undefined,
          ...(id !== 'typing' ? { pointerResponse: undefined } : {}),
        });
      window.presets.patch('chart', { variant: undefined });
      window.presets.patch('typing', { count: undefined });
    }, ids);
    await expect
      .poll(() =>
        page.locator('#table').evaluate((host) => Reflect.get(host, 'speed')),
      )
      .toBe(0.4);
    expect(
      await page.evaluate(
        (ids) =>
          ids.map((id) =>
            Reflect.get(document.getElementById(id) as HTMLElement, 'speed'),
          ),
        ids,
      ),
    ).toEqual(original.map((row) => row.speed));
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'variant')),
      )
      .toBe('scatter');
    await expect
      .poll(() =>
        page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
      )
      .toBe(5);
    expect(await page.evaluate(() => window.presets.events)).toEqual([]);
    expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
  });

  test(`${framework}: preset replacement does not restart a captured handoff or remount content`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page
          .locator('#region')
          .evaluate((host) => Reflect.get(host, 'timing')?.duration),
      )
      .toBe(600);
    await page.evaluate(() => {
      document.getElementById('region')?.addEventListener(
        'dotquilt-handoff-start',
        () => {
          window.presets.patch('region', {
            preset: {
              kind: 'region',
              timing: { duration: 1800, easing: 'ease-in' },
            },
          });
          requestAnimationFrame(() => {
            const host = document.getElementById('region');
            Reflect.set(
              window,
              'capturedPresetDurations',
              host?.shadowRoot
                ?.querySelector('[part=placeholder]')
                ?.getAnimations()
                .map((effect) => effect.effect?.getTiming().duration),
            );
          });
        },
        { once: true },
      );
      window.presets.patch('region', { state: 'ready' });
    });
    await expect(page.locator('#region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => Reflect.get(window, 'capturedPresetDurations')),
    ).toEqual([600]);
    await expect
      .poll(() =>
        page
          .locator('#region')
          .evaluate((host) => Reflect.get(host, 'timing')?.duration),
      )
      .toBe(1800);
    expect(
      await page.evaluate(() =>
        window.presets.events
          .filter((event) => event.id === 'region')
          .map((event) => event.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    expect(await page.evaluate(() => window.presets.identity())).toBe(true);
    await page.locator('#value').fill('preserved');
    await expect(page.locator('#value')).toHaveValue('preserved');
    expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
  });

  test(`${framework}: partial timing overrides resolve independently and removal restores preset values`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page
          .locator('#text')
          .evaluate((host) => Reflect.get(host, 'timing')?.duration),
      )
      .toBe(500);
    await page.evaluate(() =>
      window.presets.patch('text', { timing: { easing: 'ease-in' } }),
    );
    await expect
      .poll(() =>
        page.locator('#text').evaluate((host) => Reflect.get(host, 'timing')),
      )
      .toEqual({ duration: 500, easing: 'ease-in' });
    await page.evaluate(() =>
      window.presets.patch('text', { timing: undefined }),
    );
    await expect
      .poll(() =>
        page.locator('#text').evaluate((host) => Reflect.get(host, 'timing')),
      )
      .toEqual({ duration: 500, easing: 'linear' });
    await page.evaluate(() =>
      window.presets.patch('text', { preset: undefined }),
    );
    await expect
      .poll(() =>
        page.locator('#text').evaluate((host) => Reflect.get(host, 'timing')),
      )
      .toEqual({});
    await expect
      .poll(() =>
        page.locator('#text').evaluate((host) => Reflect.get(host, 'speed')),
      )
      .toBe(1);
    expect(await page.evaluate(() => window.presets.events)).toEqual([]);
  });

  test(`${framework}: ancestor preset pause remains authoritative and configuration cannot renew the motion window`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(`/${framework}`);
    await page.clock.runFor(50);
    await expect(page.locator('#typing')).toHaveAttribute('data-moving', '');
    await page.evaluate(() =>
      window.presets.patch('region', {
        preset: { kind: 'region', motion: 'paused' },
      }),
    );
    await page.clock.runFor(30);
    await expect(page.locator('#typing')).not.toHaveAttribute(
      'data-moving',
      '',
    );
    await page.evaluate(() =>
      window.presets.patch('typing', { motion: 'system' }),
    );
    await page.clock.runFor(30);
    await expect(page.locator('#typing')).not.toHaveAttribute(
      'data-moving',
      '',
    );
    await page.evaluate(() =>
      window.presets.patch('region', { motion: 'system' }),
    );
    await page.clock.runFor(30);
    await expect(page.locator('#typing')).toHaveAttribute('data-moving', '');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(30);
    await expect(page.locator('#typing')).not.toHaveAttribute(
      'data-moving',
      '',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.runFor(4100);
    await page.evaluate(() =>
      window.presets.patch('typing', {
        preset: { kind: 'typing', count: 6, speed: 0.9 },
      }),
    );
    await page.clock.runFor(30);
    await expect(page.locator('#typing')).not.toHaveAttribute(
      'data-moving',
      '',
    );
    expect(await page.evaluate(() => window.presets.events)).toEqual([]);
  });

  test(`${framework}: invalid mounted presets recover once without exposing pending content`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page
          .locator('#chart')
          .evaluate((host) => Reflect.get(host, 'preset')?.kind),
      )
      .toBe('chart');
    for (let i = 0; i < 2; i++)
      await page.evaluate(() =>
        window.presets.patch('chart', {
          preset: { kind: 'chart', state: 'ready' },
        }),
      );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.presets.errors.filter((error) => error.id === 'chart'),
        ),
      )
      .toEqual([{ id: 'chart', code: 'invalid-preset' }]);
    await expect(page.locator('#value')).toBeHidden();
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'variant')),
      )
      .toBe('line');
    await page.evaluate(() =>
      window.presets.patch('chart', {
        preset: { kind: 'chart', variant: 'bar', speed: 0.9 },
      }),
    );
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'variant')),
      )
      .toBe('bar');
    await expect
      .poll(() =>
        page.locator('#chart').evaluate((host) => Reflect.get(host, 'speed')),
      )
      .toBe(0.9);
    expect(await page.evaluate(() => window.presets.events)).toEqual([]);
    expect(await page.evaluate(() => window.presets.identity())).toBe(true);
  });

  test(`${framework}: removal releases all animation effects`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expect
      .poll(() =>
        page.locator('#typing').evaluate((host) => Reflect.get(host, 'count')),
      )
      .toBe(5);
    await page.evaluate(() => (window.presets as FixtureAPI).remove());
    await expect(page.locator('#stage')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((effect) => effect.playState === 'running').length,
        ),
      )
      .toBe(0);
    expect(await page.evaluate(() => window.presets.errors)).toEqual([]);
  });
}

test('each native class retains its family validator and inherited shape policy', async ({
  page,
}) => {
  await page.goto('/native');
  await expect
    .poll(() =>
      page
        .locator('#chart')
        .evaluate((host) => Reflect.get(host, 'preset')?.kind),
    )
    .toBe('chart');
  const result = await page.evaluate(() => {
    const cases = [
      ['dotquilt-skeleton-block', 'skeleton', { speed: 0.8 }, { count: 2 }],
      [
        'dotquilt-skeleton-line',
        'skeleton',
        { pointerResponse: 'lift' },
        { variant: 'bar' },
      ],
      [
        'dotquilt-skeleton-circle',
        'skeleton',
        { speed: 0.7 },
        { timing: { duration: 200 } },
      ],
      [
        'dotquilt-skeleton-text',
        'skeleton',
        { motion: 'paused' },
        { count: 3 },
      ],
      ['dotquilt-typing-dots', 'typing', { count: 7 }, { animations: {} }],
      [
        'dotquilt-text-loader',
        'text',
        { timing: { easing: 'cubic-bezier(.2,-1,.8,2)' } },
        { variant: 'line' },
      ],
      ['dotquilt-chart-loader', 'chart', { variant: 'bar' }, { count: 2 }],
      [
        'dotquilt-table-loader',
        'table',
        { pointerResponse: 'lift' },
        { variant: 'bar' },
      ],
      [
        'dotquilt-region',
        'region',
        { timing: { duration: 250 } },
        { speed: 1 },
      ],
    ] as const;
    return cases.map(([tag, kind, good, bad]) => {
      const host = document.createElement(tag);
      const errors: string[] = [];
      host.addEventListener('dotquilt-error', (e) =>
        errors.push((e as CustomEvent).detail.code),
      );
      let reads = 0;
      Reflect.set(host, 'preset', {
        kind,
        ...good,
        get motion() {
          reads++;
          return 'paused';
        },
      });
      const captured = Reflect.get(host, 'preset');
      const valid =
        captured?.kind === kind && Object.isFrozen(captured) && reads === 1;
      Reflect.set(host, 'preset', { kind, ...bad });
      const rejected = Reflect.get(host, 'preset') === undefined;
      for (const key of ['unrecognized', Symbol('unrecognized')])
        Reflect.set(
          host,
          'preset',
          Object.defineProperty({ kind }, key, { value: true }),
        );
      Reflect.set(host, 'preset', {
        kind: kind === 'typing' ? 'chart' : 'typing',
      });
      const invalid = Reflect.get(host, 'preset') === undefined;
      Reflect.set(host, 'preset', { kind, ...good });
      const recovered = Reflect.get(host, 'preset')?.kind === kind;
      return { tag, valid, rejected, invalid, recovered, errors };
    });
  });
  expect(result).toHaveLength(9);
  for (const row of result) {
    expect(row, row.tag).toMatchObject({
      valid: true,
      rejected: true,
      invalid: true,
      recovered: true,
      errors: ['invalid-preset'],
    });
  }
});
