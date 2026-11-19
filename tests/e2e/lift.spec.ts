import { expect, test } from '@playwright/test';

// Pointer lift (design/SPEC.md): every loader lights the marks within 56 px of
// the pointer in the accent, as a skeleton's lift layer does. The marks
// themselves don't move or grow.

for (const kind of ['text-loader', 'chart-loader'] as const)
  test(`${kind}: the pointer lights the marks around it without moving them`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?component=region');
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    await page.evaluate((kind) => {
      const stage = document.getElementById('stage') as HTMLElement;
      stage.replaceChildren();
      // A near-still glow, so the frames before and after the pointer match.
      stage.insertAdjacentHTML(
        'beforeend',
        kind === 'text-loader'
          ? '<dotquilt-text-loader id="host" pointer-response="lift" speed="0.01" style="font:500 40px/1.1 sans-serif">$48,120</dotquilt-text-loader>'
          : '<dotquilt-chart-loader id="host" pointer-response="lift" speed="0.01" style="display:block;width:320px;height:160px"></dotquilt-chart-loader>',
      );
      (
        document.getElementById('host') as HTMLElement & {
          update(patch: object): void;
        }
      ).update({ state: 'pending', cycle: 'lift' });
    }, kind);
    const host = page.locator('#host');
    await expect(host).toHaveAttribute('data-moving', '');
    const read = () =>
      host.evaluate((element) => {
        const capture = Reflect.get(
          element,
          Symbol.for('dotquilt.painter.v1'),
        )?.capture;
        const dots: {
          x: number;
          y: number;
          size: number;
          opacity: number;
          tone: string;
        }[] =
          capture?.() ??
          [
            ...(element.shadowRoot?.querySelectorAll(
              '[data-dotquilt-painter] circle',
            ) ?? []),
          ].map((circle) => ({
            x: Number(circle.getAttribute('cx')),
            y: Number(circle.getAttribute('cy')),
            size: Number(circle.getAttribute('r')),
            opacity: Number(circle.getAttribute('opacity')),
            tone: circle.getAttribute('fill')?.includes('accent')
              ? 'accent'
              : 'base',
          }));
        return dots.map((dot) => ({
          ...dot,
          x: Math.round(dot.x * 10) / 10,
          y: Math.round(dot.y * 10) / 10,
          size: Math.round(dot.size * 100) / 100,
        }));
      });
    await page.waitForTimeout(300);
    const before = await read();
    const box = await host.boundingBox();
    if (!box) throw new Error('no box');
    const pointer = { x: box.width * 0.45, y: box.height * 0.5 };
    await page.mouse.move(box.x + pointer.x, box.y + pointer.y);
    await page.waitForTimeout(300);
    const after = await read();
    const key = (dot: { x: number; y: number; tone: string }) =>
      `${dot.x},${dot.y},${dot.tone}`;
    const was = new Set(before.map(key));
    // The base marks are where they were, at the same size.
    const base = (dots: typeof before) =>
      dots
        .filter((dot) => dot.tone === 'base')
        .map((dot) => `${dot.x},${dot.y},${dot.size}`)
        .sort();
    expect(base(after)).toEqual(base(before));
    // New accent marks sit within the lift's 56 px of the pointer.
    const lit = after.filter(
      (dot) => dot.tone === 'accent' && !was.has(key(dot)),
    );
    expect(lit.length).toBeGreaterThan(5);
    expect(Math.max(...lit.map((dot) => dot.opacity))).toBeGreaterThan(0.4);
    for (const dot of lit)
      expect(
        Math.hypot(dot.x - pointer.x, dot.y - pointer.y),
      ).toBeLessThanOrEqual(57);
  });
