import { expect, type Page, test } from '@playwright/test';

// Regression tests for specific runtime bugs found in the November 2026 audit.

async function open(page: Page, query: string) {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
}
const pointerKey = 'dotquilt.pointer.v1';

test('state = undefined restores the default (ready), not a disabled state', async ({
  page,
}) => {
  await open(page, 'component=region');
  const result = await page.evaluate(async () => {
    const region = window.e2e.owner as HTMLElement & {
      state: string | undefined;
    };
    const codes: string[] = [];
    region.addEventListener('dotquilt-error', (event) =>
      codes.push((event as CustomEvent<{ code: string }>).detail.code),
    );
    region.state = undefined;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      attribute: region.getAttribute('state'),
      state: region.state,
      disabled: region.hasAttribute('data-dotquilt-disabled'),
      codes,
    };
  });
  expect(result).toEqual({
    attribute: null,
    state: 'ready',
    disabled: false,
    codes: [],
  });
});

for (const kind of ['chart-loader', 'table-loader', 'text-loader'] as const)
  test(`${kind}: a touch move clears the lifted pointer position (#35)`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, `component=${kind}`);
    const retained = await page.evaluate(async (key) => {
      const host = window.e2e.decoration as HTMLElement & {
        pointerResponse: string;
      };
      host.pointerResponse = 'lift';
      await new Promise((resolve) => setTimeout(resolve, 100));
      const box = host.getBoundingClientRect();
      const move = (pointerType: string) =>
        host.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType,
            clientX: box.x + 20,
            clientY: box.y + 20,
            bubbles: true,
            composed: true,
          }),
        );
      move('mouse');
      const afterMouse = Reflect.get(host, Symbol.for(key)) !== undefined;
      move('touch');
      const afterTouch = Reflect.get(host, Symbol.for(key)) !== undefined;
      return { afterMouse, afterTouch };
    }, pointerKey);
    expect(retained).toEqual({ afterMouse: true, afterTouch: false });
  });

test('a zero-size TableLoader ignores pointer moves instead of storing NaN', async ({
  page,
}) => {
  await open(page, 'component=table-loader');
  const stored = await page.evaluate(async (key) => {
    const table = window.e2e.decoration as HTMLElement & {
      pointerResponse: string;
    };
    table.pointerResponse = 'lift';
    await new Promise((resolve) => setTimeout(resolve, 100));
    table.style.width = '0px';
    const painter = table.shadowRoot?.querySelector(
      'svg[data-dotquilt-painter]',
    ) as SVGElement | null;
    if (painter) painter.style.width = '0px';
    table.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: 10,
        clientY: 10,
        bubbles: true,
        composed: true,
      }),
    );
    return Reflect.get(table, Symbol.for(key)) as
      | { x: number; y: number }
      | undefined;
  }, pointerKey);
  if (stored) {
    expect(Number.isFinite(stored.x)).toBe(true);
    expect(Number.isFinite(stored.y)).toBe(true);
  }
});

test('switching the chart idle animation switches its renderer', async ({
  page,
}) => {
  await open(page, 'component=chart-loader');
  const renderers = await page.evaluate(async () => {
    const chart = window.e2e.decoration as HTMLElement & {
      animations: unknown;
    };
    const { bars, ridge } = (
      window as unknown as {
        e2eAnimations: { chart: { bars: () => unknown; ridge: () => unknown } };
      }
    ).e2eAnimations.chart;
    const frames = (count: number) =>
      new Promise<void>((resolve) => {
        const step = () => (--count ? requestAnimationFrame(step) : resolve());
        requestAnimationFrame(step);
      });
    const kind = () =>
      chart.shadowRoot?.querySelector('canvas') ? 'canvas' : 'svg';
    chart.animations = { idle: bars() };
    await frames(5);
    const first = kind();
    chart.animations = { idle: ridge() };
    await frames(5);
    return [first, kind()];
  });
  expect(renderers).toEqual(['svg', 'canvas']);
});

