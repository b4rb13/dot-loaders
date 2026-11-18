import { expect, type Page, test } from '@playwright/test';
import type { LoadingRegion } from '../../packages/core/dist/region';

async function mount(page: Page, family: 'region' | 'text', mode: string) {
  await page.goto(`/?static&mode=${mode}`);
  await page.evaluate(
    async ({ family, mode }) => {
      document.body.replaceChildren();
      window.violations = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        window.violations.push(e.violatedDirective),
      );
      const m = await import(String(`/pkg/dist/${family}.js`));
      m[family === 'region' ? 'registerLoadingRegion' : 'registerTextLoader']();
      const owner = document.createElement(
        family === 'region' ? 'dotquilt-region' : 'dotquilt-text-loader',
      ) as LoadingRegion;
      owner.id = 'tab-owner';
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
      const button = (id: string) => {
        const b = document.createElement('button');
        b.id = id;
        b.textContent = id;
        return b;
      };
      const content = document.createElement('div');
      content.id = 'tab-content';
      content.append(button('inside'), button('second'));
      owner.append(content);
      document.body.append(button('before'), owner, button('after'));
    },
    { family, mode },
  );
  const owner = page.locator('#tab-owner');
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  return owner;
}

for (const family of ['region', 'text'] as const)
  for (const mode of ['inline', 'external', 'nonce', 'hash']) {
    test(`${family}/${mode}: default ready and refresh content has natural forward/reverse tab order`, async ({
      page,
      browserName,
    }) => {
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
      const owner = await mount(page, family, mode);
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      for (const state of ['ready', 'refreshing'] as const) {
        await owner.evaluate((el: LoadingRegion, state) => {
          el.state = state;
        }, state);
        await expect(owner).toHaveAttribute('data-presentation', state);
        await page.locator('#before').focus();
        for (const id of ['inside', 'second', 'after']) {
          await page.keyboard.press(tab);
          await expect(page.locator(`#${id}`)).toBeFocused();
        }
        for (const id of ['second', 'inside', 'before']) {
          await page.keyboard.press(back);
          await expect(page.locator(`#${id}`)).toBeFocused();
        }
      }
      expect(await page.evaluate(() => window.violations)).toEqual([]);
    });
    test(`${family}/${mode}: replacement transfers focus visibly, ready resumes into controls and releases its temporary tab stop`, async ({
      page,
      browserName,
    }) => {
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      const owner = await mount(page, family, mode);
      await page.locator('#before').focus();
      await page.keyboard.press(tab);
      await expect(page.locator('#inside')).toBeFocused();
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'pending';
      });
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await expect(owner).toHaveAttribute('tabindex', '0');
      await expect(page.locator('#inside')).toBeHidden();
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'ready';
      });
      await expect(page.locator('#inside')).toBeVisible();
      await expect(owner).toBeFocused();
      await page.keyboard.press(tab);
      await expect(page.locator('#inside')).toBeFocused();
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      await page.keyboard.press(tab);
      await expect(page.locator('#second')).toBeFocused();
      await page.keyboard.press(tab);
      await expect(page.locator('#after')).toBeFocused();
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'pending';
      });
      await expect(owner).toHaveAttribute('data-presentation', 'pending');
      await expect(page.locator('#after')).toBeFocused();
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      expect(await page.evaluate(() => window.violations)).toEqual([]);
    });

    test(`${family}/${mode}: caller-authored tabindex and role remain authoritative, including a same-value write during focus transfer`, async ({
      page,
    }) => {
      const owner = await mount(page, family, mode);
      for (const value of ['-1', '0', '3']) {
        await owner.evaluate((el, value) => {
          el.setAttribute('tabindex', value);
          el.setAttribute('role', 'region');
        }, value);
        await page.locator('#inside').focus();
        await owner.evaluate((el: LoadingRegion) => {
          el.state = 'pending';
        });
        await expect(owner).toBeFocused();
        await page.locator('#after').focus();
        await expect(owner).toHaveAttribute('tabindex', value);
        await expect(owner).toHaveAttribute('role', 'region');
        await owner.evaluate((el: LoadingRegion) => {
          el.state = 'ready';
        });
      }
      await owner.evaluate((el) => {
        el.removeAttribute('tabindex');
        el.addEventListener('focus', () => el.setAttribute('tabindex', '0'), {
          once: true,
        });
      });
      await page.locator('#inside').focus();
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'pending';
      });
      await expect(owner).toBeFocused();
      await page.locator('#after').focus();
      await expect(owner).toHaveAttribute('tabindex', '0');
    });

    test(`${family}/${mode}: redirected and detached focus releases owned attributes; repeated remounts add no stale tab stop or resources`, async ({
      page,
      browserName,
    }) => {
      const owner = await mount(page, family, mode);
      await owner.evaluate((el) =>
        el.addEventListener(
          'focus',
          () => document.getElementById('after')?.focus(),
          { once: true },
        ),
      );
      await page.locator('#inside').focus();
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'pending';
      });
      await expect(page.locator('#after')).toBeFocused();
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'ready';
      });
      for (let i = 0; i < 5; i++) {
        await page.locator('#inside').focus();
        await owner.evaluate((el: LoadingRegion) => {
          el.state = 'pending';
        });
        await expect(owner).toBeFocused();
        await owner.evaluate((el: LoadingRegion) => {
          el.remove();
          document.body.insertBefore(el, document.getElementById('after'));
          el.state = 'ready';
        });
        await expect(owner).not.toHaveAttribute('tabindex', /.*/);
        await page.locator('#before').focus();
        await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
        await expect(page.locator('#inside')).toBeFocused();
      }
      await owner.evaluate((el) => el.remove());
      await expect
        .poll(() =>
          page.evaluate(() => ({
            frames:
              Reflect.get(document, Symbol.for('dotquilt.frames.v1')) ===
              undefined,
            dots:
              Reflect.get(document, Symbol.for('dotquilt.dots.v1')) ===
              undefined,
            effects: document.getAnimations().length,
          })),
        )
        .toEqual({ frames: true, dots: true, effects: 0 });
    });
  }

