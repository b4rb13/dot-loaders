import { expect, type Page, test } from '@playwright/test';

// Loaders take their content's size: a pending TextLoader keeps its line's
// height.

async function open(page: Page) {
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
}

async function build(page: Page, html: string) {
  await page.evaluate((html) => {
    const stage = document.getElementById('stage') as HTMLElement;
    stage.replaceChildren();
    stage.insertAdjacentHTML('beforeend', html);
  }, html);
  for (let i = 0; i < 10; i++)
    await page.evaluate(() => new Promise(requestAnimationFrame));
}

for (const lineHeight of ['1.5', '1'])
  test(`a pending TextLoader in a line of text keeps the line's height (line-height ${lineHeight})`, async ({
    page,
  }) => {
    await open(page);
    // The value arrives later: while pending the loader has only its mask.
    await build(
      page,
      `<p id="line" style="margin:0;font:28px/${lineHeight} sans-serif">Revenue <dotquilt-text-loader id="value" mask="$00,000" style="font:inherit"></dotquilt-text-loader> this month</p><p id="plain" style="margin:0;font:28px/${lineHeight} sans-serif">Revenue $48,120 this month</p>`,
    );
    const heights = await page.evaluate(async () => {
      const value = document.getElementById('value') as HTMLElement & {
        update(patch: object): void;
      };
      const height = (id: string) =>
        document.getElementById(id)?.getBoundingClientRect().height;
      const frames = async (count: number) => {
        for (let i = 0; i < count; i++)
          await new Promise(requestAnimationFrame);
      };
      value.update({ state: 'pending', timing: { duration: 0 } });
      await frames(5);
      const pending = height('line');
      value.textContent = '$48,120';
      value.update({ state: 'ready' });
      await frames(5);
      return { plain: height('plain'), pending, ready: height('line') };
    });
    expect(heights.pending).toBe(heights.plain);
    expect(heights.ready).toBe(heights.plain);
  });
