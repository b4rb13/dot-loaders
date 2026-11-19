import type { Page, PageScreenshotOptions } from '@playwright/test';

/**
 * Saves a screenshot for a person to look at. It asserts nothing, so it runs
 * only when DOTQUILT_CAPTURE is set (e.g. `DOTQUILT_CAPTURE=1 bun run
 * test:e2e`); otherwise every run, CI included, skips the cost.
 */
export async function capture(
  page: Page,
  options: PageScreenshotOptions,
): Promise<void> {
  if (process.env.DOTQUILT_CAPTURE) await page.screenshot(options);
}
