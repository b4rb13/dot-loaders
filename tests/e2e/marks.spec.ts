import { expect, type Page, test } from '@playwright/test';

// The `mark` option draws squares or dashes instead of dots (design/SPEC.md,
// "Alternative marks"). Positions and motion stay the same; only the shape and
// the pitch change, so a line placeholder is two rows of its own mark tall.
const shaped = [
  'skeleton-block',
  'skeleton-line',
  'skeleton-circle',
  'skeleton-text',
] as const;
const rowPitch = { dash: 9.5, square: 8.5 } as const;

async function open(page: Page, query: string) {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

for (const mark of ['dash', 'square'] as const) {
  test(`${mark}: text lines are two rows of the mark tall, drawn with that mark`, async ({
    page,
  }) => {
    await open(page, `component=skeleton-text&mark=${mark}`);
    const lines = await page.evaluate(() =>
      [
        ...(window.e2e.decoration.shadowRoot?.querySelectorAll(
          '.lines:not(.pulse) .line',
        ) ?? []),
      ].map((line) => ({
        height: line.getBoundingClientRect().height,
        mask: getComputedStyle(line).maskImage,
      })),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.height).toBeCloseTo(2 * rowPitch[mark], 1);
      expect(line.mask).toContain('linear-gradient');
    }
  });

  for (const renderer of ['native', 'react'] as const)
    test(`${mark}: ${renderer} SSR draws the mark without JavaScript`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/static/${renderer}?state=pending&mark=${mark}`);
      const text = page.locator('dotquilt-skeleton-text');
      await expect(text).toHaveAttribute('mark', mark);
      const lines = await text.evaluate((host) =>
        [...host.querySelectorAll('[data-dotquilt-static-line]')].map(
          (line) => ({
            height: line.getBoundingClientRect().height,
            mask: getComputedStyle(line).maskImage,
          }),
        ),
      );
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.height).toBeCloseTo(2 * rowPitch[mark], 1);
        expect(line.mask).toContain('linear-gradient');
      }
      await context.close();
    });

  for (const kind of shaped)
    test(`${mark}: ${kind} looks right, paused`, async ({ page }) => {
      await open(page, `component=${kind}&mark=${mark}&motion=paused`);
      await expect(page.locator('#stage')).toHaveScreenshot(
        `${kind}-${mark}-light.png`,
      );
    });
}

test('a custom idle draws circles, squares or dashes with the host mark', async ({
  page,
}) => {
  await open(page, 'component=skeleton-block');
  const drawn = await page.evaluate(async () => {
    const { defineAnimation } = Reflect.get(window, 'e2eAnimations');
    const one = { x: 40, y: 40, size: 2.2, opacity: 1, tone: 'base' };
    const single = defineAnimation({
      contractVersion: 1,
      id: 'e2e/one-mark',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame: ({ dot }: { dot: (value: object) => void }) => dot(one),
      still: ({ dot }: { dot: (value: object) => void }) => dot(one),
    });
    const host = window.e2e.decoration as HTMLElement & {
      animations: unknown;
    };
    host.animations = { idle: single() };
    const shapes = [];
    for (const mark of ['dot', 'square', 'dash']) {
      host.setAttribute('mark', mark);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const drawn = [
        ...(host.shadowRoot?.querySelectorAll('[data-dotquilt-painter] > *') ??
          []),
      ] as SVGGraphicsElement[];
      const box = drawn[0]?.getBBox();
      shapes.push({
        mark,
        count: drawn.length,
        shape: drawn[0]?.localName,
        // Centre and size, to 0.1 px.
        box: box
          ? [
              box.x + box.width / 2,
              box.y + box.height / 2,
              box.width,
              box.height,
            ].map((value) => Math.round(value * 10) / 10)
          : [],
      });
    }
    return shapes;
  });
  expect(drawn).toEqual([
    { mark: 'dot', count: 1, shape: 'circle', box: [40, 40, 4.4, 4.4] },
    { mark: 'square', count: 1, shape: 'rect', box: [40, 40, 4, 4] },
    { mark: 'dash', count: 1, shape: 'rect', box: [40, 40, 9.4, 3.4] },
  ]);
});

// A mark's `angle` turns squares and dashes about their centre; dots ignore it.
test('a custom idle turns a dash by its angle', async ({ page }) => {
  await open(page, 'component=skeleton-block&mark=dash');
  const box = await page.evaluate(async () => {
    const { defineAnimation } = Reflect.get(window, 'e2eAnimations');
    const one = {
      x: 40,
      y: 40,
      size: 2.2,
      opacity: 1,
      tone: 'base',
      angle: Math.PI / 2,
    };
    const upright = defineAnimation({
      contractVersion: 1,
      id: 'e2e/upright',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame: ({ dot }: { dot: (value: object) => void }) => dot(one),
      still: ({ dot }: { dot: (value: object) => void }) => dot(one),
    });
    const host = window.e2e.decoration as HTMLElement & {
      animations: unknown;
    };
    host.animations = { idle: upright() };
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const r = host.shadowRoot
      ?.querySelector('[data-dotquilt-painter] > rect')
      ?.getBoundingClientRect();
    return r && [r.width, r.height].map((v) => Math.round(v * 10) / 10);
  });
  // Upright: 3.4 px wide and 9.4 px tall.
  expect(box).toEqual([3.4, 9.4]);
});

// The chart's Canvas draws each dash turned: ink lies along its turned axis,
// and none where a level dash's end would be.
test("dash: the chart's Canvas draws its dashes turned", async ({ page }) => {
  await open(page, 'component=chart-loader&mark=dash');
  const ink = await page.evaluate(async () => {
    const host = window.e2e.decoration;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const dots = Reflect.get(
      host,
      Symbol.for('dotquilt.painter.v1'),
    ).capture() as {
      x: number;
      y: number;
      opacity: number;
      tone: string;
      angle?: number;
    }[];
    const canvas = host.shadowRoot?.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const steepest = dots
      .filter((dot) => dot.tone === 'base' && dot.opacity > 0.3)
      .reduce((a, b) =>
        Math.abs(b.angle ?? 0) > Math.abs(a.angle ?? 0) ? b : a,
      );
    const angle = steepest.angle ?? 0;
    const box = canvas.getBoundingClientRect(),
      origin = host.getBoundingClientRect(),
      scale = canvas.width / box.width;
    const alpha = (dx: number, dy: number) =>
      context.getImageData(
        Math.round((origin.left + steepest.x + dx - box.left) * scale),
        Math.round((origin.top + steepest.y + dy - box.top) * scale),
        1,
        1,
      ).data[3] ?? 0;
    return {
      angle,
      along: alpha(4 * Math.cos(angle), 4 * Math.sin(angle)),
      level: alpha(4.2, 0),
    };
  });
  // Steeper than about 24 degrees, a level dash's end lies outside it.
  expect(Math.abs(ink?.angle ?? 0)).toBeGreaterThan(0.45);
  expect(ink?.along).toBeGreaterThan(0);
  expect(ink?.level).toBe(0);
});

// design/SPEC.md: a dash "on charts follows the line". Paused, the chart
// draws with SVG, so each mark's turn is readable from the page.
for (const mark of ['dash', 'square'] as const)
  test(`${mark}: a chart's ${mark === 'dash' ? 'dashes follow its line' : 'squares stay level'}`, async ({
    page,
  }) => {
    await open(page, `component=chart-loader&mark=${mark}&motion=paused`);
    const marks = await page.evaluate(() =>
      [
        ...(window.e2e.decoration.shadowRoot?.querySelectorAll(
          '[data-dotquilt-painter] > rect',
        ) ?? []),
      ].map((rect) => ({
        x:
          +(rect.getAttribute('x') ?? 0) +
          +(rect.getAttribute('width') ?? 0) / 2,
        y:
          +(rect.getAttribute('y') ?? 0) +
          +(rect.getAttribute('height') ?? 0) / 2,
        opacity: +(rect.getAttribute('opacity') ?? 0),
        angle: +(
          /rotate\(([-\d.e]+)/.exec(
            rect.getAttribute('transform') ?? '',
          )?.[1] ?? 0
        ),
      })),
    );
    expect(marks.length).toBeGreaterThan(100);
    const turned = marks.filter((m) => Math.abs(m.angle) > 1);
    if (mark === 'square') {
      expect(turned).toEqual([]);
      return;
    }
    // The line is the brightest mark of each column; where it climbs or
    // falls, its dash turns the same way (SVG angles are clockwise).
    const top = new Map<number, (typeof marks)[number]>();
    for (const m of marks)
      if (m.opacity > (top.get(m.x)?.opacity ?? 0)) top.set(m.x, m);
    const columns = [...top.keys()].sort((a, b) => a - b);
    let agree = 0,
      total = 0;
    for (let i = 2; i < columns.length - 2; i++) {
      const fall =
        (top.get(columns[i + 2] as number)?.y ?? 0) -
        (top.get(columns[i - 2] as number)?.y ?? 0);
      const angle = top.get(columns[i] as number)?.angle ?? 0;
      if (Math.abs(fall) < 9 || Math.abs(angle) < 1) continue;
      total++;
      if (Math.sign(fall) === Math.sign(angle)) agree++;
    }
    expect(total).toBeGreaterThan(3);
    expect(agree / total).toBeGreaterThan(0.8);
  });

