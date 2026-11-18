import { expect, test } from '@playwright/test';
import type {} from '../m2/catalog-client';

test('same commands retain canonical geometry and changed commands update it', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const errors: string[] = [];
    const painter = createPainter(host, (code: string) => errors.push(code));
    const value = {
      x: 10,
      y: 20,
      size: 2,
      opacity: 0.5,
      tone: 'base' as const,
    };
    const draw = (value: {
      x: number;
      y: number;
      size: number;
      opacity: number;
      tone: 'base';
    }) => painter.draw((dot: (point: typeof value) => void) => dot(value));
    draw(value);
    const before = host.shadowRoot?.querySelector('svg')?.outerHTML;
    draw(value);
    const same = host.shadowRoot?.querySelector('svg')?.outerHTML === before;
    draw({ ...value, y: 25, opacity: 0.75 });
    const circle = host.shadowRoot?.querySelector('circle');
    const values = ['cx', 'cy', 'r', 'opacity', 'fill'].map((name) =>
      circle?.getAttribute(name),
    );
    painter.dispose();
    host.remove();
    return { same, values, errors };
  });
  expect(result).toEqual({
    same: true,
    values: ['10', '25', '2', '0.75', 'var(--dotquilt-color,currentColor)'],
    errors: [],
  });
});

test('growing shrinking and empty frames release exact dot reservations', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const errors: string[] = [];
    const painter = createPainter(host, (code: string) => errors.push(code));
    const key = Symbol.for('dotquilt.v1.dot-ledger');
    const states = [];
    for (const count of [3, 1, 5, 0]) {
      painter.draw(
        (
          dot: (value: {
            x: number;
            y: number;
            size: number;
            opacity: number;
          }) => void,
        ) => {
          for (let i = 0; i < count; i++)
            dot({ x: i, y: 2, size: 1, opacity: 0.5 });
        },
      );
      const ledger = Reflect.get(document, key) as {
        dots: number;
        users: number;
      };
      states.push({
        circles: host.shadowRoot?.querySelectorAll('circle').length,
        dots: ledger.dots,
        users: ledger.users,
      });
    }
    painter.dispose();
    painter.dispose();
    const released =
      !Reflect.has(document, key) && !host.hasAttribute('data-custom');
    host.remove();
    return { states, released, errors };
  });
  expect(result).toEqual({
    states: [3, 1, 5, 0].map((n) => ({ circles: n, dots: n, users: 1 })),
    released: true,
    errors: [],
  });
});

test('drawing preserves throwing-producer recovery, revoked writers and disposal', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const errors: string[] = [];
    const painter = createPainter(host, (code: string) => errors.push(code));
    const value = { x: 10, y: 20, size: 2, opacity: 0.5 };
    let late: ((v: typeof value) => void) | undefined;
    let caught = false;
    try {
      painter.draw((dot: typeof late) => {
        late = dot;
        dot?.(value);
        throw Error('producer failed');
      });
    } catch {
      caught = true;
    }
    const partial = host.shadowRoot?.querySelectorAll('circle').length;
    late?.({ ...value, x: 99 });
    const retainedX = host.shadowRoot
      ?.querySelector('circle')
      ?.getAttribute('cx');
    painter.draw((dot: (v: typeof value) => void) => {
      dot(value);
      dot({ ...value, x: 30 });
    });
    const recovered = [
      ...(host.shadowRoot?.querySelectorAll('circle') ?? []),
    ].map((c) => c.getAttribute('cx'));
    painter.draw((dot: (v: typeof value) => void) => {
      dot(value);
      painter.dispose();
      dot(value);
    });
    painter.dispose();
    late?.(value);
    const disposed =
      !host.hasAttribute('data-custom') &&
      host.shadowRoot?.childElementCount === 0;
    const ledgerReleased = !Reflect.has(
      document,
      Symbol.for('dotquilt.v1.dot-ledger'),
    );
    host.remove();
    return {
      caught,
      partial,
      retainedX,
      recovered,
      disposed,
      ledgerReleased,
      errors,
    };
  });
  expect(result).toEqual({
    caught: true,
    partial: 1,
    retainedX: '10',
    recovered: ['10', '30'],
    disposed: true,
    ledgerReleased: true,
    errors: [],
  });
});

test('retained attributes preserve pointer lift, finite validation and output clamps', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    const { createPainter, pointer } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    Reflect.set(host, pointer, { x: 10, y: 20 });
    const errors: string[] = [];
    const painter = createPainter(host, (code: string) => errors.push(code));
    const values = [
      { x: 10, y: 20, size: 100, opacity: 2, tone: 'accent' },
      { x: 30.125, y: 20.375, size: -1, opacity: -2, tone: 'base' },
      { x: 10, y: 20, size: 2, opacity: 0.5, tone: 'accent' },
    ];
    const expected = values.map(({ x, y, size, opacity, tone }) => {
      const lift = Math.max(0, 1 - Math.hypot(x - 10, y - 20) / 40);
      return [
        String(x),
        String(y - lift * 2),
        String(Math.max(0, Math.min(32, size * (1 + lift * 0.2)))),
        String(Math.max(0, Math.min(1, Math.min(1, opacity + lift * 0.3)))),
        `var(--dotquilt-${tone === 'accent' ? 'accent-' : ''}color,currentColor)`,
      ];
    });
    const draw = (dot: (value: (typeof values)[number]) => void) => {
      values.forEach(dot);
      dot({ x: NaN, y: 0, size: 1, opacity: 1, tone: 'base' });
    };
    painter.draw(draw);
    painter.draw(draw);
    const actual = [...(host.shadowRoot?.querySelectorAll('circle') ?? [])].map(
      (c) => ['cx', 'cy', 'r', 'opacity', 'fill'].map((n) => c.getAttribute(n)),
    );
    painter.dispose();
    host.remove();
    return { actual, expected, errors };
  });
  expect(result.actual).toEqual(result.expected);
  expect(result.errors).toEqual(['invalid-dot', 'invalid-dot']);
});

// This is an optimization observation, not a replacement for whole-render targets.
test('identical bounded output avoids redundant SVG writes without changing committed values', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const painter = createPainter(host, () => {}),
      value = { x: 10, y: 20, size: 2, opacity: 0.5, tone: 'base' };
    const draw = (v: typeof value) =>
      painter.draw((dot: (v: typeof value) => void) => dot(v));
    draw(value);
    const svg = host.shadowRoot?.querySelector('svg'),
      before = svg?.outerHTML;
    const observer = new MutationObserver(() => {});
    if (!svg) throw Error('Missing painter output');
    observer.observe(svg, { attributes: true, subtree: true });
    draw(value);
    const unchangedWrites = observer.takeRecords().length,
      same = svg?.outerHTML === before;
    draw({ ...value, y: 21 });
    const changed = observer.takeRecords().map((r) => r.attributeName);
    const y = svg?.querySelector('circle')?.getAttribute('cy');
    observer.disconnect();
    painter.dispose();
    host.remove();
    return { unchangedWrites, same, changed, y };
  });
  expect(result).toEqual({
    unchangedWrites: 0,
    same: true,
    changed: ['cy'],
    y: '21',
  });
});