test('content updates during a simple reveal do not cut the reveal short', async ({
  page,
}) => {
  await open(page, 'component=region');
  const ended = await page.evaluate(async () => {
    const region = window.e2e.owner;
    const done = new Promise<string>((resolve) =>
      region.addEventListener(
        'dotquilt-handoff-end',
        (event) =>
          resolve((event as CustomEvent<{ reason: string }>).detail.reason),
        { once: true },
      ),
    );
    region.addEventListener(
      'dotquilt-handoff-start',
      () => {
        // A framework's follow-up render updating text right after `ready`.
        const paragraph = window.e2e.content.querySelector('p');
        if (paragraph) paragraph.textContent = 'Revenue grew 14% this quarter.';
      },
      { once: true },
    );
    region.state = 'ready';
    return done;
  });
  expect(ended).toBe('complete');
});

// The dot geometry is measured from the host's content box, so the painter
// must cover exactly that box; otherwise padding shifts every dot.
for (const kind of ['chart-loader', 'table-loader'] as const)
  test(`${kind}: the painter covers the content box when the host has padding and a border`, async ({
    page,
  }) => {
    await open(page, `component=${kind}`);
    const { content, painter } = await page.evaluate(async (kind) => {
      const host = document.createElement(`dotquilt-${kind}`);
      host.style.cssText =
        // Taller than the table's rows, so the frame has to fill the box.
        'display:block;box-sizing:border-box;width:400px;height:260px;padding:15px;border:5px solid';
      document.getElementById('stage')?.append(host);
      let drawn: Element | null | undefined;
      for (let i = 0; i < 120 && !drawn; i++) {
        await new Promise(requestAnimationFrame);
        drawn = host.shadowRoot?.querySelector('[data-dotquilt-painter]');
      }
      const box = (r: DOMRect) => [r.left, r.top, r.width, r.height];
      const r = host.getBoundingClientRect();
      return {
        content: [r.left + 20, r.top + 20, r.width - 40, r.height - 40],
        painter: drawn ? box(drawn.getBoundingClientRect()) : null,
      };
    }, kind);
    expect(painter).not.toBeNull();
    painter?.forEach((value, i) => {
      expect(value).toBeCloseTo(content[i] as number, 0);
    });
  });

// Both table idles draw while pending, keep the content out of reach, and
// release their drawing when the region becomes ready.
for (const idle of ['typeOn', 'tableShimmer'] as const)
  test(`table-loader: the ${idle} idle draws while pending and is released when ready`, async ({
    page,
  }) => {
    await open(page, 'component=table-loader');
    await page.evaluate((idle) => {
      const animations = Reflect.get(window, 'e2eAnimations').table;
      (
        window.e2e.decoration as HTMLElement & { animations: object }
      ).animations = { idle: animations[idle]() };
    }, idle);
    const painted = () =>
      page.evaluate(
        () =>
          !!window.e2e.decoration.shadowRoot?.querySelector(
            '[data-dotquilt-painter]',
          ),
      );
    await expect.poll(painted).toBe(true);
    expect(
      await page.evaluate(
        () =>
          window.e2e.content.closest('[inert]') !== null ||
          window.e2e.owner.shadowRoot
            ?.querySelector('[part=content]')
            ?.hasAttribute('inert'),
      ),
    ).toBe(true);
    await page.evaluate(() => {
      window.e2e.owner.state = 'ready';
    });
    await expect(
      page.locator('#stage dotquilt-region').first(),
    ).toHaveAttribute('data-presentation', 'ready');
    await expect.poll(painted).toBe(false);
    expect(
      await page.evaluate(() => window.e2e.events.map((e) => e.type)),
    ).not.toContain('dotquilt-error');
  });

