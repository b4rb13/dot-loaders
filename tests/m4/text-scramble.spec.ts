import { expect, type Page, test } from '@playwright/test';

// This file's own cases use the same installed native runtime in both adapters.
type Variant = 'scrambleCharacters' | 'scrambleWords';
type Framework = 'native' | 'react';
async function state(
  page: Page,
  framework: Framework,
  state: 'pending' | 'ready',
) {
  await page.evaluate(
    ({ framework, state }) => {
      if (framework === 'native')
        window.m4Text.update({
          state,
          ...(state === 'pending' ? { cycle: crypto.randomUUID() } : {}),
        });
      else window.m4TextReact.change(state);
    },
    { framework, state },
  );
}
async function recipe(
  page: Page,
  framework: Framework,
  name: Variant | 'lock' | 'printText' | 'fade',
) {
  await page.evaluate(
    ({ framework, name }) => {
      if (framework === 'native') window.m4Text.recipe(name);
      else window.m4TextReact.recipe(name);
    },
    { framework, name },
  );
  await page.clock.runFor(40);
}
async function open(page: Page, framework: Framework, mode = 'inline') {
  await page.clock.install();
  await page.goto(`/text${framework === 'react' ? '-react' : ''}?mode=${mode}`);
  await expect
    .poll(() =>
      page.evaluate(
        (f) => (f === 'native' ? !!window.m4Text : !!window.m4TextReact),
        framework,
      ),
    )
    .toBe(true);
  await page.clock.runFor(80);
  await state(page, framework, 'ready');
  await page.clock.runFor(1200);
}
async function teardown(page: Page, framework: Framework) {
  await page.evaluate((f) => {
    if (f === 'react') window.m4TextReact.unmount();
    else document.getElementById('text')?.remove();
  }, framework);
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      effects: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, effects: 0 });
}
for (const framework of ['native', 'react'] as const)
  for (const variant of ['scrambleCharacters', 'scrambleWords'] as const) {
    for (const mode of ['inline', 'external'])
      test(`${framework} ${variant}: stable masked content and all reveals under ${mode}`, async ({
        page,
      }) => {
        const failures: string[] = [];
        page.on('pageerror', (e) => failures.push(String(e)));
        await open(page, framework, mode);
        if (framework === 'native')
          await page.evaluate(() => {
            window.m4Text.text('Loading your data');
            window.m4Text.update({ mask: undefined });
          });
        await recipe(page, framework, variant);
        for (const handoff of ['lock', 'printText', 'fade'] as const) {
          await recipe(page, framework, handoff);
          await state(page, framework, 'pending');
          await page.clock.runFor(100);
          const host = page.locator('#text');
          await expect(host).toHaveAttribute('data-moving', '');
          const dots = host.locator('[data-dotquilt-painter] circle');
          const snapshot = () =>
            dots.evaluateAll((nodes) =>
              nodes.map((n) => n.getAttribute('opacity')),
            );
          const before = await snapshot();
          expect(before.length).toBeGreaterThan(0);
          await page.clock.runFor(650);
          expect(await snapshot()).not.toEqual(before);
          expect(await host.ariaSnapshot()).not.toContain(
            framework === 'native' ? 'Loading your data' : '128,450',
          );
          await state(page, framework, 'ready');
          await page.clock.runFor(1200);
          await expect(host).toHaveAttribute('data-presentation', 'ready');
          await expect(dots).toHaveCount(0);
          expect(await host.ariaSnapshot()).toContain(
            framework === 'native' ? 'Loading your data' : '128,450',
          );
          expect(
            await page.evaluate(
              (f) =>
                f === 'native'
                  ? window.m4Text.identity()
                  : window.m4TextReact.identity(),
              framework,
            ),
          ).toBe(true);
        }
        expect(failures).toEqual([]);
        expect(
          await page.evaluate(
            (f) =>
              f === 'native' ? window.m4Text.errors : window.m4TextReact.errors,
            framework,
          ),
        ).toEqual([]);
        if (framework === 'native')
          expect(await page.evaluate(() => window.m4Text.violations)).toEqual(
            [],
          );
        await teardown(page, framework);
      });
    test(`${framework} ${variant}: finite window, pause, reduced motion and forced colors retain content`, async ({
      page,
    }) => {
      await open(page, framework);
      await recipe(page, framework, variant);
      await state(page, framework, 'pending');
      await page.clock.runFor(4400);
      await expect(page.locator('#text')).not.toHaveAttribute(
        'data-moving',
        '',
      );
      await state(page, framework, 'ready');
      await page.clock.runFor(100);
      for (const restricted of ['paused', 'reduce', 'forced'] as const) {
        if (restricted === 'paused')
          await page
            .locator('#text')
            .evaluate((host) => host.setAttribute('motion', 'paused'));
        else if (restricted === 'reduce')
          await page.emulateMedia({ reducedMotion: 'reduce' });
        else await page.emulateMedia({ forcedColors: 'active' });
        await state(page, framework, 'pending');
        await page.clock.runFor(100);
        await expect(page.locator('#text')).not.toHaveAttribute(
          'data-moving',
          '',
        );
        await state(page, framework, 'ready');
        await page.clock.runFor(100);
        await expect(page.locator('#text')).toHaveAttribute(
          'data-presentation',
          'ready',
        );
        await expect(page.locator('#text')).toContainText('$128,450');
        if (restricted === 'paused')
          await page
            .locator('#text')
            .evaluate((host) => host.removeAttribute('motion'));
        else
          await page.emulateMedia({
            reducedMotion: 'no-preference',
            forcedColors: 'none',
          });
      }
      await teardown(page, framework);
    });
  }
for (const variant of ['scrambleCharacters', 'scrambleWords'] as const)
  test(`${variant}: unsupported text retains generic fallback and supersession remains bounded`, async ({
    page,
  }) => {
    await open(page, 'native');
    await recipe(page, 'native', variant);
    await page.evaluate(() => {
      window.m4Text.text('مرحبا 👋🏽');
      window.m4Text.update({
        mask: undefined,
        state: 'pending',
        cycle: 'unicode',
      });
    });
    await page.clock.runFor(80);
    expect(
      await page.evaluate(() => window.m4Text.surface().input.precise),
    ).toBe(false);
    await state(page, 'native', 'ready');
    await page.clock.runFor(1200);
    await expect(page.locator('#text')).toContainText('مرحبا 👋🏽');
    await page.evaluate(() => {
      window.m4Text.text('Ready soon');
      window.m4Text.update({ state: 'pending', cycle: 'plain' });
    });
    await page.clock.runFor(100);
    await state(page, 'native', 'ready');
    await page.clock.runFor(80);
    await state(page, 'native', 'pending');
    await page.clock.runFor(80);
    expect(
      await page.evaluate(
        () =>
          window.m4Text.events.filter(
            (e) => e.type === 'dotquilt-handoff-cancel',
          ).length,
      ),
    ).toBe(1);
    await state(page, 'native', 'ready');
    await page.clock.runFor(1200);
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
    expect(
      await page.evaluate(() =>
        window.m4Text.errors.every((code) => code === 'generic-text-fallback'),
      ),
    ).toBe(true);
    await teardown(page, 'native');
  });
