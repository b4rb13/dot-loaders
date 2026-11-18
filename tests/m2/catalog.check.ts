import { expect, test } from '@playwright/test';
import type {} from './catalog-client';
import {
  catalogCounts,
  dashboardFamilies,
  individualFamilies,
} from './catalog-model';

test('canonical catalog fixture uses the packed library', async ({ page }) => {
  await page.goto('/m2/catalog?profile=normal&phase=idle&candidate=native');
  await expect
    .poll(() => page.evaluate(() => Reflect.has(window, 'catalogFixture')), {
      timeout: 1500,
    })
    .toBe(true);
  const before = await page.evaluate(() => window.catalogFixture.prepare());
  expect(before.mounted).toBe(24);
  expect(before.visible).toBe(24);
  expect(before.publicHosts).toBe(30);
  expect(before.catalog.regions).toBe(6);
  expect(before.catalog.families).toEqual(catalogCounts(dashboardFamilies));
  expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

for (const family of individualFamilies)
  test(`individual ${family} reaches current content and releases resources`, async ({
    page,
  }) => {
    await page.goto(
      `/m2/catalog?profile=individual&phase=handoff&candidate=native&family=${family}`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const before = await page.evaluate(() => window.catalogFixture.prepare());
    expect(before.mounted).toBe(1);
    expect(before.visible).toBe(1);
    const result = await page.evaluate(() => window.catalogFixture.run(true));
    expect(result.final.ready).toBe(before.catalog.controllers);
    expect(result.final.catalog.identitiesRetained).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.final.violations).toEqual([]);
    expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual(
      { drawing: false, frames: false, views: false },
    );
  });

for (const candidate of ['native', 'canvas', 'svg', 'dom'])
  test(`mixed handoff with ${candidate} retains content and coordination`, async ({
    page,
  }) => {
    await page.goto(
      `/m2/catalog?profile=normal&phase=handoff&candidate=${candidate}`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const before = await page.evaluate(() => window.catalogFixture.prepare());
    const result = await page.evaluate(() => window.catalogFixture.run(true));
    expect(result.final.ready).toBe(10);
    expect(before.catalog.controllers).toBe(10);
    expect(result.final.catalog.identitiesRetained).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.final.violations).toEqual([]);
    expect(
      result.catalog.terminal.filter((e) => e.type === 'dotquilt-handoff-end'),
    ).toHaveLength(10);
    expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual(
      { drawing: false, frames: false, views: false },
    );
  });

test('scrolling list keeps 200 mounted and 20 visible without leaking drawing leases', async ({
  page,
}) => {
  await page.goto('/m2/catalog?profile=list&phase=idle&candidate=native');
  await page.waitForFunction(() => !!window.catalogFixture);
  const before = await page.evaluate(() => window.catalogFixture.prepare());
  expect(before.mounted).toBe(200);
  expect(before.visible).toBe(20);
  const result = await page.evaluate(() => window.catalogFixture.run(true));
  expect(result.catalog.scrolls.map((s) => s.top)).toEqual([960, 2400, 4320]);
  expect(result.catalog.scrolls.map((s) => s.visible)).toEqual([20, 20, 20]);
  expect(new Set(result.catalog.scrolls.flatMap((s) => s.ids)).size).toBe(60);
  expect(result.final.mounted).toBe(200);
  expect(result.final.visible).toBe(20);
  expect(result.errors).toEqual([]);
  expect(result.final.violations).toEqual([]);
  expect(result.final.ledger?.dots ?? 0).toBeLessThanOrEqual(16384);
  expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

test('stress fixture discloses admission and stays within the document caps', async ({
  page,
}) => {
  await page.goto('/m2/catalog?profile=stress&phase=idle&candidate=canvas');
  await page.waitForFunction(() => !!window.catalogFixture);
  const before = await page.evaluate(() => window.catalogFixture.prepare());
  expect(before.mounted).toBe(100);
  expect(before.visible).toBe(100);
  const result = await page.evaluate(() => window.catalogFixture.run(true));
  expect(result.final.ledger?.dots ?? 0).toBeLessThanOrEqual(16384);
  expect(result.final.ledger?.pixels ?? 0).toBeLessThanOrEqual(4194304);
  expect(result.final.ledger?.bytes ?? 0).toBeLessThanOrEqual(2097152);
  expect(result.final.violations).toEqual([]);
  expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

test('superseding a mixed handoff cancels each accepted controller once', async ({
  page,
}) => {
  await page.goto('/m2/catalog?profile=normal&phase=handoff&candidate=native');
  await page.waitForFunction(() => !!window.catalogFixture);
  await page.evaluate(() => window.catalogFixture.prepare());
  const pending = page.evaluate(() => window.catalogFixture.run(true));
  await page.waitForFunction(
    () =>
      document
        .querySelector('dotquilt-region')
        ?.getAttribute('data-presentation') === 'handoff',
  );
  await page.evaluate(() => window.catalogFixture.interrupt());
  const result = await pending;
  expect(
    result.catalog.terminal.filter((e) => e.type === 'dotquilt-handoff-cancel'),
  ).toHaveLength(10);
  expect(
    result.catalog.terminal.filter((e) => e.type === 'dotquilt-handoff-end'),
  ).toHaveLength(0);
  expect(result.errors).toEqual([]);
  expect(result.final.catalog.identitiesRetained).toBe(true);
  expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

test('three same-document cohorts release services with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/m2/catalog?profile=normal&phase=handoff&candidate=native');
  await page.waitForFunction(() => !!window.catalogFixture);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.catalogFixture.prepare());
    const result = await page.evaluate(() => window.catalogFixture.run(true));
    expect(result.final.ready).toBe(10);
    expect(
      result.catalog.terminal.filter((e) => e.type === 'dotquilt-handoff-end'),
    ).toHaveLength(10);
    expect(
      result.catalog.terminal
        .filter((e) => e.type === 'dotquilt-handoff-end')
        .every((e) => e.reason === 'immediate'),
    ).toBe(true);
    expect(result.final.painterCount).toBe(0);
    expect(await page.evaluate(() => window.catalogFixture.teardown())).toEqual(
      { drawing: false, frames: false, views: false },
    );
  }
});
