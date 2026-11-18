import { expect, test } from '@playwright/test';
import './fixture';

for (const mode of ['hash', 'nonce', 'external'])
  for (const early of [false, true])
    test(`${mode}/${early ? 'early' : 'late'}: hydrated default content is tabbable and prop commits preserve the loading focus destination`, async ({
      page,
      browserName,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto(`/?state=ready&mode=${mode}${early ? '&early' : ''}`);
      await page.waitForFunction(() => window.fixtureHydrated);
      await page.evaluate(() => {
        const before = document.createElement('button');
        before.id = 'nav-before';
        before.textContent = 'Before';
        document.body.prepend(before);
      });
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      const owner = page.locator('#react-region');
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      await page.locator('#nav-before').focus();
      await page.keyboard.press(tab);
      await expect(page.locator('#preserved-input')).toBeFocused();
      await page.keyboard.press(tab);
      await expect(page.locator('#counter')).toBeFocused();
      await page.evaluate(() => window.fixture.update({ state: 'pending' }));
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await page.evaluate(() => window.fixture.rerender());
      await expect(owner).toBeFocused();
      await page.evaluate(() =>
        window.fixture.update({ state: 'ready', duration: 0 }),
      );
      await expect(page.locator('#preserved-input')).toBeVisible();
      await expect(owner).toBeFocused();
      await page.keyboard.press(tab);
      await expect(page.locator('#preserved-input')).toBeFocused();
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      await page.evaluate(() => window.fixture.update({ state: 'refreshing' }));
      await expect(page.locator('#preserved-input')).toBeFocused();
      await page.keyboard.press(tab);
      await expect(page.locator('#counter')).toBeFocused();
      expect(await page.evaluate(() => window.fixtureViolations)).toEqual([]);
      expect(errors).toEqual([]);
    });
for (const mode of ['hash', 'nonce', 'external'])
  test(`${mode}: ready React SSR controls are accessible before JavaScript`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${baseURL}/?state=ready&mode=${mode}`);
    const owner = page.locator('#react-region');
    await expect(owner).not.toHaveAttribute('tabindex', /.*/);
    // Start at the first real content control, then follow native sequential navigation.
    await page.locator('#preserved-input').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(page.locator('#counter')).toBeFocused();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(page.locator('#recovery')).toBeFocused();
    await context.close();
  });
