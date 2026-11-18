import type { LoadingRegion } from '@dotquilt-internal/core/region';
import { expect, test } from '@playwright/test';

test('a region without skeleton participants retains captured-target and cleanup semantics', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/native?mode=inline');
  await page.evaluate(() => {
    const region = document.createElement('dotquilt-region') as LoadingRegion;
    region.id = 'bare-region';
    const button = document.createElement('button');
    button.id = 'bare-button';
    button.textContent = 'Real content';
    region.append(button);
    region.update({
      state: 'pending',
      timing: { duration: 800 },
      revealTargets: [{ id: 'button', element: button }],
    });
    const events: string[] = [];
    Reflect.set(window, 'bareEvents', events);
    for (const name of [
      'dotquilt-handoff-start',
      'dotquilt-handoff-end',
      'dotquilt-handoff-cancel',
    ])
      region.addEventListener(name, (event) =>
        events.push(`${name}:${(event as CustomEvent).detail.reason ?? ''}`),
      );
    document.body.append(region);
  });
  await page.clock.runFor(50);
  await page.evaluate(() => {
    (document.getElementById('bare-region') as LoadingRegion).state = 'ready';
  });
  await page.clock.runFor(50);
  await expect(page.locator('#bare-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => {
    const region = document.getElementById('bare-region') as LoadingRegion;
    region.revealTargets = [
      ...region.revealTargets,
      {
        id: 'added',
        element: document.getElementById('bare-button') as HTMLElement,
      },
    ];
  });
  await expect(page.locator('#bare-region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => {
    (document.getElementById('bare-region') as LoadingRegion).revealTargets =
      [];
  });
  await expect(page.locator('#bare-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(await page.evaluate(() => Reflect.get(window, 'bareEvents'))).toEqual([
    'dotquilt-handoff-start:',
    'dotquilt-handoff-end:targets-changed',
  ]);
  expect(
    await page.evaluate(() => {
      const region = document.getElementById('bare-region') as LoadingRegion;
      const content =
        region.shadowRoot?.querySelector<HTMLElement>('[part=content]');
      return {
        inert: content?.inert,
        busy: content?.getAttribute('aria-busy'),
        animations: region.getAnimations({ subtree: true }).length,
      };
    }),
  ).toEqual({ inert: false, busy: 'false', animations: 0 });
  await expect(page.locator('#bare-button')).toBeVisible();
});