// The pointer lift must land where the pointer is over the content, whether
// the host is plain, padded and bordered, or transformed.
for (const kind of ['chart-loader', 'table-loader'] as const)
  for (const profile of ['plain', 'padded', 'scaled'] as const)
    test(`${kind} ${profile}: the pointer lift follows the pointer over the content`, async ({
      page,
    }) => {
      await open(page, `component=${kind}`);
      const target = await page.evaluate(
        async ({ kind, profile }) => {
          const host = document.createElement(
            `dotquilt-${kind}`,
          ) as HTMLElement & {
            pointerResponse: string;
          };
          host.id = 'probe';
          const edge = profile === 'plain' ? 0 : 20;
          host.style.cssText = `display:block;position:absolute;left:40px;top:40px;box-sizing:border-box;width:360px;height:200px;${profile === 'plain' ? '' : 'border:5px solid;padding:15px;'}${profile === 'scaled' ? 'transform:scale(.75,1.25);transform-origin:top left;' : ''}`;
          host.pointerResponse = 'lift';
          document.body.append(host);
          for (let i = 0; i < 120 && !host.hasAttribute('data-moving'); i++)
            await new Promise(requestAnimationFrame);
          const surface = Reflect.get(
            host,
            Symbol.for('dotquilt.surface.v1'),
          ).call(host, kind === 'chart-loader' ? 'chart' : 'table');
          const r = host.getBoundingClientRect();
          const sx = r.width / 360,
            sy = r.height / 200;
          return {
            x: r.left + (edge + 0.25 * surface.width) * sx,
            y: r.top + (edge + 0.4 * surface.height) * sy,
            width: surface.width,
            height: surface.height,
          };
        },
        { kind, profile },
      );
      await page.mouse.move(target.x, target.y);
      const pointer = () =>
        page.evaluate(
          (key) =>
            Reflect.get(
              document.getElementById('probe') as object,
              Symbol.for(key),
            ),
          pointerKey,
        );
      await expect
        .poll(async () => (await pointer())?.x ?? -1)
        .toBeCloseTo(target.width * 0.25, 0);
      expect((await pointer())?.y).toBeCloseTo(target.height * 0.4, 0);
      await page.mouse.move(900, 700);
      await expect.poll(pointer).toBeUndefined();
    });

/** The alpha of the first colour a surface paints its marks with. */
function markAlpha(surface: Element) {
  const style = getComputedStyle(surface);
  const source =
    style.backgroundImage !== 'none'
      ? style.backgroundImage
      : style.backgroundColor;
  const color = /rgba?\(([^)]+)\)/.exec(source)?.[1]?.split(',') ?? [];
  return color.length === 4 ? Number(color[3]) : color.length === 3 ? 1 : 0;
}

for (const mark of ['dot', 'square'] as const)
  test(`text-loader: text outside its glyph set still shows a visible placeholder (${mark})`, async ({
    page,
  }) => {
    // The character effect covers printable ASCII; anything else falls back
    // to a plain field of marks, which used to be drawn in a transparent colour.
    await open(
      page,
      `component=text-loader&text=${encodeURIComponent('Ñandú 12,00 €')}&mark=${mark}`,
    );
    const result = await page.evaluate(`(() => {
      const markAlpha = ${markAlpha.toString()};
      const loader = window.e2e.decoration;
      const mask = loader.shadowRoot.querySelector('.mask');
      const style = getComputedStyle(mask);
      return {
        glyphs: loader.hasAttribute('data-dotquilt-glyphs'),
        visible: style.visibility === 'visible' && Number(style.opacity) > 0,
        alpha: markAlpha(mask),
      };
    })()`);
    expect(result).toMatchObject({ glyphs: false, visible: true });
    expect((result as { alpha: number }).alpha).toBeGreaterThan(0);
  });

// AUDIT.md decision 10: a configuration error reports again only after the
// field held a valid value in between; a failure while loading reports once
// per loading cycle. Before, each problem reported once per element, ever.
async function errorCodes(page: Page) {
  return page.evaluate(() => Reflect.get(window, 'errorCodes') as string[]);
}
async function collectErrors(page: Page) {
  await page.evaluate(() => {
    const codes: string[] = [];
    Reflect.set(window, 'errorCodes', codes);
    document.addEventListener(
      'dotquilt-error',
      (event) => {
        const { code, field } = (
          event as CustomEvent<{ code: string; field: string }>
        ).detail;
        codes.push(`${code}:${field}`);
      },
      true,
    );
  });
}

