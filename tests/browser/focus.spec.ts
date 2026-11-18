import { expect, type Page, test } from '@playwright/test';
import type { LoadingRegion } from '../../packages/core/dist/region';

async function mount(page: Page, family: 'region' | 'text', mode: string) {
  await page.goto(`/?static&mode=${mode}`);
  await page.evaluate(
    async ({ family, mode }) => {
      window.violations = [];
      document.addEventListener('securitypolicyviolation', (event) =>
        window.violations.push(event.violatedDirective),
      );
      document.body.replaceChildren();
      const module = await import(String(`/pkg/dist/${family}.js`));
      if (family === 'region') module.registerLoadingRegion();
      else module.registerTextLoader();
      const owner = document.createElement(
        family === 'region' ? 'dotquilt-region' : 'dotquilt-text-loader',
      ) as LoadingRegion;
      owner.id = 'focus-owner';
      owner.className = 'example';
      owner.state = 'ready';
      owner.motion = 'paused';
      owner.timing = { duration: 0 };
      owner.stylePolicy =
        mode === 'external'
          ? { mode, href: `/pkg/dist/${family}.css` }
          : {
              mode: 'inline',
              ...(mode === 'nonce' ? { nonce: 'fixture-nonce' } : {}),
            };
      const content = document.createElement('div');
      content.id = 'focus-content';
      const inside = document.createElement('button');
      inside.id = 'inside';
      inside.textContent = 'Load current content';
      inside.addEventListener('click', () => {
        // Start with focused content even when Safari's pointer default blurs a button.
        inside.focus({ preventScroll: true });
        owner.state = 'pending';
      });
      content.append(inside, document.createTextNode('Actual content'));
      owner.append(content);
      const before = document.createElement('button');
      before.id = 'before';
      before.textContent = 'Before';
      const after = document.createElement('button');
      after.id = 'after';
      after.textContent = 'After';
      for (const button of [before, after])
        button.addEventListener('click', () =>
          button.focus({ preventScroll: true }),
        );
      document.body.replaceChildren(before, owner, after);
    },
    { family, mode },
  );
  const owner = page.locator('#focus-owner');
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  await expect(owner).toHaveCSS(
    'display',
    family === 'region' ? 'grid' : 'inline-grid',
  );
  return owner;
}

for (const family of ['region', 'text'] as const)
  for (const mode of ['inline', 'external', 'nonce', 'hash']) {
    test(`${family}/${mode}: pointer focus is quiet, keyboard and loading focus transfers stay visible`, async ({
      page,
      browserName,
    }) => {
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      const owner = await mount(page, family, mode);
      // Explicit host focusability; default content navigation is covered separately.
      await owner.evaluate((element) => {
        element.tabIndex = -1;
      });
      await owner.click({ position: { x: 300, y: 80 } });
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'none');
      await expect(owner).toHaveAttribute('tabindex', '-1');

      await page.locator('#before').focus();
      await page.keyboard.press(tab);
      await expect(owner).not.toBeFocused();
      await test.info().attach('default-tab-order', {
        body: JSON.stringify(
          await page.evaluate(() => document.activeElement?.id),
        ),
        contentType: 'application/json',
      });
      await owner.evaluate((element) => {
        element.tabIndex = 0;
      });
      await page.locator('#before').focus();
      await page.keyboard.press(tab);
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await page.keyboard.press(tab);
      await expect(page.locator('#inside')).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'none');
      await page.keyboard.press('Enter');
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-width', '2px');
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await expect(page.locator('#inside')).toBeHidden();
      await owner.evaluate((element: LoadingRegion) => {
        element.state = 'ready';
      });
      await expect(page.locator('#inside')).toBeVisible();
      await expect(owner).toBeFocused();

      await owner.click({ position: { x: 300, y: 80 } });
      await expect(owner).toHaveCSS('outline-style', 'none');
      await page.locator('#inside').click();
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await expect(owner).toHaveCSS('outline-width', '2px');
      await expect(owner).toHaveAttribute('data-dotquilt-focus', '');
      await page.locator('#after').click();
      await expect(owner).not.toHaveAttribute('data-dotquilt-focus', /.*/);
      await owner.evaluate((element: LoadingRegion) => {
        element.state = 'ready';
        element.tabIndex = 0;
      });

      await page.emulateMedia({ forcedColors: 'active' });
      await page.locator('#before').focus();
      await page.keyboard.press(tab);
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await expect(owner).toHaveCSS('outline-width', '2px');
      const colors = await owner.evaluate((element) => {
        const css = getComputedStyle(element);
        return {
          outline: css.outlineColor,
          adjustment: css.getPropertyValue('forced-color-adjust'),
          supported: CSS.supports('forced-color-adjust', 'auto'),
          active: matchMedia('(forced-colors: active)').matches,
        };
      });
      expect(colors.outline).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.adjustment).toBe(colors.supported ? 'auto' : '');
      await test.info().attach('forced-colors-capability', {
        body: JSON.stringify(colors),
        contentType: 'application/json',
      });
      expect(await page.evaluate(() => window.violations)).toEqual([]);
    });

    test(`${family}/${mode}: focus marker clears through blur, nested content and reconnect without stealing outside focus`, async ({
      page,
    }) => {
      const owner = await mount(page, family, mode);
      await page.locator('#inside').click();
      await expect(owner).toBeFocused();
      await expect(owner).toHaveAttribute('data-dotquilt-focus', '');
      await owner.evaluate((element) => {
        const after = document.getElementById('after');
        element.remove();
        if (after) document.body.insertBefore(element, after);
      });
      await expect(owner).not.toHaveAttribute('data-dotquilt-focus', /.*/);
      await page.locator('#after').click();
      await owner.evaluate((element: LoadingRegion) => {
        element.update({ state: 'ready', cycle: 'reconnect' });
      });
      await expect(page.locator('#inside')).toBeVisible();
      await owner.evaluate((element: LoadingRegion) => {
        element.state = 'pending';
      });
      await expect(owner).toHaveAttribute('data-presentation', 'pending');
      await expect(owner).not.toHaveAttribute('data-dotquilt-focus', /.*/);
      await expect(owner).toHaveCSS('outline-style', 'none');
      await expect(page.locator('#after')).toBeFocused();

      await owner.evaluate((element: LoadingRegion) => {
        element.state = 'ready';
      });
      await page.locator('#inside').focus();
      await owner.evaluate((element: LoadingRegion) => {
        element.state = 'refreshing';
      });
      await expect(page.locator('#inside')).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'none');
      await expect(owner).not.toHaveAttribute('data-dotquilt-focus', /.*/);
      expect(await page.evaluate(() => window.violations)).toEqual([]);
    });
  }
