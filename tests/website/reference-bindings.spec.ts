import { expect, test } from '@playwright/test';
import { catalog } from '../../apps/website/lib/catalog';

test('all nine MDX examples bind their own component and preserve identity across code integration edits', async ({
  page,
}) => {
  for (const item of catalog) {
    await page.goto(`/docs/components/${item.slug}`);
    const start = page.getByRole('button', {
      name: 'Start loading',
      exact: true,
    });
    await expect(start).toBeEnabled();
    await expect(
      page.locator(`.catalog-preview ${item.tag}`).first(),
    ).toBeAttached();
    const owner = page
      .locator(
        item.family === 'text' ? 'dotquilt-text-loader' : 'dotquilt-region',
      )
      .first();
    await owner.evaluate((node) => Reflect.set(window, 'referenceOwner', node));
    await start.click();
    await expect(owner).toHaveAttribute('state', 'pending');
    const cycle = await owner.getAttribute('cycle');
    await page
      .getByRole('combobox', { name: 'Code integration', exact: true })
      .selectOption('native');
    await expect(owner).toHaveAttribute('cycle', cycle ?? '');
    expect(
      await owner.evaluate(
        (node) => node === Reflect.get(window, 'referenceOwner'),
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect(owner).toHaveAttribute('state', 'ready');
    await page.locator('#complete-example > summary').click();
    await expect(page.locator('#complete-example')).toContainText(
      `@dotquilt-internal/core/${item.entry}`,
    );
  }
});