for (const family of ['region', 'text'] as const)
  test(`${family}: nested owners and open/closed shadow controls retain keyboard entry and outer replacement handoff`, async ({
    page,
    browserName,
  }) => {
    const owner = await mount(page, family, 'inline');
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    for (const mode of ['open', 'closed'] as const) {
      await owner.evaluate(
        (_el, { family, mode }) => {
          const inner = document.createElement(
            family === 'region' ? 'dotquilt-region' : 'dotquilt-text-loader',
          ) as LoadingRegion;
          inner.id = 'nested-owner';
          inner.motion = 'paused';
          const widget = document.createElement('span');
          widget.id = 'shadow-widget';
          const root = widget.attachShadow({ mode });
          const button = document.createElement('button');
          button.id = 'shadow-control';
          button.textContent = 'Shadow action';
          button.addEventListener('focus', () =>
            widget.setAttribute('data-focused', 'yes'),
          );
          button.addEventListener('blur', () =>
            widget.removeAttribute('data-focused'),
          );
          root.append(button);
          inner.append(widget);
          document.getElementById('tab-content')?.replaceChildren(inner);
        },
        { family, mode },
      );
      await page.locator('#before').focus();
      await page.keyboard.press(tab);
      await expect(page.locator('#shadow-widget')).toHaveAttribute(
        'data-focused',
        'yes',
      );
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'pending';
      });
      await expect(owner).toBeFocused();
      await expect(owner).toHaveCSS('outline-style', 'solid');
      await owner.evaluate((el: LoadingRegion) => {
        el.state = 'ready';
      });
      await page.keyboard.press(tab);
      await expect(page.locator('#shadow-widget')).toHaveAttribute(
        'data-focused',
        'yes',
      );
      await expect(owner).not.toHaveAttribute('tabindex', /.*/);
      await page.keyboard.press(tab);
      await expect(page.locator('#after')).toBeFocused();
    }
  });
