import { expect, type Page, test } from '@playwright/test';

// The default handoff (design/SPEC.md, "take shape, then hand over"): marks
// travel to the real content's shape, then the content wipes in along a soft
// front and the marks leave where it passes them. Each test slows the handoff
// to 4 s and reads the page part-way through.

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}
interface Sample {
  /** Visible marks, relative to the owner's box. */
  readonly marks: readonly (readonly [number, number])[];
  /** Text line boxes of the element with id `text`, relative to the owner. */
  readonly lines: readonly Box[];
  readonly width: number;
  readonly sizes: Record<string, readonly [number, number]>;
}

/**
 * Builds `html` in the stage, hands the element with id `owner` over in 4 s,
 * and samples it `at` ms after the handoff starts.
 */
async function sample(
  page: Page,
  html: string,
  at: number,
  sizes: readonly string[] = [],
): Promise<Sample> {
  return page.evaluate(
    async ({ html, at, sizes }) => {
      const stage = document.getElementById('stage') as HTMLElement;
      stage.replaceChildren();
      stage.insertAdjacentHTML('beforeend', html);
      const owner = document.getElementById('owner') as HTMLElement & {
        update(patch: object): void;
      };
      owner.update({
        state: 'pending',
        cycle: 'test',
        timing: { duration: 4000 },
      });
      for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
      const started = new Promise((resolve) =>
        owner.addEventListener('dotquilt-handoff-start', resolve, {
          once: true,
        }),
      );
      owner.update({ state: 'ready' });
      await started;
      await new Promise((resolve) => setTimeout(resolve, at));
      const origin = owner.getBoundingClientRect();
      const root = owner.shadowRoot as ShadowRoot;
      const layer =
        root.querySelector('[data-dotquilt-morph]') ??
        root.querySelector('[data-dotquilt-painter]');
      const marks = [...(layer?.children ?? [])]
        .filter((mark) => Number(mark.getAttribute('opacity')) > 0.05)
        .map((mark) => {
          const box = mark.getBoundingClientRect();
          return [
            box.left + box.width / 2 - origin.left,
            box.top + box.height / 2 - origin.top,
          ] as const;
        });
      const text = document.getElementById('text') ?? owner;
      const range = document.createRange();
      const lines: Box[] = [];
      for (const node of text?.childNodes ?? []) {
        range.selectNodeContents(node);
        for (const rect of range.getClientRects())
          lines.push({
            left: rect.left - origin.left,
            top: rect.top - origin.top,
            right: rect.right - origin.left,
            bottom: rect.bottom - origin.top,
          });
      }
      return {
        marks,
        lines,
        width: origin.width,
        sizes: Object.fromEntries(
          sizes.map((id) => {
            const box = document.getElementById(id)?.getBoundingClientRect();
            return [id, [box?.width ?? 0, box?.height ?? 0]];
          }),
        ),
      };
    },
    { html, at, sizes },
  );
}
const within = (box: Box, [x, y]: readonly [number, number], slack: number) =>
  x >= box.left - slack &&
  x <= box.right + slack &&
  y >= box.top - slack &&
  y <= box.bottom + slack;

const paragraph = (dir = 'ltr') =>
  `<dotquilt-region id="owner" dir="${dir}" aria-label="Story" style="display:block;width:320px"><dotquilt-skeleton-text slot="placeholder" lines="4"></dotquilt-skeleton-text><p id="text" style="margin:0;font:15px/24px sans-serif">Placeholders hold the shape of your content while it loads, then hand over to it without a jump, so the page keeps its layout.</p></dotquilt-region>`;

test('skeleton lines take the length and place of each real text line before it appears', async ({
  page,
}) => {
  await open(page);
  // Travel ends by 54%; at 62% the front has crossed only the first fifth.
  const { marks, lines } = await sample(page, paragraph(), 2480);
  expect(lines.length).toBeGreaterThanOrEqual(3);
  expect(marks.length).toBeGreaterThan(40);
  // Every mark sits on a real line, not where the skeleton drew it, and
  // every line has marks: a skeleton line for each text line.
  const stray = marks.filter(
    (mark) => !lines.some((line) => within(line, mark, 6)),
  );
  const bare = lines.filter(
    (line) => !marks.some((mark) => within(line, mark, 6)),
  );
  expect({ stray, bare }).toEqual({ stray: [], bare: [] });
});

