import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/m2/catalog?profile=individual&family=table');
  await page.waitForFunction(() => !!window.catalogFixture);
});

test('formatting is shared across equal attributes without changing SVG values', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const errors: string[] = [];
    const painter = createPainter(host, (code: string) => errors.push(code));
    const original = window.String;
    let conversions = 0;
    window.String = new Proxy(original, {
      apply(target, receiver, args) {
        if (typeof args[0] === 'number') conversions++;
        return Reflect.apply(target, receiver, args);
      },
    });
    try {
      for (const offset of [0, 1.25])
        painter.draw((dot: (value: object) => void) => {
          for (let row = 0; row < 7; row++)
            for (let col = 0; col < 5; col++)
              dot({
                x: col * 9.125,
                y: row * 7.125 + offset,
                size: 2,
                opacity: 0.5,
                tone: 'base',
              });
        });
    } finally {
      window.String = original;
    }
    const actual = [...(host.shadowRoot?.querySelectorAll('circle') ?? [])].map(
      (circle) =>
        ['cx', 'cy', 'r', 'opacity', 'fill'].map((name) =>
          circle.getAttribute(name),
        ),
    );
    const expected = Array.from({ length: 35 }, (_, i) => [
      String((i % 5) * 9.125),
      String(Math.floor(i / 5) * 7.125 + 1.25),
      '2',
      '0.5',
      'var(--dotquilt-color,currentColor)',
    ]);
    painter.dispose();
    host.remove();
    return { conversions, actual, expected, errors };
  });
  expect(result.conversions).toBe(51);
  expect(result.actual).toEqual(result.expected);
  expect(result.errors).toEqual([]);
});

test('formatting failure cannot poison later draws or another painter', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createPainter } = await import(
      String('/pkg/dist/internal/painter.js')
    );
    const make = () => {
      const host = document.createElement('div');
      host.attachShadow({ mode: 'open' });
      document.body.append(host);
      return { host, painter: createPainter(host, () => {}) };
    };
    const a = make(),
      b = make(),
      original = window.String;
    const value = {
      x: 1 / 3,
      y: Number.MIN_VALUE,
      size: 2,
      opacity: 0.5,
      tone: 'base',
    };
    let caught = false,
      thrown = false;
    window.String = new Proxy(original, {
      apply(target, receiver, args) {
        if (!thrown && args[0] === value.x) {
          thrown = true;
          throw Error('format');
        }
        return Reflect.apply(target, receiver, args);
      },
    });
    try {
      a.painter.draw((dot: (v: typeof value) => void) => dot(value));
    } catch {
      caught = true;
    } finally {
      window.String = original;
    }
    const values = [];
    for (const item of [a, b]) {
      item.painter.draw((dot: (v: typeof value) => void) => dot(value));
      const circle = item.host.shadowRoot?.querySelector('circle');
      if (!circle) throw Error('Missing circle');
      values.push(
        ['cx', 'cy', 'r', 'opacity', 'fill'].map((name) =>
          circle.getAttribute(name),
        ),
      );
      item.painter.dispose();
      item.host.remove();
    }
    return {
      caught,
      values,
      expected: [
        String(value.x),
        String(value.y),
        '2',
        '0.5',
        'var(--dotquilt-color,currentColor)',
      ],
      released: !Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
  });
  expect(result.caught).toBe(true);
  expect(result.values).toEqual([result.expected, result.expected]);
  expect(result.released).toBe(true);
});
