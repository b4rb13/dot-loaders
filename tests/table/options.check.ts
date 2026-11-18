import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { LoadingRegion, TableLoader } from '@dotquilt-internal/core';
import { expect, test } from '@playwright/test';
import { expectPaint, paintCount } from '../paint-output';

const packet = JSON.parse(
  readFileSync(
    new URL(
      '../../.artifacts/m4/table-animation-closures.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
for (const fixture of ['firstParty', 'custom'])
  for (const entry of ['root', 'family'])
    for (const framework of ['native', 'react'])
      test(`complete minified table ${fixture}/${entry}/${framework} preserves idle, handoff, CSP and cleanup`, async ({
        page,
      }) => {
        // Fourteen complete loads share this one test; keep each existing
        // five-second phase assertion, rather than a 20-second aggregate cap.
        if (fixture === 'firstParty') test.setTimeout(90_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.addInitScript(() => {
          Reflect.set(window, 'optionalViolations', []);
          Reflect.set(window, 'optionalEvents', []);
          for (const name of [
            'dotquilt-error',
            'dotquilt-handoff-start',
            'dotquilt-handoff-end',
            'dotquilt-handoff-cancel',
          ])
            document.addEventListener(name, (e) =>
              Reflect.get(window, 'optionalEvents').push([
                name,
                (e as CustomEvent).detail,
              ]),
            );
          document.addEventListener('securitypolicyviolation', (event) => {
            if (event.violatedDirective !== 'img-src')
              Reflect.get(window, 'optionalViolations').push(
                event.violatedDirective,
              );
          });
        });
        const response = page.waitForResponse((r) =>
          r
            .url()
            .endsWith(
              `table-options-${fixture}-${entry}-${framework}-production.js`,
            ),
        );
        await page.goto(
          `/options?fixture=${fixture}&entry=${entry}&framework=${framework}`,
        );
        expect(
          createHash('sha256')
            .update(await (await response).body())
            .digest('hex'),
        ).toBe(
          packet.sizes[`${fixture}-${entry}-${framework}`].productionSha256,
        );
        const table = page.locator('dotquilt-table-loader'),
          region = page.locator('dotquilt-region');
        await expect(table).toHaveCount(1);
        const ids =
          fixture === 'firstParty'
            ? Array.from({ length: 7 }, () => [
                'dotquilt/table/type-on',
                'dotquilt/table/shimmer',
              ]).flat()
            : ['example/table-idle'];
        for (const [index, id] of ids.entries()) {
          if (index) await region.dispatchEvent('click');

          // Public native state control isolates each configured binding in the exact
          // unchanged size fixture; the React click still supplies its next binding.
          await region.evaluate((e) => {
            (e as LoadingRegion).state = 'pending';
          });
          await expect(table).toHaveAttribute('data-moving', '');
          expect(
            await table.evaluate((e) => (e as TableLoader).animations.idle?.id),
          ).toBe(id);
          await expectPaint(table);
          expect(
            await region.evaluate((e) => {
              const content =
                e.shadowRoot?.querySelector<HTMLElement>('[part=content]');
              return [
                content?.inert,
                content?.getAttribute('aria-busy'),
                content?.getAttribute('aria-hidden'),
              ];
            }),
          ).toEqual([true, 'true', 'true']);
          await region.evaluate((e) => {
            (e as LoadingRegion).state = 'ready';
          });

          await expect(region).toHaveAttribute('data-presentation', 'handoff');
          expect(await paintCount(table)).toBeLessThanOrEqual(4096);

          await expect(region).toHaveAttribute('data-presentation', 'ready');
          expect(
            await region.evaluate((e) => {
              const content =
                e.shadowRoot?.querySelector<HTMLElement>('[part=content]');
              return [
                content?.inert,
                content?.getAttribute('aria-busy'),
                e.getAnimations({ subtree: true }).length,
              ];
            }),
          ).toEqual([false, 'false', 0]);
          await expect(page.locator('[data-dotquilt-painter]')).toHaveCount(0);
        }
        expect(
          await page.evaluate(() => Reflect.get(window, 'optionalViolations')),
        ).toEqual([]);
        const events = (await page.evaluate(() =>
          Reflect.get(window, 'optionalEvents'),
        )) as [string, unknown][];
        expect(events.filter(([name]) => name === 'dotquilt-error')).toEqual(
          [],
        );
        for (const name of ['dotquilt-handoff-start', 'dotquilt-handoff-end'])
          expect(events.filter(([type]) => type === name)).toHaveLength(
            ids.length,
          );
        expect(
          events.filter(([name]) => name === 'dotquilt-handoff-cancel'),
        ).toEqual([]);
        expect(errors).toEqual([]);
      });
