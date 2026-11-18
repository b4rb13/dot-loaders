import { expect, type Page, test } from '@playwright/test';

// Every element reports a bad option the same way: `dotquilt-error` with code
// `invalid-option` and the property name as `field`, whether the value came
// from a property, update() or an attribute. update() only applies the
// element's own options and reports any other key as `unknown-option`.
const invalid: Record<string, Record<string, unknown>> = {
  'dotquilt-skeleton-block': {
    speed: 'fast',
    pointerResponse: 'wiggle',
    mark: 'star',
  },
  'dotquilt-skeleton-text': { speed: 0, lines: 2.5, mark: 'star' },
  'dotquilt-typing-dots': { speed: -1, count: 0, mark: 'star' },
  'dotquilt-text-loader': {
    speed: 'fast',
    pointerResponse: 'wiggle',
    state: 'loading',
    mark: 'star',
  },
  'dotquilt-chart-loader': {
    speed: 'fast',
    pointerResponse: 'wiggle',
    variant: 'pie',
    mark: 'star',
  },
  'dotquilt-table-loader': {
    speed: 'fast',
    pointerResponse: 'wiggle',
    rows: -1,
    rowHeight: 0,
    mark: 'star',
  },
  'dotquilt-region': { state: 'loading', motion: 'fast' },
};

/** Creates `tag`, runs `act` on it and returns the errors it reported. */
async function errorsOf(
  page: Page,
  tag: string,
  act: string,
  value: unknown,
): Promise<{ code: string; field: string }[]> {
  return page.evaluate(
    async ([tag, act, value]) => {
      const element = document.createElement(tag) as HTMLElement & {
        update(patch: object): void;
      };
      const errors: { code: string; field: string }[] = [];
      element.addEventListener('dotquilt-error', (event) =>
        errors.push((event as CustomEvent).detail),
      );
      document.getElementById('stage')?.append(element);
      if (act === 'update') element.update(value as object);
      else if (act === 'properties')
        for (const [key, v] of Object.entries(value as object))
          Reflect.set(element, key, v);
      else
        for (const [name, v] of Object.entries(value as object))
          element.setAttribute(name, String(v));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return errors;
    },
    [tag, act, value] as const,
  );
}

const sorted = (fields: string[]) =>
  [...fields].sort().map((field) => ({ code: 'invalid-option', field }));

test.beforeEach(async ({ page }) => {
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
});

for (const [tag, bad] of Object.entries(invalid))
  for (const act of ['properties', 'update'] as const)
    test(`${tag}: invalid values set through ${act} report invalid-option with the property name`, async ({
      page,
    }) => {
      const fields = Object.keys(bad);
      const errors = await errorsOf(page, tag, act, bad);
      expect(
        errors
          .filter((error) => fields.includes(error.field))
          .sort((a, b) => a.field.localeCompare(b.field)),
      ).toEqual(sorted(fields));
    });

test('attributes report the property name, not the attribute name', async ({
  page,
}) => {
  const errors = await errorsOf(page, 'dotquilt-table-loader', 'attributes', {
    'row-height': 0,
    'pointer-response': 'wiggle',
  });
  expect(errors.sort((a, b) => a.field.localeCompare(b.field))).toEqual(
    sorted(['pointerResponse', 'rowHeight']),
  );
});

for (const tag of Object.keys(invalid))
  test(`${tag}: update() ignores and reports keys that are not its options`, async ({
    page,
  }) => {
    const errors = await errorsOf(page, tag, 'update', { sped: 2 });
    expect(errors).toContainEqual({ code: 'unknown-option', field: 'sped' });
    expect(
      await page.evaluate(
        (tag) => Object.hasOwn(document.querySelector(tag) as object, 'sped'),
        tag,
      ),
    ).toBe(false);
  });

test('mark reflects dot, dash and square on every mark-drawing element; a region rejects it', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const tags = [
      'dotquilt-skeleton-block',
      'dotquilt-skeleton-line',
      'dotquilt-skeleton-circle',
      'dotquilt-skeleton-text',
      'dotquilt-typing-dots',
      'dotquilt-text-loader',
      'dotquilt-chart-loader',
      'dotquilt-table-loader',
    ];
    const marks = tags.map((tag) => {
      const element = document.createElement(tag) as HTMLElement & {
        mark: string;
        update(patch: object): void;
      };
      document.getElementById('stage')?.append(element);
      const seen = [element.mark];
      element.mark = 'dash';
      seen.push(element.getAttribute('mark') ?? '', element.mark);
      element.update({ mark: 'square' });
      seen.push(element.mark);
      element.setAttribute('mark', 'star');
      seen.push(element.mark);
      element.remove();
      return seen;
    });
    const region = document.createElement('dotquilt-region') as HTMLElement & {
      update(patch: object): void;
    };
    const errors: { code: string; field: string }[] = [];
    region.addEventListener('dotquilt-error', (event) =>
      errors.push((event as CustomEvent).detail),
    );
    document.getElementById('stage')?.append(region);
    region.update({ mark: 'dash' });
    return { marks, errors };
  });
  for (const seen of result.marks)
    expect(seen).toEqual(['dot', 'dash', 'dash', 'square', 'dot']);
  expect(result.errors).toEqual([{ code: 'unknown-option', field: 'mark' }]);
});
