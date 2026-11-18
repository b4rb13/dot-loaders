import { expect, test } from '@playwright/test';
import type {} from '../m2/catalog-client';

test('refresh coalesces eligibility reads until the pending render', async ({
  page,
}) => {
  await page.goto('/m2/catalog?profile=normal&phase=idle&candidate=native');
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    await window.catalogFixture.prepare();
    const hosts = [
      ...document.querySelectorAll<HTMLElement & { refresh(): void }>(
        '[data-dotquilt-surface],dotquilt-region,dotquilt-text-loader',
      ),
    ];
    let reads = 0;
    for (const host of hosts) {
      const original = host.getBoundingClientRect;
      host.getBoundingClientRect = function () {
        reads++;
        return original.call(this);
      };
    }
    for (let i = 0; i < 4; i++) for (const host of hosts) host.refresh();
    const synchronous = reads;
    await Promise.resolve();
    const afterRender = reads;
    for (const host of hosts)
      Reflect.deleteProperty(host, 'getBoundingClientRect');
    const cleanup = await window.catalogFixture.teardown();
    return { synchronous, afterRender, cleanup };
  });
  expect(result.synchronous).toBe(0);
  expect(result.afterRender).toBeGreaterThan(0);
  expect(result.cleanup).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});

test('table appearance refresh retains its static tree and structural changes still update it', async ({
  page,
}) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
  const result = await page.evaluate(async () => {
    await window.catalogFixture.prepare();
    const host = document.querySelector(
      'dotquilt-table-loader',
    ) as HTMLElement & {
      refresh(): void;
      rows: number;
      rowHeight: number;
      columns: readonly { kind: 'number'; width: number }[];
    };
    const original = host.shadowRoot?.querySelector('[data-table-static]');
    const html = original?.outerHTML;
    for (let i = 0; i < 4; i++) host.refresh();
    host.classList.add('application-theme');
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    const retained =
      original === host.shadowRoot?.querySelector('[data-table-static]');
    const unchanged = html === original?.outerHTML;
    host.rows = 4;
    host.rowHeight = 20;
    host.columns = [
      { kind: 'number', width: 1 },
      { kind: 'number', width: 2 },
    ];
    await Promise.resolve();
    const updated = host.shadowRoot?.querySelector('[data-table-static]');
    const structure = {
      replaced: original !== updated,
      height: updated?.getAttribute('height'),
      columns: updated?.children.length,
    };
    const cleanup = await window.catalogFixture.teardown();
    return { retained, unchanged, structure, cleanup };
  });
  expect(result.retained).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(result.structure).toEqual({
    replaced: true,
    height: '80',
    columns: 2,
  });
  expect(result.cleanup).toEqual({
    drawing: false,
    frames: false,
    views: false,
  });
});
