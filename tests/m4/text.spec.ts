import type { TextLoader } from '@dotquilt-internal/core/text';
import { expect, test } from '@playwright/test';
import { capture } from '../capture';

declare global {
  interface Window {
    m4Text: {
      refreshStyles(): void;
      events: { type: string; reason?: string; animation?: string }[];
      errors: string[];
      violations: string[];
      update(patch: Parameters<TextLoader['update']>[0]): void;
      text(value: string): void;
      recipe(
        name:
          | 'scramble'
          | 'scrambleCharacters'
          | 'scrambleWords'
          | 'labelPulse'
          | 'lock'
          | 'printText'
          | 'fade',
        options?: object,
      ): void;
      preset(): void;
      surface(): import('@dotquilt-internal/core').AnimationSurface<'text'>;
      custom(): void;
      broken(): void;
      targeted(reentrant?: boolean): void;
      frozen(): boolean;
      stale(): void;
      frames(): number;
      identity(): boolean;
    };
    m4TextReact: {
      errors: string[];
      events: string[];
      change(state: 'ready' | 'pending' | 'refreshing'): void;
      recipe(
        name:
          | 'scrambleCharacters'
          | 'scrambleWords'
          | 'lock'
          | 'printText'
          | 'fade',
      ): void;
      ref(): string;
      identity(): boolean;
      unmount(): void;
    };
  }
}
const dots = '[data-dotquilt-painter] circle';
test('reentrant fallback diagnostics release idle work and keep the generic outgoing mask visible', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    const host = document.getElementById('text') as TextLoader;
    host.addEventListener('dotquilt-error', (event) => {
      if (event.detail.code === 'generic-text-fallback')
        host.update({ state: 'ready', timing: { duration: 1000 } });
    });
    const bold = document.createElement('b');
    bold.textContent = ' preserved';
    host.append(bold);
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await expect(page.locator(dots)).toHaveCount(0);
  expect(
    await page
      .locator('#text')
      .evaluate(
        (host) =>
          host.shadowRoot?.querySelectorAll('[data-dotquilt-painter]').length,
      ),
  ).toBe(1);
  expect(
    await page
      .locator('#text')
      .evaluate(
        (host) =>
          getComputedStyle(host.shadowRoot?.querySelector('.mask') as Element)
            .visibility,
      ),
  ).toBe('visible');
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
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
test('font listeners release from the original document on adoption and from the new document on removal', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  const counts = await page.evaluate(() => {
    const host = document.getElementById('text') as TextLoader;
    const original = document.fonts;
    const next = document.implementation.createHTMLDocument('text-adoption');
    const replacement = next.fonts;
    // A font load re-checks the text's geometry (refreshing only if it
    // changed), so count those checks.
    const target = host as unknown as { environmentChanged(): void };
    let refreshes = 0;
    const check = target.environmentChanged.bind(host);
    target.environmentChanged = () => {
      refreshes++;
      check();
    };
    original.dispatchEvent(new Event('loadingdone'));
    const initial = refreshes;
    next.body.append(next.adoptNode(host));
    original.dispatchEvent(new Event('loadingdone'));
    const afterOldDocument = refreshes;
    replacement.dispatchEvent(new Event('loadingdone'));
    const afterNewDocument = refreshes;
    host.remove();
    original.dispatchEvent(new Event('loadingdone'));
    replacement.dispatchEvent(new Event('loadingdone'));
    return {
      initial,
      afterOldDocument,
      afterNewDocument,
      afterRemoval: refreshes,
      ledger: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
  });
  expect(counts).toEqual({
    initial: 1,
    afterOldDocument: 1,
    afterNewDocument: 2,
    afterRemoval: 2,
    ledger: undefined,
  });
});
test('font and shadow stylesheet load invalidation stops observing after disconnect', async ({
  page,
}) => {
  await page.goto('/text?mode=external');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  const calls = await page.evaluate(() => {
    const host = document.getElementById('text') as TextLoader;
    // Each load re-checks the text's geometry (refreshing only if it changed).
    const target = host as unknown as { environmentChanged(): void };
    const check = target.environmentChanged.bind(host);
    let count = 0;
    target.environmentChanged = () => {
      count++;
      check();
    };
    document.fonts.dispatchEvent(new Event('loadingdone'));
    host.shadowRoot?.querySelector('link')?.dispatchEvent(new Event('load'));
    const connected = count;
    host.remove();
    document.fonts.dispatchEvent(new Event('loadingdone'));
    host.shadowRoot?.querySelector('link')?.dispatchEvent(new Event('load'));
    return { connected, disconnected: count };
  });
  expect(calls).toEqual({ connected: 2, disconnected: 2 });
});
test('TextLoader moves once its external stylesheet loads, even if its size stays the same', async ({
  page,
}) => {
  // Until its external stylesheet loads, the loader keeps its static
  // presentation and has no mask glyphs. It measures again when its size or
  // font changes, which loading the stylesheet usually causes. Here the page
  // gives the content part the box the stylesheet would, so nothing changes
  // size: the glyphs that arrive with the stylesheet must still be measured.
  // (React hydration could hit the same state by chance: re-measuring after
  // the rules applied, but before the loader noticed the sheet.)
  await page.route('**/app.css', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}#text::part(content){display:block;grid-area:1/1}`,
    });
  });
  await page.goto(
    `/text?mode=external&sheet=${encodeURIComponent('/core/styles/text.css?shadow')}`,
  );
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  expect(
    await page.evaluate(() => window.m4Text.surface().input.mask.length),
  ).toBe(8);
  expect(await page.locator(dots).count()).toBeGreaterThan(100);
});
test('custom text handoffs retain frozen capabilities and settle removed targets without stale effects', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    window.m4Text.targeted();
    window.m4Text.update({ state: 'ready' });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  expect(await page.evaluate(() => window.m4Text.frozen())).toBe(true);
  await page.evaluate(() => {
    (document.getElementById('text') as TextLoader).revealTargets = [];
    window.m4Text.stale();
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() =>
      window.m4Text.events.map((event) => [event.type, event.reason]),
    ),
  ).toEqual([
    ['dotquilt-handoff-start', undefined],
    ['dotquilt-handoff-end', 'targets-changed'],
  ]);
  expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
  expect(
    await page
      .locator('#text')
      .evaluate((host) =>
        [
          ...(host.shadowRoot?.querySelectorAll('*') ?? []),
          ...host.querySelectorAll('*'),
        ].reduce((count, element) => count + element.getAnimations().length, 0),
      ),
  ).toBe(0);
  await expect(page.locator(dots)).toHaveCount(0);
});
test('shared content observation settles a first-party reveal when inner size changes inside a fixed host', async ({
  page,
}) => {
  await page.goto('/text');
  await page.locator('#text').evaluate((host) => {
    host.style.width = '320px';
    host.style.height = '64px';
  });
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() =>
    window.m4Text.update({ state: 'ready', timing: { duration: 1800 } }),
  );
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  const size = await page.locator('#text').evaluate((host) => {
    const before = host.getBoundingClientRect();
    const content = host.shadowRoot?.querySelector<HTMLElement>('.c');
    if (!content) throw new Error('Missing content layer');
    content.style.width = '200px';
    const after = host.getBoundingClientRect();
    return [before.width, before.height, after.width, after.height];
  });
  expect(size.slice(0, 2)).toEqual(size.slice(2));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Text.events.at(-1)?.reason)).toBe(
    'geometry-changed',
  );
  expect(
    await page
      .locator('#text')
      .evaluate(
        (host) =>
          host.shadowRoot?.querySelector<HTMLElement>('.c')?.style.width,
      ),
  ).toBe('200px');
  await expect(page.locator(dots)).toHaveCount(0);
});
test('supersession during the first author frame clears terminal handlers and releases the old handoff', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  const result = await page.evaluate(async () => {
    const host = document.getElementById('text') as TextLoader;
    const layer = host.shadowRoot?.querySelector('.p') as HTMLElement;
    const animate = layer.animate.bind(layer);
    const owned: Animation[] = [];
    layer.animate = ((...args: Parameters<typeof layer.animate>) => {
      const animation = animate(...args);
      owned.push(animation);
      return animation;
    }) as typeof layer.animate;
    window.m4Text.targeted(true);
    host.state = 'ready';
    await new Promise((resolve) => setTimeout(resolve, 30));
    return {
      states: owned.map((animation) => [
        animation.playState,
        animation.onfinish === null,
      ]),
      events: window.m4Text.events.map((event) => event.type),
    };
  });
  expect(result.states).toEqual([['idle', true]]);
  expect(result.events).toEqual([
    'dotquilt-handoff-start',
    'dotquilt-handoff-cancel',
  ]);
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => {
    window.m4Text.update({ state: 'ready', timing: { duration: 100 } });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
});
test('fixed-progress captures retain outgoing dots and overlap the incoming text', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  await page.goto('/text');
  await page.clock.runFor(32);
  for (const [idle, handoff, value] of [
    ['scramble', 'lock', '42.50'],
    ['scramble', 'printText', 'Loading'],
    ['labelPulse', 'lock', 'Loading'],
    ['labelPulse', 'printText', '42.50'],
  ] as const) {
    await page.evaluate(
      ({ idle, handoff, value }) => {
        window.m4Text.text(value);
        window.m4Text.recipe(idle);
        window.m4Text.recipe(handoff);
        window.m4Text.update({
          mask: undefined,
          state: 'pending',
          cycle: idle + handoff,
        });
      },
      { idle, handoff, value },
    );
    await page.clock.runFor(120);
    // Freeze the compositor clock in the preparation turn. A separate
    // protocol round trip can arrive after completion on a busy browser.
    // Normal-speed coverage continues to use real animation clocks.
    await page.evaluate(() => {
      window.m4Text.update({ state: 'ready', timing: { duration: 500 } });
      queueMicrotask(() => {
        for (const animation of document
          .getElementById('text')
          ?.shadowRoot?.getAnimations() ?? [])
          if (animation.effect?.getTiming().duration === 500) animation.pause();
      });
    });
    for (const [index, delta] of [0, 125, 150, 125, 100].entries()) {
      await page.clock.runFor(delta);
      await page.evaluate(() => {
        const host = document.getElementById('text') as TextLoader;
        Reflect.get(host, 'frame').call(host);
        for (const animation of document
          .getElementById('text')
          ?.shadowRoot?.getAnimations() ?? [])
          if (animation.effect?.getTiming().duration === 1) {
            animation.pause();
            animation.currentTime = 1;
          }
      });
      await capture(page, {
        path: info.outputPath(`${idle}-${handoff}-${index}.png`),
        caret: 'initial',
      });
      if (index === 3) {
        expect(await page.locator(dots).count()).toBeGreaterThan(0);
        const opacity = await page
          .locator('#text')
          .evaluate(
            (host) =>
              getComputedStyle(host.shadowRoot?.querySelector('.c') as Element)
                .opacity,
          );
        expect(Number(opacity)).toBeGreaterThan(0);
      }
    }
    await page.clock.runFor(32);
    await expect(page.locator(dots)).toHaveCount(0);
  }
});
test('a text placeholder shares its outer region window and stops when the region settles', async ({
  page,
}) => {
  await page.goto('/text');
  await page.evaluate(() => {
    const outer = document.createElement('dotquilt-region');
    outer.id = 'outer';
    outer.update({ state: 'pending', timing: { duration: 0 } });
    const placeholder = document.createElement('div');
    placeholder.slot = 'placeholder';
    const text = document.getElementById('text') as TextLoader;
    placeholder.append(text);
    outer.append(placeholder, document.createTextNode('Ready account'));
    document.body.append(outer);
  });
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  expect(
    await page
      .locator('#text')
      .evaluate(
        (text) =>
          Reflect.get(text, 'activity') ===
          Reflect.get(
            document.getElementById('outer') as HTMLElement,
            'activity',
          ),
      ),
  ).toBe(true);
  await page.evaluate(() =>
    document.querySelector('dotquilt-region')?.update({ state: 'ready' }),
  );
  await expect(page.locator('#text')).not.toHaveAttribute('data-moving', '');
  await expect(page.locator(dots)).toHaveCount(0);
  await page.evaluate(() =>
    document
      .querySelector('dotquilt-region')
      ?.update({ state: 'pending', cycle: 'next' }),
  );
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
});
test('pointer lift is opt-in, removed on pause and absent for touch', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    const host = document.getElementById('text') as TextLoader;
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 40,
        clientY: 40,
        pointerType: 'mouse',
      }),
    );
  });
  expect(
    await page
      .locator('#text')
      .evaluate((host) => Reflect.get(host, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
  await page.evaluate(() => window.m4Text.update({ pointerResponse: 'lift' }));
  await page.locator('#text').hover();
  await expect
    .poll(() =>
      page
        .locator('#text')
        .evaluate(
          (host) => !!Reflect.get(host, Symbol.for('dotquilt.pointer.v1')),
        ),
    )
    .toBe(true);
  await page.evaluate(() => window.m4Text.update({ motion: 'paused' }));
  await expect(page.locator('#text')).not.toHaveAttribute('data-moving', '');
  expect(
    await page
      .locator('#text')
      .evaluate((host) => Reflect.get(host, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
  await page.evaluate(() => {
    window.m4Text.update({ motion: 'system' });
  });
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    document.getElementById('text')?.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 40,
        clientY: 40,
        pointerType: 'touch',
      }),
    );
  });
  expect(
    await page
      .locator('#text')
      .evaluate((host) => Reflect.get(host, Symbol.for('dotquilt.pointer.v1'))),
  ).toBeUndefined();
});
test('forced colors and document dot pressure choose a static fallback', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await expect(page.locator('#text')).not.toHaveAttribute('data-moving', '');
  await expect(page.locator(dots)).toHaveCount(0);
  await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => {
    Reflect.set(document, Symbol.for('dotquilt.v1.dot-ledger'), {
      dots: 16384,
      users: 1,
    });
    window.m4Text.update({
      state: 'pending',
      cycle: 'pressure',
      mask: '0000000',
    });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await expect(page.locator(dots)).toHaveCount(0);
  expect(await page.evaluate(() => window.m4Text.surface().input.precise)).toBe(
    false,
  );
  await page.evaluate(() => {
    window.m4Text.update({ state: 'ready' });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toEqual({ dots: 16384, users: 1 });
});
test('text glyph measurement is cached between frames and refreshStyles invalidates it', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    Reflect.set(window, 'rangeReads', 0);
    const original = Range.prototype.getBoundingClientRect;
    Range.prototype.getBoundingClientRect = function () {
      Reflect.set(window, 'rangeReads', Reflect.get(window, 'rangeReads') + 1);
      return original.call(this);
    };
  });
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => Reflect.get(window, 'rangeReads'))).toBe(0);
  await page.evaluate(() => {
    window.m4Text.refreshStyles();
  });
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'rangeReads')))
    .toBeGreaterThan(0);
});
for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  test(`TextLoader preserves content and completes its default handoff under ${mode}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`/text?mode=${mode}`);
    await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
    expect(
      await page.evaluate(() => window.m4Text.surface().input.precise),
    ).toBe(true);
    expect(await page.locator(dots).count()).toBeGreaterThan(100);
    expect(await page.locator('#text').ariaSnapshot()).not.toContain('128,450');
    await page.evaluate(() =>
      window.m4Text.update({ state: 'ready', timing: { duration: 900 } }),
    );
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(await page.evaluate(() => window.m4Text.events[0]?.animation)).toBe(
      'dotquilt/text/morph-wipe',
    );
    if (mode === 'inline')
      await capture(page, {
        path: info.outputPath('text-handoff.png'),
        caret: 'initial',
      });
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(page.locator(dots)).toHaveCount(0);
    expect(await page.locator('#text').ariaSnapshot()).toContain('128,450');
    expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
    expect(
      await page.evaluate(() =>
        window.m4Text.events.map((event) => event.type),
      ),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    expect(await page.evaluate(() => window.m4Text.errors)).toEqual([]);
    expect(await page.evaluate(() => window.m4Text.violations)).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      ),
    ).toBeUndefined();
  });
  test(`TextLoader React hydration and StrictMode retain the original text under ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/text-react?mode=${mode}`);
    await expect
      .poll(() => page.evaluate(() => window.m4TextReact?.ref()))
      .toBe('dotquilt-text-loader');
    await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
    await page.evaluate(() => window.m4TextReact.change('ready'));
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.m4TextReact.identity())).toBe(true);
    expect(await page.evaluate(() => window.m4TextReact.errors)).toEqual([]);
    expect(await page.evaluate(() => window.m4TextReact.events)).toEqual([
      'start',
      'end',
    ]);
    await page.evaluate(() => window.m4TextReact.change('pending'));
    await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
    await page.evaluate(() => window.m4TextReact.unmount());
    expect(
      await page.evaluate(() =>
        Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      ),
    ).toBeUndefined();
  });
}
test('idle variants, preset precedence and custom typed surface use one owned clock', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  const before = await page.locator(dots).first().getAttribute('opacity');
  await page.evaluate(() => {
    window.m4Text.preset();
    window.m4Text.recipe('labelPulse', { travelPxPerSecond: 140 });
  });
  await expect
    .poll(() => page.locator(dots).first().getAttribute('opacity'))
    .not.toBe(before);
  await page.evaluate(() => window.m4Text.custom());
  await expect
    .poll(() => page.evaluate(() => window.m4Text.frames()))
    .toBeGreaterThan(2);
  expect(await page.locator(dots).count()).toBe(8);
  expect(
    await page.evaluate(() =>
      window.m4Text
        .surface()
        .input.mask.map((cell) => cell.character)
        .join(''),
    ),
  ).toBe('$000,000');
  await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Text.events[0]?.animation)).toBe(
    'dotquilt/print-text',
  );
});
test('refresh keeps content visible, stale cycles cancel once and geometry settles latest', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4Text.update({ state: 'refreshing' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'refreshing',
  );
  expect(await page.locator('#text').ariaSnapshot()).toContain('128,450');
  await expect(page.locator(dots)).toHaveCount(0);
  await page.evaluate(() =>
    window.m4Text.update({ state: 'pending', cycle: 'new' }),
  );
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() =>
    window.m4Text.update({ state: 'ready', timing: { duration: 1500 } }),
  );
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() =>
    window.m4Text.update({ state: 'pending', cycle: 'superseded' }),
  );
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  expect(
    await page.evaluate(
      () =>
        window.m4Text.events.filter((e) => e.type === 'dotquilt-handoff-cancel')
          .length,
    ),
  ).toBe(1);
  await page.evaluate(() =>
    window.m4Text.update({ state: 'ready', timing: { duration: 1500 } }),
  );
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => window.m4Text.text('$999,000'));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(dots)).toHaveCount(0);
  expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
});
test('complex, long, RTL, empty and zero values preserve meaning with safe fallback', async ({
  page,
}) => {
  await page.goto('/text');
  for (const text of [
    '0',
    '',
    'Հայերեն',
    'مرحبا',
    'A'.repeat(300),
    'line\nline',
  ]) {
    await page.evaluate((text) => {
      window.m4Text.text(text);
      window.m4Text.update({ mask: undefined, state: 'pending', cycle: text });
    }, text);
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'pending',
    );
    await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
    await expect(page.locator('#text')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(
      page.locator('#text > [data-dotquilt-text-content]'),
    ).toHaveText(text);
    expect(await page.evaluate(() => window.m4Text.identity())).toBe(true);
  }
  await page.evaluate(() => {
    const host = document.getElementById('text') as TextLoader;
    const button = document.createElement('button');
    button.textContent = 'Keep action';
    host.querySelector('[data-dotquilt-text-content]')?.append(button);
    host.update({ state: 'pending', cycle: 'rich' });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  expect(await page.evaluate(() => window.m4Text.surface().input.precise)).toBe(
    false,
  );
  await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.getByRole('button', { name: 'Keep action' }).focus();
  await page.evaluate(() =>
    window.m4Text.update({ state: 'pending', cycle: 'focused' }),
  );
  await expect(page.locator('#text')).toBeFocused();
});
test('pause, reduced motion, four-second window and throwing custom handoff cleanly settle', async ({
  page,
}) => {
  await page.goto('/text');
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await expect(page.locator('#text')).not.toHaveAttribute('data-moving', '', {
    timeout: 6000,
  });
  await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() =>
    window.m4Text.update({ state: 'pending', cycle: 'reduced' }),
  );
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await expect(page.locator('#text')).not.toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator(dots)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() =>
    window.m4Text.update({ state: 'pending', cycle: 'broken' }),
  );
  await expect(page.locator('#text')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => {
    window.m4Text.broken();
    window.m4Text.update({ state: 'ready' });
  });
  await expect(page.locator('#text')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.m4Text.errors)).toContain(
    'animation-failed',
  );
  await expect(page.locator(dots)).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    ),
  ).toBeUndefined();
});
test('static no-JavaScript markup reserves the mask and hides pending application text', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4194/text?mode=external&enhance=0');
    await expect(
      page.locator('#text > [data-dotquilt-text-content]'),
    ).toBeHidden();
    expect(await page.locator('#text').ariaSnapshot()).not.toContain('128,450');
    expect((await page.locator('#text').boundingBox())?.width).toBeGreaterThan(
      100,
    );
  } finally {
    await context.close();
  }
});
test('normal-speed rich variants complete and release all owned resources', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4194',
    reducedMotion: 'no-preference',
    recordVideo: { dir: info.outputDir, size: { width: 640, height: 480 } },
    viewport: { width: 640, height: 480 },
  });
  const page = await context.newPage();
  try {
    await page.goto('/text');
    for (const [idle, handoff] of [
      ['scramble', 'lock'],
      ['scramble', 'printText'],
      ['labelPulse', 'lock'],
      ['labelPulse', 'printText'],
    ] as const) {
      for (const value of ['42.50', 'Loading', 'مرحبا 👋🏽']) {
        await page.evaluate(
          ({ idle, handoff, value }) => {
            window.m4Text.text(value);
            window.m4Text.recipe(idle);
            window.m4Text.recipe(handoff);
            window.m4Text.update({
              state: 'pending',
              cycle: handoff + value,
              mask: undefined,
            });
          },
          { idle, handoff, value },
        );
        await expect(page.locator('#text')).toHaveAttribute(
          'data-presentation',
          'pending',
        );
        expect(
          await page.evaluate(() => window.m4Text.surface().input.precise),
        ).toBe(value !== 'مرحبا 👋🏽');
        await page.waitForTimeout(420);
        await page.evaluate(() => window.m4Text.update({ state: 'ready' }));
        await expect(page.locator('#text')).toHaveAttribute(
          'data-presentation',
          'handoff',
        );
        await expect(page.locator('#text')).toHaveAttribute(
          'data-presentation',
          'ready',
        );
        await expect(page.locator(dots)).toHaveCount(0);
        await expect(
          page.locator('#text > [data-dotquilt-text-content]'),
        ).toHaveText(value);
      }
    }
    // Text outside the character effect reports its fallback again after
    // plain text came in between (AUDIT.md decision 10): once per round here.
    expect(await page.evaluate(() => window.m4Text.errors)).toEqual(
      Array(4).fill('generic-text-fallback'),
    );
  } finally {
    await context.close();
  }
});