// Chart and table fields draw on a Canvas at the mark's own pitch: a dash is
// wider than its pitch down, so rows sit closer than columns.
for (const mark of ['dot', 'dash', 'square'] as const)
  test(`${mark}: the chart field draws ${mark}s at the mark's pitch on Canvas`, async ({
    page,
  }) => {
    await open(
      page,
      `component=chart-loader${mark === 'dot' ? '' : `&mark=${mark}`}`,
    );
    const field = await page.evaluate(async () => {
      const host = window.e2e.decoration;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const dots = Reflect.get(
        host,
        Symbol.for('dotquilt.painter.v1'),
      ).capture() as {
        x: number;
        y: number;
        size: number;
        opacity: number;
        angle?: number;
      }[];
      const canvas = host.shadowRoot?.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return undefined;
      const box = canvas.getBoundingClientRect(),
        origin = host.getBoundingClientRect(),
        scale = canvas.width / box.width;
      // Alpha a few px along and across the strongest mark, measured on its
      // own axis: a chart's dashes turn to follow the line.
      const strongest = dots.reduce((a, b) => (b.opacity > a.opacity ? b : a));
      const cos = Math.cos(strongest.angle ?? 0),
        sin = Math.sin(strongest.angle ?? 0);
      const alpha = (dx: number, dy: number) =>
        context.getImageData(
          Math.round((origin.left + strongest.x + dx - box.left) * scale),
          Math.round((origin.top + strongest.y + dy - box.top) * scale),
          1,
          1,
        ).data[3] ?? 0;
      const step = (values: number[]) => {
        const sorted = [...new Set(values.map((v) => Math.round(v * 100)))]
          .sort((a, b) => a - b)
          .map((v) => v / 100);
        return Math.min(...sorted.slice(1).map((v, i) => v - (sorted[i] ?? 0)));
      };
      return {
        across: step(dots.map((dot) => dot.x)),
        down: step(dots.map((dot) => dot.y)),
        right: alpha(3.6 * cos, 3.6 * sin),
        below: alpha(-2.6 * sin, 2.6 * cos),
      };
    });
    const pitch = { dot: [9, 9], dash: [13, 9.5], square: [8.5, 8.5] }[mark];
    expect(field?.across).toBeCloseTo(pitch[0] ?? 0, 1);
    expect(field?.down).toBeCloseTo(pitch[1] ?? 0, 1);
    // A dash reaches 4.7 px either side but only 1.7 px up and down; a dot
    // and a square stay within about 2.2 px.
    if (mark === 'dash') expect(field?.right).toBeGreaterThan(0);
    else expect(field?.right).toBe(0);
    expect(field?.below).toBe(0);
  });

