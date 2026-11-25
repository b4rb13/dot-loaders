import { expect, type Page, test } from '@playwright/test';

// Loaders take their content's size: a pending TextLoader keeps its line's
// height, a region is as tall as its content once it has handed over, and the
// Skeleton page's line-height recipe puts each line where a line of text sits.

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

const region = (placeholder = '') =>
  `<dotquilt-region id="region" aria-label="Summary"${placeholder}><dotquilt-skeleton-text slot="placeholder" lines="8" style="height:auto"></dotquilt-skeleton-text><p id="content" style="margin:0">One short line.</p></dotquilt-region>`;

for (const [name, timing] of [
  ['after the handoff', undefined],
  ['at once with no handoff (an error)', { duration: 0 }],
] as const)
  test(`a region is as tall as its content once ready, ${name}`, async ({
    page,
  }) => {
    await open(page);
    await build(page, region(' state="pending"'));
    const heights = await page.evaluate(async (timing) => {
      const owner = document.getElementById('region') as HTMLElement & {
        update(patch: object): void;
      };
      const height = (id: string) =>
        document.getElementById(id)?.getBoundingClientRect().height;
      const pending = height('region');
      let handoff: number | undefined;
      owner.addEventListener(
        'dotquilt-handoff-start',
        () => {
          handoff = height('region');
        },
        { once: true },
      );
      const ended = new Promise((resolve) =>
        owner.addEventListener('dotquilt-handoff-end', resolve, {
          once: true,
        }),
      );
      owner.update({ state: 'ready', ...(timing ? { timing } : {}) });
      await ended;
      await new Promise(requestAnimationFrame);
      return {
        pending,
        handoff,
        ready: height('region'),
        content: height('content'),
      };
    }, timing);
    // The placeholder is the taller one, and keeps its place while the
    // handoff reads it.
    expect(heights.pending).toBeGreaterThan((heights.content ?? 0) + 50);
    expect(heights.handoff).toBe(heights.pending);
    expect(heights.ready).toBe(heights.content);
  });

// No handoff runs here, so the placeholder stops taking space at once. WebKit
// once kept the region at the placeholder's height (the frame's percentage
// min-height held the old row size).
test('a region is as tall as its content once refreshing after pending', async ({
  page,
}) => {
  await open(page);
  await build(page, region(' state="pending"'));
  const heights = await page.evaluate(async () => {
    const owner = document.getElementById('region') as HTMLElement & {
      update(patch: object): void;
    };
    const height = (id: string) =>
      document.getElementById(id)?.getBoundingClientRect().height;
    const pending = height('region');
    owner.update({ state: 'refreshing' });
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
    return {
      pending,
      presentation: owner.dataset.presentation,
      refreshing: height('region'),
      content: height('content'),
    };
  });
  expect(heights.pending).toBeGreaterThan((heights.content ?? 0) + 50);
  expect(heights.presentation).toBe('refreshing');
  expect(heights.refreshing).toBe(heights.content);
});

for (const state of ['ready', 'refreshing'] as const)
  test(`a region that starts ${state} is as tall as its content`, async ({
    page,
  }) => {
    await open(page);
    await build(page, region(` state="${state}"`));
    const heights = await page.evaluate(() => ({
      region: document.getElementById('region')?.getBoundingClientRect().height,
      content: document.getElementById('content')?.getBoundingClientRect()
        .height,
    }));
    expect(heights.region).toBe(heights.content);
  });

for (const mark of ['dot', 'square', 'dash'] as const)
  test(`the Skeleton page's recipe puts each SkeletonText line on a line of text (${mark})`, async ({
    page,
  }) => {
    await open(page);
    // apps/site/src/content/docs/docs/components/skeleton.mdx
    const line = { dot: 18, square: 17, dash: 19 }[mark];
    await build(
      page,
      `<style>.excerpt dotquilt-skeleton-text{--line:${line}px;gap:calc(1lh - var(--line));margin-block:calc((1lh - var(--line)) / 2)}</style><div class="excerpt" style="display:flex;align-items:flex-start;gap:16px;width:360px;font:16px/1.5 sans-serif"><dotquilt-skeleton-text id="lines" mark="${mark}" lines="3" style="flex:1"></dotquilt-skeleton-text><p id="text" style="flex:1;margin:0">Placeholders hold the shape of your content while it loads.</p></div>`,
    );
    const result = await page.evaluate(() => {
      const host = document.getElementById('lines') as HTMLElement;
      const centres = (selector: string) =>
        [...(host.shadowRoot?.querySelectorAll(selector) ?? [])].map((line) => {
          const box = line.getBoundingClientRect();
          return box.top + box.height / 2;
        });
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('text') as Node);
      const text = [...range.getClientRects()].map(
        (box) => box.top + box.height / 2,
      );
      const css = getComputedStyle(host);
      return {
        lines: centres('.lines:not(.pulse,.lift) .line'),
        glow: centres('.lines.pulse .line'),
        text,
        height:
          host.getBoundingClientRect().height +
          Number.parseFloat(css.marginTop) +
          Number.parseFloat(css.marginBottom),
        lineHeight: Number.parseFloat(css.lineHeight),
        drawn: host.shadowRoot?.querySelector('.line')?.getBoundingClientRect()
          .height,
      };
    });
    expect(result.drawn).toBe(line);
    expect(result.text.length).toBeGreaterThanOrEqual(3);
    expect(result.lines).toHaveLength(3);
    for (const [i, centre] of result.lines.entries()) {
      expect(Math.abs(centre - (result.text[i] ?? 0))).toBeLessThan(1);
      expect(Math.abs(centre - (result.glow[i] ?? 0))).toBeLessThan(1);
    }
    expect(result.height).toBeCloseTo(3 * result.lineHeight, 1);
  });