for (const dir of ['ltr', 'rtl'] as const)
  test(`the content wipes in from the ${dir === 'ltr' ? 'left' : 'right'} in ${dir} text, and the marks leave where it passes`, async ({
    page,
  }) => {
    await open(page);
    const { marks, width } = await sample(page, paragraph(dir), 3000);
    const start = (x: number) => (dir === 'ltr' ? x : width - x);
    // At 75% the front has passed the first ~150 px from the start edge.
    expect(marks.some(([x]) => start(x) > width - 100)).toBe(true);
    expect(marks.some(([x]) => start(x) < 100)).toBe(false);
  });

test('a placeholder bubble grows to the message bubble, and typing dots unroll into its lines', async ({
  page,
}) => {
  await open(page);
  const bubble =
    'display:inline-block;padding:10px 14px;border-radius:12px;background:#eef1f5;font:15px/22px sans-serif';
  const html = `<dotquilt-region id="owner" aria-label="Reply" style="display:block;width:360px"><div slot="placeholder"><div id="dots-bubble" style="${bubble}"><dotquilt-typing-dots></dotquilt-typing-dots></div></div><div id="message" style="${bubble}"><span id="text">Sure, I moved the review to Thursday at 10:00 in the morning.</span></div></dotquilt-region>`;
  const { marks, lines, sizes } = await sample(page, html, 2480, [
    'dots-bubble',
    'message',
  ]);
  const [w0 = 0, h0 = 0] = sizes['dots-bubble'] ?? [];
  const [w1 = 0, h1 = 0] = sizes.message ?? [];
  expect(w1).toBeGreaterThan(150);
  expect(w0).toBeCloseTo(w1, 0);
  expect(h0).toBeCloseTo(h1, 0);
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(marks.length).toBeGreaterThan(20);
  for (const mark of marks)
    expect(lines.some((line) => within(line, mark, 6))).toBe(true);
});

test('a circle and lines become the avatar and the name beside it', async ({
  page,
}) => {
  await open(page);
  const html = `<dotquilt-region id="owner" aria-label="Profile" style="display:block;width:320px"><div slot="placeholder" style="display:flex;gap:14px;align-items:center"><dotquilt-skeleton-circle style="width:40px;flex:none"></dotquilt-skeleton-circle><div style="flex:1;display:grid;gap:8px"><dotquilt-skeleton-line style="width:70%"></dotquilt-skeleton-line><dotquilt-skeleton-line style="width:45%"></dotquilt-skeleton-line></div></div><div style="display:flex;gap:14px;align-items:center"><div id="avatar" style="width:56px;height:56px;border-radius:50%;background:#c9d6df;flex:none"></div><div id="text" style="font:15px/22px sans-serif">Ana Kovač<br>Design lead</div></div></dotquilt-region>`;
  const { marks, lines } = await sample(page, html, 2000, ['avatar']);
  const avatar = await page.evaluate(() => {
    const owner = document.getElementById('owner')?.getBoundingClientRect();
    const box = document.getElementById('avatar')?.getBoundingClientRect();
    return owner && box
      ? {
          left: box.left - owner.left,
          top: box.top - owner.top,
          right: box.right - owner.left,
          bottom: box.bottom - owner.top,
        }
      : undefined;
  });
  if (!avatar) throw new Error('no avatar');
  // The circle grew from 40 px to the 56 px avatar: its marks fill the avatar.
  const onAvatar = marks.filter((mark) => within(avatar, mark, 2));
  expect(onAvatar.length).toBeGreaterThan(12);
  expect(Math.max(...onAvatar.map(([, y]) => y))).toBeGreaterThan(
    avatar.bottom - 12,
  );
  const stray = marks.filter(
    (mark) =>
      !within(avatar, mark, 4) && !lines.some((line) => within(line, mark, 6)),
  );
  expect({ stray, avatar, lines }).toEqual({ stray: [], avatar, lines });
});

