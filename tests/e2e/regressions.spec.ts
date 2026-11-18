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
    const { scan, ridge } = (
      window as unknown as {
        e2eAnimations: { chart: { scan: () => unknown; ridge: () => unknown } };
      }
    ).e2eAnimations.chart;
    const frames = (count: number) =>
      new Promise<void>((resolve) => {
        const step = () => (--count ? requestAnimationFrame(step) : resolve());
        requestAnimationFrame(step);
      });
    const kind = () =>
      chart.shadowRoot?.querySelector('canvas') ? 'canvas' : 'svg';
    chart.animations = { idle: scan() };
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
        'display:block;box-sizing:border-box;width:400px;height:200px;padding:15px;border:5px solid';
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
