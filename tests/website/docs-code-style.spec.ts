import { expect, test } from '@playwright/test';

test('block code stays a continuous readable source surface while prose keeps inline-code cues', async ({
  page,
}) => {
  await page.goto('/docs');
  const panel = page.locator('.code-panel');
  if (!(await panel.evaluate((n) => (n as HTMLDetailsElement).open)))
    await panel.locator('>summary').click();
  const code = panel.locator('pre code');
  await expect(code).toContainText('LoadingRegion');
  await expect(code).toHaveCSS('border-top-width', '0px');
  await expect(code).toHaveCSS('padding', '0px');
  await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const inline = page.locator('#readiness p code').first();
  await expect(inline).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const viewport = panel.locator('pre');
  await viewport.focus();
  await expect(viewport).toBeFocused();
});