test('a plain TableLoader becomes the text of each real cell', async ({
  page,
}) => {
  await open(page);
  const cells = [
    ['Atlas redesign', '24', 'Live'],
    ['Billing export', '8', 'Review'],
    ['Search index', '13', 'Live'],
  ];
  const html = `<dotquilt-region id="owner" aria-label="Projects" style="display:block;width:340px"><dotquilt-table-loader slot="placeholder" rows="3" style="height:120px"></dotquilt-table-loader><table id="text" style="width:100%;border-collapse:collapse;font:14px/40px sans-serif">${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table></dotquilt-region>`;
  const { marks } = await sample(page, html, 2480);
  // The table's text runs, cell by cell.
  const runs = await page.evaluate(() => {
    const owner = document.getElementById('owner')?.getBoundingClientRect();
    return [...document.querySelectorAll('#text td')].map((cell) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      const box = range.getBoundingClientRect();
      return {
        left: box.left - (owner?.left ?? 0),
        top: box.top - (owner?.top ?? 0),
        right: box.right - (owner?.left ?? 0),
        bottom: box.bottom - (owner?.top ?? 0),
      };
    });
  });
  expect(marks.length).toBeGreaterThan(20);
  for (const mark of marks)
    expect(runs.some((run) => within(run, mark, 6))).toBe(true);
});

test('TextLoader marks take the real characters before the text wipes in', async ({
  page,
}) => {
  await open(page);
  const html = `<dotquilt-text-loader id="owner" style="font:500 34px/1.1 sans-serif">$48,120</dotquilt-text-loader>`;
  const { marks, lines } = await sample(page, html, 2200);
  expect(marks.length).toBeGreaterThan(40);
  for (const mark of marks)
    expect(lines.some((line) => within(line, mark, 3))).toBe(true);
});

test('the morph cleans up after itself and the next loading period starts fresh', async ({
  page,
}) => {
  await open(page);
  const result = await page.evaluate(async () => {
    const stage = document.getElementById('stage') as HTMLElement;
    stage.replaceChildren();
    stage.insertAdjacentHTML(
      'beforeend',
      '<dotquilt-region id="owner" aria-label="Story" style="display:block;width:300px"><div slot="placeholder"><dotquilt-skeleton-block id="block" style="height:60px"></dotquilt-skeleton-block><dotquilt-typing-dots id="dots"></dotquilt-typing-dots></div><p style="margin:0">Ready.</p></dotquilt-region>',
    );
    const owner = document.getElementById('owner') as HTMLElement & {
      update(patch: object): void;
    };
    const events: string[] = [];
    for (const type of ['dotquilt-handoff-start', 'dotquilt-handoff-end'])
      owner.addEventListener(type, (event) =>
        events.push(
          `${type}:${(event as CustomEvent<{ animation?: string; reason?: string }>).detail.animation ?? ''}`,
        ),
      );
    owner.update({ state: 'pending', cycle: 'one', timing: { duration: 300 } });
    for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    const ended = new Promise((resolve) =>
      owner.addEventListener('dotquilt-handoff-end', resolve, { once: true }),
    );
    let during = false;
    owner.addEventListener(
      'dotquilt-handoff-start',
      () => {
        during = !!owner.shadowRoot?.querySelector('[data-dotquilt-morph]');
      },
      { once: true },
    );
    owner.update({ state: 'ready' });
    await ended;
    const root = owner.shadowRoot as ShadowRoot;
    const after = {
      overlay: root.querySelectorAll('[data-dotquilt-morph]').length,
      layerAnimations: root.getAnimations().length,
      hidden: ['block', 'dots'].map(
        (id) => document.getElementById(id)?.getAnimations().length,
      ),
      ledger: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger'))?.dots,
    };
    owner.update({ state: 'pending', cycle: 'two' });
    for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
    return {
      during,
      after,
      events,
      visible: ['block', 'dots'].map(
        (id) =>
          getComputedStyle(document.getElementById(id) as Element).visibility,
      ),
    };
  });
  expect(result.during).toBe(true);
  expect(result.after).toEqual({
    overlay: 0,
    layerAnimations: 0,
    hidden: [0, 0],
    ledger: undefined,
  });
  expect(result.events).toEqual([
    'dotquilt-handoff-start:dotquilt/morph',
    'dotquilt-handoff-end:dotquilt/morph',
  ]);
  expect(result.visible).toEqual(['visible', 'visible']);
});
