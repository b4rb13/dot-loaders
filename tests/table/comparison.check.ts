import type { LoadingRegion } from '@dotquilt-internal/core/region';
import type { TableLoader } from '@dotquilt-internal/core/table';
import { expect, test } from '@playwright/test';
import type {} from './api.js';

test('controlled Table idle and row handoff inspection', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.clock.install({ time: new Date('2026-10-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));
  for (const idle of ['typeOn', 'tableShimmer'] as const)
    for (const cellStyle of [
      'auto',
      'text',
      'number',
      'badge',
      'date',
      'badge-text',
      'text-badge',
    ]) {
      await page.goto('/table');
      await page.clock.runFor(50);
      await page.evaluate(
        ({ idle, cellStyle }) => window.tableTest.recipe(idle, { cellStyle }),
        { idle, cellStyle },
      );
      await page.clock.runFor(200);
      await page.evaluate(() =>
        (document.getElementById('table') as TableLoader).refresh(),
      );
      await page.screenshot({
        path: info.outputPath(`${idle}-${cellStyle}-idle.png`),
        animations: 'allow',
      });
      await page.evaluate(() => window.tableTest.ready(900, 'linear'));
      await page.evaluate(() => {
        for (const animation of document
          .getElementById('table-region')
          ?.shadowRoot?.getAnimations() ?? [])
          if (animation.effect?.getTiming().duration === 900) animation.pause();
      });
      await page.clock.runFor(450);
      await page.evaluate(() => {
        const region = document.getElementById('table-region') as LoadingRegion;
        for (const animation of region.shadowRoot?.getAnimations() ?? [])
          if (animation.effect?.getTiming().duration === 900)
            animation.currentTime = 450;
        Reflect.get(region, 'frame').call(region);
        for (const row of document.querySelectorAll('#table-content tr'))
          for (const animation of row.getAnimations()) {
            animation.pause();
            animation.currentTime = 1;
          }
      });
      await expect(page.locator('#table-region')).toHaveAttribute(
        'data-presentation',
        'handoff',
      );
      await page.screenshot({
        path: info.outputPath(`${idle}-${cellStyle}-mid.png`),
        animations: 'allow',
      });
      expect(await page.evaluate(() => window.tableTest.errors)).toEqual([]);
    }
});
