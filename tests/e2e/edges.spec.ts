import { expect, type Locator, type Page, test } from '@playwright/test';

// Marks are drawn whole: a line ends on its last whole mark, a circle's edge
// shows no slivers of the marks it cuts, and TextLoader's glyph marks never
// run into each other.

async function open(page: Page) {
  // No idle glow, so the pixels are the resting marks.
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

/** How dark each pixel column (or ring) is: 0 is the white page, 1 black. */
async function darkness(page: Page, target: Locator) {
  const png = (await target.screenshot()).toString('base64');
  return page.evaluate(async (png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes]));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext(
      '2d',
    ) as OffscreenCanvasRenderingContext2D;
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(
      0,
      0,
      bitmap.width,
      bitmap.height,
    );
    const pixels: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        row.push(
          1 -
            ((data[i] ?? 255) + (data[i + 1] ?? 255) + (data[i + 2] ?? 255)) /
              765,
        );
      }
      pixels.push(row);
    }
    return pixels;
  }, png);
}

test('a skeleton line ends on its last whole mark, not a mark cut in half', async ({
  page,
}) => {
  await open(page);
  // Ten whole 9 px tiles and half of an eleventh.
  await build(
    page,
    '<div style="background:#fff;padding:0"><dotquilt-skeleton-line id="line" style="width:94.5px"></dotquilt-skeleton-line></div>',
  );
  const pixels = await darkness(page, page.locator('#line'));
  const scale = (pixels[0]?.length ?? 0) / 94.5;
  const columns = (from: number, to: number) =>
    Math.max(
      ...pixels.flatMap((row) =>
        row.slice(Math.floor(from * scale), Math.ceil(to * scale)),
      ),
    );
  // The tenth mark is there; nothing of the eleventh is.
  expect(columns(83, 88)).toBeGreaterThan(0.08);
  expect(columns(90.5, 94.5)).toBeLessThan(0.01);
});

test('a skeleton circle shows no slivers of the marks its edge cuts', async ({
  page,
}) => {
  await open(page);
  await build(
    page,
    '<div style="background:#fff;padding:0;width:48px"><dotquilt-skeleton-circle id="circle" style="width:48px;height:48px"></dotquilt-skeleton-circle></div>',
  );
  const pixels = await darkness(page, page.locator('#circle'));
  const size = pixels.length;
  const centre = size / 2,
    radius = size / 2;
  let inner = 0,
    ring = 0;
  for (const [y, row] of pixels.entries())
    for (const [x, value] of row.entries()) {
      const d = Math.hypot(x + 0.5 - centre, y + 0.5 - centre);
      if (d < radius * 0.7) inner = Math.max(inner, value);
      else if (d > radius - (1.5 * size) / 48 && d < radius)
        ring = Math.max(ring, value);
    }
  expect(inner).toBeGreaterThan(0.08);
  // A mark cut by the edge would be as dark as one inside.
  expect(ring).toBeLessThan(inner * 0.5);
});

test('TextLoader glyph marks stay apart at large sizes, in every mark style', async ({
  page,
}) => {
  await open(page);
  for (const mark of ['dot', 'square', 'dash'] as const) {
    await build(
      page,
      `<dotquilt-text-loader id="text" mark="${mark}" style="font:500 40px/1.1 sans-serif">$48,120</dotquilt-text-loader>`,
    );
    const marks = await page.evaluate(() => {
      const text = document.getElementById('text') as HTMLElement & {
        update(patch: object): void;
      };
      text.update({ state: 'pending', cycle: 'still' });
      return new Promise<{ x: number; y: number; w: number; h: number }[]>(
        (resolve) =>
          setTimeout(() => {
            const layer = text.shadowRoot?.querySelector(
              '[data-dotquilt-painter]',
            );
            resolve(
              [...(layer?.children ?? [])]
                .filter((mark) => Number(mark.getAttribute('opacity')) > 0.2)
                .map((mark) => {
                  const box = mark.getBoundingClientRect();
                  return { x: box.x, y: box.y, w: box.width, h: box.height };
                }),
            );
          }, 300),
      );
    });
    expect(marks.length).toBeGreaterThan(30);
    // No two strong marks overlap.
    const overlaps = marks.filter((a, i) =>
      marks.some(
        (b, j) =>
          j > i &&
          a.x < b.x + b.w - 0.25 &&
          b.x < a.x + a.w - 0.25 &&
          a.y < b.y + b.h - 0.25 &&
          b.y < a.y + a.h - 0.25,
      ),
    );
    expect({ mark, overlaps: overlaps.length }).toEqual({ mark, overlaps: 0 });
  }
});