test('an invalid attribute reports again after a valid value in between', async ({
  page,
}) => {
  await open(page, 'component=chart-loader');
  await collectErrors(page);
  await page.evaluate(async () => {
    const chart = window.e2e.decoration;
    const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
    chart.setAttribute('speed', 'fast');
    await settle();
    // Still invalid: the same problem, not reported twice.
    chart.setAttribute('speed', 'faster');
    await settle();
    chart.setAttribute('speed', '2');
    await settle();
    chart.setAttribute('speed', 'fast');
    await settle();
  });
  expect(await errorCodes(page)).toEqual([
    'invalid-option:speed',
    'invalid-option:speed',
  ]);
});

test('an invalid property reports again after a valid value in between', async ({
  page,
}) => {
  await open(page, 'component=skeleton-block');
  await collectErrors(page);
  await page.evaluate(() => {
    const host = window.e2e.decoration as HTMLElement & {
      animations: unknown;
    };
    host.animations = { idle: 'not a binding' };
    host.animations = { idle: 'still not one' };
    host.animations = {};
    host.animations = { idle: 'not a binding' };
  });
  expect(await errorCodes(page)).toEqual([
    'invalid-binding:animations',
    'invalid-binding:animations',
  ]);
});

test('a failed handoff reports once per loading cycle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, 'component=region');
  await collectErrors(page);
  await page.evaluate(async () => {
    const { defineAnimation } = Reflect.get(window, 'e2eAnimations');
    const failing = defineAnimation({
      contractVersion: 1,
      id: 'e2e/failing-handoff',
      family: 'region',
      phase: 'handoff',
      options: { parse: () => ({}) },
      duration: () => 400,
      prepare: () => {
        throw new Error('broken handoff');
      },
      frame: () => undefined,
    });
    const region = window.e2e.owner as HTMLElement & {
      update(patch: object): void;
    };
    region.update({ animations: { handoff: failing() } });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 120));
    for (const cycle of ['first', 'second']) {
      region.update({ state: 'pending', cycle });
      await settle();
      region.update({ state: 'ready' });
      await settle();
    }
  });
  expect(await errorCodes(page)).toEqual([
    'animation-failed:animations',
    'animation-failed:animations',
  ]);
});

// A web font finishing loading anywhere on the page used to end a handoff in
// flight at once ("geometry-changed"), even when nothing moved. Pages often
// load fonts while their data arrives, so reveals were cut short.
for (const kind of ['text-loader', 'table-loader'] as const)
  test(`${kind}: a font finishing loading does not cut the handoff short`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, `component=${kind}`);
    const reason = await page.evaluate(async () => {
      const owner = window.e2e.owner as HTMLElement & {
        update(patch: object): void;
      };
      const ended = new Promise<string>((resolve) =>
        owner.addEventListener(
          'dotquilt-handoff-end',
          (event) =>
            resolve((event as CustomEvent<{ reason: string }>).detail.reason),
          { once: true },
        ),
      );
      owner.update({ state: 'ready' });
      await new Promise((resolve) => setTimeout(resolve, 150));
      document.fonts.dispatchEvent(new Event('loadingdone'));
      return ended;
    });
    expect(reason).toBe('complete');
  });

// Anti-flicker timing: `delay` keeps a placeholder hidden for a moment, so a
// fast response shows no placeholder and no handoff; `min-display` keeps a
// placeholder that did show on screen long enough to read as intended.
test('delay hides the placeholder until it passes, and a fast response skips it', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, 'component=region');
  const result = await page.evaluate(async () => {
    const region = window.e2e.owner as HTMLElement & {
      update(patch: object): void;
    };
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const placeholderVisible = () =>
      getComputedStyle(region.shadowRoot?.querySelector('.p') as Element)
        .visibility !== 'hidden';
    region.update({ state: 'ready', timing: { duration: 0 } });
    await wait(50);
    region.update({ delay: 300, timing: undefined });
    const starts: number[] = [];
    region.addEventListener('dotquilt-handoff-start', () =>
      starts.push(performance.now()),
    );
    region.update({ state: 'pending', cycle: 'slow' });
    await wait(60);
    const during = {
      waiting: region.hasAttribute('data-dotquilt-waiting'),
      visible: placeholderVisible(),
    };
    await wait(320);
    const after = {
      waiting: region.hasAttribute('data-dotquilt-waiting'),
      visible: placeholderVisible(),
    };
    // A response inside the delay: no placeholder and no handoff.
    region.update({ state: 'ready', timing: { duration: 0 } });
    await wait(50);
    starts.length = 0;
    region.update({ state: 'pending', cycle: 'fast', timing: undefined });
    await wait(80);
    region.update({ state: 'ready' });
    await wait(100);
    return {
      during,
      after,
      fast: {
        starts: starts.length,
        presentation: region.getAttribute('data-presentation'),
        waiting: region.hasAttribute('data-dotquilt-waiting'),
      },
    };
  });
  expect(result).toEqual({
    during: { waiting: true, visible: false },
    after: { waiting: false, visible: true },
    fast: { starts: 0, presentation: 'ready', waiting: false },
  });
});

