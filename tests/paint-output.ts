import { expect, type Locator } from '@playwright/test';
export interface PaintedDot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  tone: 'base' | 'accent';
}
// Read actual committed primitives from the private backend seam, or legacy SVG.
export function readPaint(host: Element): readonly PaintedDot[] {
  const capture = Reflect.get(host, Symbol.for('dotquilt.painter.v1'))?.capture;
  const committed = capture?.();
  if (committed?.length) return committed;
  return Array.from(
    host.shadowRoot?.querySelectorAll('svg[data-dotquilt-painter] circle') ??
      [],
    (circle) => ({
      x: Number(circle.getAttribute('cx')),
      y: Number(circle.getAttribute('cy')),
      size: Number(circle.getAttribute('r')),
      opacity: Number(circle.getAttribute('opacity')),
      tone: circle.getAttribute('fill')?.includes('accent') ? 'accent' : 'base',
    }),
  );
}
export async function paintCount(host: Locator): Promise<number> {
  return (await host.evaluate(readPaint)).length;
}
export async function expectPaint(host: Locator): Promise<void> {
  await expect(host).toBeVisible();
  await expect.poll(() => paintCount(host)).toBeGreaterThan(0);
  await expect(host.locator('[data-dotquilt-painter]')).toBeVisible();
}
