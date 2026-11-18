import { expect, type Page, test } from '@playwright/test';

// The `mark` option draws squares or dashes instead of dots (design/SPEC.md,
// "Alternative marks"). Positions and motion stay the same; only the shape and
// the pitch change, so a line placeholder is two rows of its own mark tall.
const shaped = [
  'skeleton-block',
  'skeleton-line',
  'skeleton-circle',
  'skeleton-text',
] as const;
const rowPitch = { dash: 9.5, square: 8.5 } as const;

async function open(page: Page, query: string) {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

for (const mark of ['dash', 'square'] as const) {
  test(`${mark}: text lines are two rows of the mark tall, drawn with that mark`, async ({
    page,
  }) => {
    await open(page, `component=skeleton-text&mark=${mark}`);
    const lines = await page.evaluate(() =>
      [
        ...(window.e2e.decoration.shadowRoot?.querySelectorAll(
          '.lines:not(.pulse) .line',
        ) ?? []),
      ].map((line) => ({
        height: line.getBoundingClientRect().height,
        mask: getComputedStyle(line).maskImage,
      })),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.height).toBeCloseTo(2 * rowPitch[mark], 1);
      expect(line.mask).toContain('linear-gradient');
    }
  });

  for (const renderer of ['native', 'react'] as const)
    test(`${mark}: ${renderer} SSR draws the mark without JavaScript`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/static/${renderer}?state=pending&mark=${mark}`);
      const text = page.locator('dotquilt-skeleton-text');
      await expect(text).toHaveAttribute('mark', mark);
      const lines = await text.evaluate((host) =>
        [...host.querySelectorAll('[data-dotquilt-static-line]')].map(
          (line) => ({
            height: line.getBoundingClientRect().height,
            mask: getComputedStyle(line).maskImage,
          }),
        ),
      );
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.height).toBeCloseTo(2 * rowPitch[mark], 1);
        expect(line.mask).toContain('linear-gradient');
      }
      await context.close();
    });

  for (const kind of shaped)
    test(`${mark}: ${kind} looks right, paused`, async ({ page }) => {
      await open(page, `component=${kind}&mark=${mark}&motion=paused`);
      await expect(page.locator('#stage')).toHaveScreenshot(
        `${kind}-${mark}-light.png`,
      );
    });
}
