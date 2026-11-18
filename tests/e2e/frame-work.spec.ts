import { expect, test } from '@playwright/test';

// While idle motion runs, each frame should only draw. Looking up the owning
// region, walking ancestors for motion restrictions and creating media
// queries belong to environment changes, not to every animation frame.
for (const kind of ['chart-loader', 'table-loader', 'text-loader'] as const)
  test(`${kind}: animation frames do no ancestor matching or media queries`, async ({
    page,
  }) => {
    await page.goto(`/?component=${kind}`);
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    const work = await page.evaluate(async () => {
      const frames = (count: number) =>
        new Promise<void>((resolve) => {
          const step = () =>
            --count ? requestAnimationFrame(step) : resolve();
          requestAnimationFrame(step);
        });
      await frames(10);
      const counts = { matches: 0, matchMedia: 0 };
      const matches = Element.prototype.matches;
      const matchMedia = window.matchMedia;
      Element.prototype.matches = function (this: Element, selector: string) {
        counts.matches++;
        return matches.call(this, selector);
      } as typeof matches;
      window.matchMedia = (query: string) => {
        counts.matchMedia++;
        return matchMedia.call(window, query);
      };
      await frames(30);
      Element.prototype.matches = matches;
      window.matchMedia = matchMedia;
      return counts;
    });
    expect(work).toEqual({ matches: 0, matchMedia: 0 });
  });