test('TypingDots and TextLoader draw the host mark', async ({ page }) => {
  const sizes: Record<string, number[]> = {};
  for (const mark of ['dot', 'square', 'dash'] as const) {
    await open(
      page,
      `component=typing-dots${mark === 'dot' ? '' : `&mark=${mark}`}`,
    );
    sizes[mark] = await page.evaluate(() => {
      const dot = window.e2e.decoration.shadowRoot?.querySelector('.dot');
      const box = dot?.getBoundingClientRect();
      return [box?.width ?? 0, box?.height ?? 0].map(
        (value) => Math.round(value * 10) / 10,
      );
    });
  }
  // The spec's mockup: 8 px dots, 7.2 px squares, 17.3 × 6.4 px dashes.
  expect(sizes).toEqual({
    dot: [8, 8],
    square: [7.2, 7.2],
    dash: [17.3, 6.4],
  });

  await open(page, 'component=text-loader&mark=square');
  const glyphs = await page.evaluate(() => {
    const painted = [
      ...(window.e2e.owner.shadowRoot?.querySelectorAll(
        '[data-dotquilt-painter] > *',
      ) ?? []),
    ];
    return {
      count: painted.length,
      shapes: [...new Set(painted.map((node) => node.localName))],
    };
  });
  expect(glyphs.count).toBeGreaterThan(0);
  expect(glyphs.shapes).toEqual(['rect']);
});

for (const mark of ['dash', 'square'] as const)
  for (const kind of ['chart-loader', 'table-loader', 'typing-dots'] as const)
    test(`${mark}: ${kind} looks right, paused`, async ({ page }) => {
      await open(page, `component=${kind}&mark=${mark}&motion=paused`);
      await expect(page.locator('#stage')).toHaveScreenshot(
        `${kind}-${mark}-light.png`,
      );
    });
