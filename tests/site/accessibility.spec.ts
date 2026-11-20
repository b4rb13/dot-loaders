import { expect, type Page, test } from '@playwright/test';
import { pages } from './pages';

// WCAG AA checks that a script can judge, on every page of the site.

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/** Text whose contrast with what is behind it is under AA (4.5:1, 3:1 large). */
function lowContrast(): string[] {
  type Colour = { r: number; g: number; b: number; a: number };
  const parse = (value: string): Colour | undefined => {
    const parts = value.match(/rgba?\(([^)]+)\)/)?.[1]?.split(/[\s,/]+/);
    if (!parts) return undefined;
    const [r = 0, g = 0, b = 0, a = 1] = parts.filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const over = (top: Colour, bottom: Colour): Colour => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }: Colour) => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  /** The solid colour behind an element, or undefined over an image or gradient. */
  const behind = (element: Element): Colour | undefined => {
    const layers: Colour[] = [];
    for (let n: Element | null = element; n; n = n.parentElement) {
      const css = getComputedStyle(n);
      if (css.backgroundImage !== 'none') return undefined;
      const colour = parse(css.backgroundColor);
      if (colour?.a) {
        layers.push(colour);
        if (colour.a >= 1) break;
      }
    }
    let colour = parse(
      getComputedStyle(document.documentElement).backgroundColor,
    );
    if (!colour?.a) colour = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) colour = over(layer, colour);
    return colour;
  };
  const found: string[] = [];
  const seen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const element = text.parentElement;
    if (!element || seen.has(element) || !/\S/.test(text.textContent ?? ''))
      continue;
    seen.add(element);
    // Hidden, decorative or inactive text is exempt (WCAG 1.4.3).
    if (
      !element.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      }) ||
      element.closest(
        '[aria-hidden=true],[inert],[hidden],svg,:disabled,[aria-disabled=true]',
      )
    )
      continue;
    let opacity = 1;
    for (let n: Element | null = element; n; n = n.parentElement)
      opacity *= Number(getComputedStyle(n).opacity);
    const css = getComputedStyle(element);
    const background = behind(element);
    const foreground = parse(css.color);
    if (!background || !foreground) continue;
    const ink = over({ ...foreground, a: foreground.a * opacity }, background);
    const [light, dark] = [luminance(ink), luminance(background)].sort(
      (a, b) => b - a,
    ) as [number, number];
    const ratio = (light + 0.05) / (dark + 0.05);
    const size = Number.parseFloat(css.fontSize);
    const large =
      size >= 24 || (Number(css.fontWeight) >= 700 && size >= 18.66);
    if (ratio < (large ? 3 : 4.5))
      found.push(
        `${ratio.toFixed(2)}:1 ${element.localName} "${text.textContent?.trim().slice(0, 40)}"`,
      );
  }
  return found;
}

for (const scheme of ['light', 'dark'] as const)
  test(`text meets AA contrast on every page, ${scheme}`, async ({ page }) => {
    test.slow();
    // At rest: no fades in flight, so every value is measured as it settles.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    const problems: string[] = [];
    for (const path of pages) {
      await open(page, path);
      for (const problem of await page.evaluate(lowContrast))
        problems.push(`${path} ${problem}`);
    }
    expect(problems).toEqual([]);
  });

test('every form control on every page has a name', async ({ page }) => {
  test.slow();
  for (const path of pages) {
    await open(page, path);
    for (const control of await page
      .locator(
        'input:visible, select:visible, textarea:visible, button:visible',
      )
      .all())
      await expect(
        control,
        `${path}: ${await control.evaluate((e) => e.outerHTML.slice(0, 120))}`,
      ).toHaveAccessibleName(/\S/);
  }
});

test('keyboard focus is always visible', async ({ page }) => {
  for (const path of [
    '/',
    '/docs/components/loading-region/',
    '/examples/',
    '/playground/',
  ]) {
    await open(page, path);
    const hidden: string[] = [];
    let first: string | undefined;
    for (let step = 0; step < 60; step++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        let element = document.activeElement;
        while (element?.shadowRoot?.activeElement)
          element = element.shadowRoot.activeElement;
        if (!element || element === document.body) return undefined;
        const css = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          key: `${element.localName}@${Math.round(box.x)},${Math.round(box.y + scrollY)}`,
          ring:
            (css.outlineStyle !== 'none' &&
              Number.parseFloat(css.outlineWidth) > 0) ||
            css.boxShadow !== 'none',
          name: `${element.localName} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 30)}"`,
        };
      });
      if (!focus || focus.key === first) break;
      first ??= focus.key;
      if (!focus.ring) hidden.push(focus.name);
    }
    expect(hidden, path).toEqual([]);
  }
});

test('the phone menu button is the same quiet fill in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '/docs/');
    const [button, canvas] = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.sl-menu-button') as Element)
        .backgroundColor,
      getComputedStyle(document.body).backgroundColor,
    ]);
    expect(button, scheme).toBe(canvas);
  }
});

test('code in a table cell stays on one line on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/docs/theming/');
  const broken = await page
    .locator('.sl-markdown-content td code')
    .evaluateAll((codes) =>
      codes
        .filter((code) => code.getClientRects().length > 1)
        .map((code) => code.textContent),
    );
  expect(broken).toEqual([]);
});

test('the license reads as paragraphs, not 80-column lines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/license/');
  const permission = page
    .locator('.license p')
    .filter({ hasText: 'Permission is hereby granted' });
  await expect(permission).toContainText(
    'subject to the following conditions:',
  );
  expect(await permission.evaluate((p) => p.textContent?.includes('\n'))).toBe(
    false,
  );
});
