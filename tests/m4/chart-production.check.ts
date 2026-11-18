import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('../../.artifacts/m4/chart-production.json', import.meta.url),
    'utf8',
  ),
);
for (const entry of ['root', 'family'])
  for (const framework of ['native', 'react'])
    test(`optimized chart ${entry}/${framework} works with every final variant`, async ({
      page,
    }, info) => {
      const violations: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() =>
        document.addEventListener('securitypolicyviolation', (e) => {
          Reflect.set(window, 'productionCsp', [
            ...(Reflect.get(window, 'productionCsp') ?? []),
            { directive: e.violatedDirective, uri: e.blockedURI },
          ]);
        }),
      );
      const response = page.waitForResponse((r) =>
        r.url().endsWith(`chart-${entry}-${framework}-production.js`),
      );
      await page.goto(
        `/chart-production?entry=${entry}&framework=${framework}`,
      );
      const bytes = await (await response).body();
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        packet.production[`${entry}-${framework}`].sha256,
      );
      await expect(page.locator('dotquilt-chart-loader')).toHaveCount(3);
      for (let i = 0; i < 3; i++)
        await expect(
          page
            .locator('dotquilt-chart-loader')
            .nth(i)
            .locator('[data-dotquilt-painter] circle')
            .first(),
        ).toBeVisible();
      const ids = await page
        .locator('dotquilt-chart-loader')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('variant')));
      expect(ids).toEqual(['line', 'bar', 'scatter']);
      for (const region of await page.locator('dotquilt-region').all())
        await region.dispatchEvent('click');
      await expect
        .poll(() =>
          page.locator('dotquilt-region[data-presentation=ready]').count(),
        )
        .toBe(3);
      for (let i = 0; i < 3; i++)
        expect(
          await page
            .locator('dotquilt-region')
            .nth(i)
            .evaluate(
              (e) =>
                (e.shadowRoot?.querySelector('.c') as HTMLElement | undefined)
                  ?.inert,
            ),
        ).toBe(false);
      expect(await page.locator('[data-dotquilt-painter]').count()).toBe(0);
      expect(
        await page.evaluate(() =>
          Reflect.get(document, Symbol.for('dotquilt.frames.v1')),
        ),
      ).toBeUndefined();
      expect(
        await page.evaluate(() =>
          (Reflect.get(window, 'productionCsp') ?? []).filter(
            (event: { directive: string; uri: string }) =>
              !(
                event.directive === 'img-src' &&
                event.uri === new URL('/favicon.ico', location.href).href
              ),
          ),
        ),
      ).toEqual(violations);
      await info.attach('csp-events', {
        body: JSON.stringify(
          await page.evaluate(() => Reflect.get(window, 'productionCsp') ?? []),
        ),
        contentType: 'application/json',
      });
      expect(errors).toEqual([]);
    });
