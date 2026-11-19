import { expect, type Page, test } from '@playwright/test';

// The refresh cue (design/SPEC.md): while a region refreshes, a row of marks
// sits just above its top edge, the glow drifts along it once, and the
// content stays where it is, visible and usable. An app's own
// refresh-indicator replaces it.

async function refreshing(page: Page, indicator = false) {
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await page.evaluate((indicator) => {
    const region = window.e2e.owner as HTMLElement & {
      update(patch: object): void;
    };
    if (indicator)
      region.insertAdjacentHTML(
        'beforeend',
        '<span slot="refresh-indicator" id="own">Updating…</span>',
      );
    region.update({ state: 'ready', timing: { duration: 0 } });
  }, indicator);
  await expect(page.locator('.owner')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await page.evaluate(() =>
    (window.e2e.owner as HTMLElement & { update(patch: object): void }).update({
      state: 'refreshing',
    }),
  );
  await expect(page.locator('.owner')).toHaveAttribute(
    'data-presentation',
    'refreshing',
  );
}
const thread = (page: Page) =>
  page.evaluate(() => {
    const region = window.e2e.owner;
    const element = region.shadowRoot?.querySelector<HTMLElement>('.thread');
    const box = element?.getBoundingClientRect();
    const own = region.getBoundingClientRect();
    return {
      visible: !!element?.checkVisibility(),
      above: box ? Math.round(own.top - box.bottom) : null,
      width: box ? Math.round(box.width) : null,
      regionWidth: Math.round(own.width),
      animations:
        element?.parentElement
          ?.getAnimations({ subtree: true })
          .map((animation) => {
            const timing = animation.effect?.getTiming();
            return `${timing?.duration}x${timing?.iterations}`;
          }) ?? [],
    };
  });

test('a refreshing region shows a row of marks just above it, and the content stays put and usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const before = await page.evaluate(async () => {
    const region = window.e2e.owner as HTMLElement & {
      update(patch: object): void;
    };
    region.update({ state: 'ready', timing: { duration: 0 } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    return window.e2e.content.getBoundingClientRect().toJSON();
  });
  await page.evaluate(() =>
    (window.e2e.owner as HTMLElement & { update(patch: object): void }).update({
      state: 'refreshing',
    }),
  );
  await expect(page.locator('.owner')).toHaveAttribute(
    'data-presentation',
    'refreshing',
  );
  const cue = await thread(page);
  expect(cue.visible).toBe(true);
  // Just above the top edge, across the region's width.
  expect(cue.above).toBe(6);
  expect(cue.width).toBe(cue.regionWidth);
  // The glow drifts along it once, inside the 4-second motion limit.
  expect(cue.animations).toContain('2800x1');
  const after = await page.evaluate(() => ({
    box: window.e2e.content.getBoundingClientRect().toJSON(),
    inert: window.e2e.content.closest('[inert]') !== null,
  }));
  expect(after).toEqual({ box: before, inert: false });
  await page.getByRole('button', { name: 'Open report' }).click();
  // Ready again: the cue goes.
  await page.evaluate(() =>
    (window.e2e.owner as HTMLElement & { update(patch: object): void }).update({
      state: 'ready',
    }),
  );
  await expect(page.locator('.owner')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect((await thread(page)).visible).toBe(false);
});

test('with reduced motion the row rests: no fade and no glow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await refreshing(page);
  const cue = await thread(page);
  expect(cue.visible).toBe(true);
  expect(cue.animations).toEqual([]);
});

test("an app's own refresh indicator replaces the row of marks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await refreshing(page, true);
  await expect(page.locator('#own')).toBeVisible();
  expect((await thread(page)).visible).toBe(false);
});

test('in forced colours the row is a dotted line', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await refreshing(page);
  const line = await page.evaluate(() => {
    const root = window.e2e.owner.shadowRoot;
    const marks = root?.querySelector('.thread:not(.glow)');
    const glow = root?.querySelector('.glow');
    return {
      style: marks ? getComputedStyle(marks).borderTopStyle : null,
      glow: glow ? getComputedStyle(glow).display : null,
    };
  });
  expect(line).toEqual({ style: 'dotted', glow: 'none' });
});
