import { expect, test } from '@playwright/test';
import { expectPaint } from '../paint-output';
import type {} from './api.js';

test('structural surface part remains available during idle and handoff', async ({
  page,
}) => {
  await page.goto('/table?mode=external');
  await expect(
    page.locator('#table svg[data-dotquilt-painter]'),
  ).toHaveAttribute('part', 'surface');
  await page.evaluate(() => window.tableTest.ready(1200));
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await expect(
    page.locator('#table svg[data-dotquilt-painter]'),
  ).toHaveAttribute('part', 'surface');
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.tableTest.violations)).toEqual([]);
});

test('React delivers table fields and readiness through committed props with a forwarded error callback', async ({
  page,
}) => {
  await page.goto('/react');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() =>
    window.tableTest.update({
      rows: 6,
      rowHeight: 28,
      columns: [{ kind: 'text', width: 2 }, { kind: 'number' }],
    }),
  );
  await expect(page.locator('#table')).toHaveAttribute('rows', '6');
  await expect(page.locator('#table')).toHaveAttribute('row-height', '28');
  await page.evaluate(() => window.tableTest.update({ rows: -1 }));
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'tableAdapterErrors')))
    .toEqual(['invalid-option']);
  await page.evaluate(() => {
    window.tableTest.update({
      rows: 5,
      rowHeight: 32,
      columns: [
        { kind: 'text' },
        { kind: 'number' },
        { kind: 'badge' },
        { kind: 'date' },
      ],
    });
    window.tableTest.ready();
  });
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await expect(page.locator('#table-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => window.tableTest.identity())).toBe(true);
  expect(await page.evaluate(() => Reflect.get(window, 'reactErrors'))).toEqual(
    [],
  );
});
test('table content-box alignment, intrinsic row height and pointer coordinates survive padding and border', async ({
  page,
}) => {
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.addStyleTag({
    content:
      '#table{box-sizing:border-box;width:400px;border:5px solid;padding:15px}',
  });
  await page
    .locator('#table')
    .evaluate((e) => (e as import('dotquilt/table').TableLoader).refresh());
  const host = await page.locator('#table').boundingBox(),
    field = await page
      .locator('#table svg[data-dotquilt-painter]')
      .boundingBox();
  if (!host || !field) throw new Error('No content box');
  expect(field.x - host.x).toBe(20);
  expect(field.y - host.y).toBe(20);
  expect(field.width).toBe(360);
  expect(field.height).toBe(160);
  await page.evaluate(() =>
    window.tableTest.update({ pointerResponse: 'lift' }),
  );
  await page.mouse.move(field.x + 40, field.y + 40);
  await expect
    .poll(() =>
      page
        .locator('#table')
        .evaluate((e) => Reflect.get(e, Symbol.for('dotquilt.pointer.v1'))),
    )
    .toEqual({ x: 40, y: 40 });
  await page.evaluate(() => window.tableTest.update({ rows: 1 }));
  await expect
    .poll(() =>
      page.locator('#table').evaluate((e) => e.getBoundingClientRect().height),
    )
    .toBe(72);
});

test('standalone decoration never samples geometry; adoption releases the old document resources and provider', async ({
  page,
}) => {
  await page.goto('/table');
  await expectPaint(page.locator('#table'));
  await page.evaluate(() => {
    const t = document.createElement('dotquilt-table-loader');
    t.id = 'standalone-table';
    Reflect.set(window, 'standaloneCalls', 0);
    t.targetProvider = () => {
      Reflect.set(
        window,
        'standaloneCalls',
        Reflect.get(window, 'standaloneCalls') + 1,
      );
      return null;
    };
    document.body.append(t);
  });
  await expectPaint(page.locator('#standalone-table'));
  expect(
    await page.evaluate(() => Reflect.get(window, 'standaloneCalls')),
  ).toBe(0);
  const state = await page.locator('#standalone-table').evaluate((element) => {
    const t = element as import('dotquilt/table').TableLoader,
      started = t.activity.started,
      doc = document.implementation.createHTMLDocument('adopted');
    doc.body.append(t);
    return {
      released: t.targetProvider === undefined,
      unchangedWindow: t.activity.started === started,
      painters: t.shadowRoot?.querySelectorAll('[data-dotquilt-painter]')
        .length,
    };
  });
  expect(state).toEqual({ released: true, unchangedWindow: true, painters: 0 });
  await page.evaluate(() => window.tableTest.detach());
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

for (const framework of ['table', 'react'])
  test(`${framework} region override owns its surface without sampling Table geometry`, async ({
    page,
  }) => {
    await page.goto(`/${framework}`);
    await expectPaint(page.locator('#table'));
    await page.evaluate(() => {
      window.tableTest.provider('throw');
      window.tableTest.override();
    });
    // React commits the owning region binding before readiness changes.
    await expect
      .poll(() =>
        page
          .locator('#table-region')
          .evaluate((el) => Reflect.get(el, 'animations').handoff?.id),
      )
      .toBe('fixture/table-region-override');
    await page.evaluate(() => window.tableTest.ready());
    await expect(page.locator('#table-region')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    const result = await page.evaluate(() => ({
      calls: window.tableTest.calls(),
      errors: window.tableTest.errors,
      surfaces: window.tableTest.regionSurfaces,
      identity: window.tableTest.identity(),
    }));
    expect(result.calls).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.identity).toBe(true);
    expect(result.surfaces.length).toBeGreaterThan(0);
    expect(
      result.surfaces.every(
        (s) => s.family === 'region' && s.width === 400 && s.height >= 160,
      ),
    ).toBe(true);
    await expect(page.locator('[data-dotquilt-painter]')).toHaveCount(0);
  });
