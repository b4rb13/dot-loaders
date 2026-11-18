import { expect, type Page, test } from '@playwright/test';
import { paintCount } from '../paint-output';

async function open(page: Page, framework: string, extra = '') {
  await page.clock.install();
  await page.goto(`/${framework}?family=region${extra}`);
  await page.waitForFunction(() => Boolean(window.shared));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(80);
}
test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.shared.remove());
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => ({
      frames: Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
      dots: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
      animations: document.getAnimations().length,
    })),
  ).toEqual({ frames: undefined, dots: undefined, animations: 0 });
});
const treatments = [
  'auto',
  'text',
  'number',
  'badge',
  'date',
  'badge-text',
  'text-badge',
] as const;
for (const framework of ['native', 'react']) {
  for (const variant of ['line', 'bar', 'scatter'] as const)
    for (const idle of ['typeOn', 'tableShimmer'] as const)
      test(`${framework}/${variant}/${idle}: all seven treatments compose with chart silhouettes`, async ({
        page,
      }, info) => {
        const rows = [];
        await open(page, framework);
        for (const [index, cellStyle] of treatments.entries()) {
          if (index) {
            await page.evaluate(
              (index) =>
                window.shared.patch('owner', {
                  state: 'pending',
                  cycle: `treatment-${index}`,
                }),
              index,
            );
            await page.clock.runFor(80);
          }
          await page.evaluate(
            ({ variant, idle, cellStyle, index }) =>
              window.shared.repertoire(variant, idle, cellStyle, index),
            { variant, idle, cellStyle, index },
          );
          await page.clock.runFor(80);
          await page.evaluate(() =>
            window.shared.patch('owner', { state: 'ready', timing: undefined }),
          );
          await page.clock.runFor(80);
          await expect(page.locator('#owner')).toHaveAttribute(
            'data-presentation',
            'handoff',
          );
          expect(
            await page.evaluate(() => ({
              chart: window.shared.calls.chart,
              table: window.shared.calls.table,
            })),
          ).toEqual({ chart: 1, table: 1 });
          for (const id of ['chart', 'table'])
            expect(await paintCount(page.locator(`#${id}`))).toBeGreaterThan(0);
          for (const id of ['row-a', 'row-b'])
            expect(
              await page
                .locator(`#${id}`)
                .evaluate((e) => e.getAnimations().length),
            ).toBe(1);
          expect(
            await page
              .locator('#owner')
              .evaluate(
                (e) =>
                  e.shadowRoot?.querySelector<HTMLElement>('[part=content]')
                    ?.inert,
              ),
          ).toBe(false);
          await page.clock.runFor(1000);
          await expect(page.locator('#owner')).toHaveAttribute(
            'data-presentation',
            'ready',
          );
          expect(await page.evaluate(() => window.shared.identity())).toBe(
            true,
          );
          expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
          const events = await page.evaluate(() => window.shared.events);
          expect(events.slice(-2).map((e) => e.type)).toEqual([
            'dotquilt-handoff-start',
            'dotquilt-handoff-end',
          ]);
          rows.push({
            variant,
            idle,
            cellStyle,
            index,
            terminal: events.slice(-2),
          });
        }
        await info.attach('declared-repertoire-cells', {
          body: JSON.stringify(rows),
          contentType: 'application/json',
        });
      });
  test(`${framework}: one incomplete table projection falls back locally beside valid chart and table`, async ({
    page,
  }) => {
    await open(page, framework, '&second=1');
    await page.evaluate(() =>
      window.shared.patch('owner', {
        revealTargets: window.shared.targets().filter((t) => t.id !== 'row-d'),
        state: 'ready',
        timing: undefined,
      }),
    );
    await page.clock.runFor(80);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    expect(
      await page.evaluate(() => ({
        chart: window.shared.calls.chart,
        table: window.shared.calls.table,
        table2: window.shared.calls.table2,
      })),
    ).toEqual({ chart: 1, table: 1, table2: 1 });
    for (const id of ['row-a', 'row-b'])
      expect(
        await page.locator(`#${id}`).evaluate((e) => e.getAnimations().length),
      ).toBe(1);
    expect(
      await page.locator('#row-c').evaluate((e) => e.getAnimations().length),
    ).toBe(0);
    await page.clock.runFor(1000);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
  });
  test(`${framework}: idle changes preserve the captured multi-source clock and terminal pair`, async ({
    page,
  }) => {
    await open(page, framework);
    await page.evaluate(() => {
      window.shared.multi('normal');
      window.shared.patch('owner', {
        state: 'ready',
        timing: { duration: 600 },
      });
    });
    await page.clock.runFor(160);
    await page.evaluate(() => window.shared.idleOnly());
    await page.clock.runFor(80);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'handoff',
    );
    await page.clock.runFor(500);
    await expect(page.locator('#owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    expect(
      await page.evaluate(() => window.shared.events.map((e) => e.type)),
    ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
    expect(await page.evaluate(() => window.shared.errors)).toEqual([]);
    expect(await page.evaluate(() => window.shared.identity())).toBe(true);
  });
}
