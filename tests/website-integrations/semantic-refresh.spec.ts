import { expect, test } from '@playwright/test';

for (const integration of ['native', 'react']) {
  test(`${integration}: refresh and explicit measurement preserve focus, current content and cycle`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:4236/?integration=${integration}`);
    await expect(page.locator('#refresh')).toBeEnabled();
    const input = page.locator('#note');
    await input.fill('Focused current content');
    await input.focus();
    await page
      .locator('#refresh')
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'refreshing',
    );
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    const cycle = await page.locator('#report-owner').getAttribute('cycle');
    expect(cycle).toBe('1');
    await page
      .locator('#measure')
      .evaluate((button: HTMLButtonElement) => button.click());
    expect(await page.locator('#report-owner').getAttribute('cycle')).toBe(
      cycle,
    );
    await page
      .locator('#reveal')
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(input).toHaveValue('Focused current content');
    await expect(input).toBeFocused();
  });
  test(`${integration}: mobile table projections stay inside the reserved source`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:4236/?integration=${integration}`);
    await expect(page.locator('#load')).toBeEnabled();
    const layout = await page.evaluate(() => {
      const source = document
        .getElementById('table-source')
        ?.getBoundingClientRect();
      if (!source) throw new Error('Missing table source');
      return [
        ...document.querySelectorAll(
          '#report-table tbody th,#report-table tbody td',
        ),
      ].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          top: box.top - source.top,
          bottom: box.bottom - source.top,
          height: source.height,
        };
      });
    });
    expect(layout).toHaveLength(9);
    expect(
      layout.every((cell) => cell.top >= 0 && cell.bottom <= cell.height),
    ).toBe(true);
    await page.locator('#load').click();
    await page.locator('#reveal').click();
    await expect(page.locator('#report-owner')).toHaveAttribute(
      'data-presentation',
      'ready',
    );
    await expect(
      page.getByRole('table', { name: 'Illustrative project status' }),
    ).toBeVisible();
  });
}