test('min-display keeps a placeholder that showed on screen for at least that long', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, 'component=region');
  const result = await page.evaluate(async () => {
    const region = window.e2e.owner as HTMLElement & {
      update(patch: object): void;
    };
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    region.update({ state: 'ready', timing: { duration: 0 } });
    await wait(50);
    region.update({ minDisplay: 600, timing: undefined });
    let started = 0;
    region.addEventListener('dotquilt-handoff-start', () => {
      started = performance.now();
    });
    const shown = performance.now();
    region.update({ state: 'pending', cycle: 'held' });
    await wait(100);
    region.update({ state: 'ready' });
    await wait(150);
    const held = region.getAttribute('data-presentation');
    await wait(500);
    return { held, after: Math.round(started - shown) };
  });
  expect(result.held).toBe('pending');
  expect(result.after).toBeGreaterThanOrEqual(580);
});

test('delay never hides a placeholder already on the page, only new ones', async ({
  page,
}) => {
  await open(page, 'component=region');
  const result = await page.evaluate(() => {
    // Markup inserted as HTML is upgraded in place, as server markup is.
    const holder = document.createElement('div');
    document.body.append(holder);
    holder.innerHTML =
      '<dotquilt-region state="pending" delay="400" aria-label="From markup"><dotquilt-skeleton-line slot="placeholder"></dotquilt-skeleton-line></dotquilt-region>';
    // A loader created by script (as a client-rendered app does).
    const created = document.createElement('dotquilt-region');
    created.setAttribute('delay', '400');
    created.setAttribute('state', 'pending');
    created.setAttribute('aria-label', 'Created');
    holder.append(created);
    return new Promise<[boolean, boolean]>((resolve) =>
      requestAnimationFrame(() =>
        resolve([
          holder.firstElementChild?.hasAttribute('data-dotquilt-waiting') ??
            false,
          created.hasAttribute('data-dotquilt-waiting'),
        ]),
      ),
    );
  });
  expect(result).toEqual([false, true]);
});

// With pointer-response="lift", a skeleton's marks light up around the
// pointer. The redesign left it brightening only the drifting glow band
// (nearly invisible) and only during the first seconds of idle motion.
for (const kind of ['skeleton-block', 'skeleton-text'] as const)
  test(`${kind}: pointer lift lights the marks around the pointer`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, `component=${kind}`);
    const host = page.locator(`dotquilt-${kind}`).first();
    await host.evaluate((element) =>
      element.setAttribute('pointer-response', 'lift'),
    );
    const box = await host.boundingBox();
    if (!box) throw new Error('no box');
    const glow = () =>
      host.evaluate((element) => {
        const layer = element.shadowRoot?.querySelector<HTMLElement>('.lift');
        if (!layer) return null;
        const style = getComputedStyle(layer);
        return {
          opacity: Number(style.opacity),
          x: style.getPropertyValue('--dotquilt-pointer-x'),
        };
      });
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await expect
      .poll(async () => (await glow())?.opacity ?? 0)
      .toBeGreaterThan(0.5);
    expect((await glow())?.x).toBe('40px');
    await page.mouse.move(box.x + box.width + 50, box.y + box.height + 50);
    await expect.poll(async () => (await glow())?.opacity).toBe(0);
    // Without lift, the pointer changes nothing.
    await host.evaluate((element) =>
      element.removeAttribute('pointer-response'),
    );
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await page.waitForTimeout(400);
    expect((await glow())?.opacity).toBe(0);
  });
