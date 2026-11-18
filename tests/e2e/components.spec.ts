import { expect, type Page, test } from '@playwright/test';
import { type Kind, kinds } from './kinds';

// Known bugs, fixed in AUDIT.md Phase 2 (item 1). Each entry keeps its test
// red-by-expectation until the fix lands; remove it with the fix.
const drawsOutsideWhenHostIsBlock = new Set<Kind>(['table-loader']);

/** CSS selector of the application content each fixture reveals. */
function contentSelector(kind: Kind) {
  if (kind === 'chart-loader') return '.chart';
  if (kind === 'table-loader') return '.table';
  if (kind === 'text-loader') return 'dotquilt-text-loader';
  return '.card';
}

/** True when the owner's default slot (the real content) is shown, not hidden by the loader. */
function contentSlotShown(page: Page) {
  return page.evaluate(() => {
    let node: Element | null =
      window.e2e.owner.shadowRoot?.querySelector('slot:not([name])') ?? null;
    if (!node) return false;
    for (; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        Number(style.opacity) === 0 ||
        (node as HTMLElement).inert
      )
        return false;
    }
    return true;
  });
}

async function open(page: Page, kind: Kind, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`/?component=${kind}${query}`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  // Let the first frames paint.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return errors;
}

/** Boxes of everything drawn in the decoration's shadow root that lie outside its own box. */
function drawingOutsideBox(page: Page) {
  return page.evaluate(() => {
    const decoration = window.e2e.decoration;
    const box = decoration.getBoundingClientRect();
    const drawn = [
      ...(decoration.shadowRoot?.querySelectorAll('svg, canvas, div, span') ??
        []),
    ]
      .filter((node) => getComputedStyle(node).visibility !== 'hidden')
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    return {
      box: { width: box.width, height: box.height },
      drawn: drawn.length,
      outside: drawn
        .filter(
          (rect) =>
            rect.left < box.left - 1 ||
            rect.top < box.top - 1 ||
            rect.right > box.right + 1 ||
            rect.bottom > box.bottom + 1,
        )
        .map((rect) => [rect.x, rect.y, rect.width, rect.height]),
    };
  });
}

function loaderEvents(page: Page) {
  return page.evaluate(() => window.e2e.events.map((event) => event.type));
}

for (const kind of kinds) {
  test.describe(kind, () => {
    test('pending: draws a placeholder inside its own box and hides content', async ({
      page,
    }) => {
      const errors = await open(page, kind);
      const layout = await drawingOutsideBox(page);
      expect(layout.box.width).toBeGreaterThan(0);
      expect(layout.box.height).toBeGreaterThan(0);
      expect(layout.drawn).toBeGreaterThan(0);
      expect(layout.outside).toEqual([]);
      if (kind !== 'text-loader') {
        // Pending content is inert: its button cannot take focus.
        const focused = await page.evaluate(() => {
          const button = window.e2e.content.querySelector('button');
          button?.focus();
          return document.activeElement === button;
        });
        expect(focused).toBe(false);
      }
      expect(await loaderEvents(page)).not.toContain('dotquilt-error');
      expect(errors).toEqual([]);
    });

    test('pending: stays inside its box when the app sets display:block', async ({
      page,
    }) => {
      test.fail(
        drawsOutsideWhenHostIsBlock.has(kind),
        'Known bug: drawing depends on :host display (AUDIT.md Phase 2)',
      );
      await open(page, kind, '&hostDisplay=block');
      expect((await drawingOutsideBox(page)).outside).toEqual([]);
    });

    test('ready: hands off to the real, interactive content', async ({
      page,
    }) => {
      const errors = await open(page, kind);
      await page.evaluate(() => {
        window.e2e.owner.state = 'ready';
      });
      await expect
        .poll(() => loaderEvents(page), { timeout: 6000 })
        .toEqual(
          expect.arrayContaining([
            expect.stringMatching(/dotquilt-handoff-(end|cancel)/),
          ]),
        );
      await expect(
        page.locator(`#stage ${contentSelector(kind)}`),
      ).toBeVisible();
      await expect.poll(() => contentSlotShown(page)).toBe(true);
      if (contentSelector(kind) === '.card') {
        const button = page.getByRole('button', { name: 'Open report' });
        await button.focus();
        await expect(button).toBeFocused();
      }
      expect(await loaderEvents(page)).not.toContain('dotquilt-error');
      expect(errors).toEqual([]);
    });

    for (const theme of ['light', 'dark'] as const)
      test(`looks right: paused pending, ${theme}`, async ({ page }) => {
        await open(page, kind, `&theme=${theme}&motion=paused`);
        await expect(page.locator('#stage')).toHaveScreenshot(
          `${kind}-pending-${theme}.png`,
        );
      });
  });
}
