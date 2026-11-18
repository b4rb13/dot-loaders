import { media } from './dom.js';
import { lease } from './ledger.js';
import { curves, restOpacity } from './marks.js';

/** How a skeleton leaves during a region handoff. Region owns time, restrictions and cleanup. */
export type SkeletonDeparture = (
  duration: number,
  easing: string | undefined,
  own: (animation: Animation) => void,
  invalidate: () => void,
) => () => void;

/** How the marks leave: vertical drift (negative is up) and how much they shrink. */
export interface Departure {
  readonly driftPx: number;
  readonly shrink: number;
}
/** Each band of marks takes this share of the handoff; later bands start later. */
const exitWindow = 0.5;
export const skeletonHandoff: unique symbol = Symbol(
  'dotquilt.skeleton-handoff',
);

/** The offset of a repeating tile of `tile` px placed at `position` in `box` px. */
function gridOffset(position: string, box: number, tile: number): number {
  const value = parseFloat(position) || 0;
  const px = position.trim().endsWith('%')
    ? (value / 100) * (box - tile)
    : value;
  return tile > 0 ? ((px % tile) + tile) % tile : 0;
}

/**
 * The marks leave from left to right (design/SPEC.md): the field is cut into
 * vertical bands, and each band's marks dim, shrink and drift over half the
 * handoff, starting later the further right the band is. No per-dot loop.
 */
export function dissolveSkeleton(
  host: HTMLElement,
  duration: number,
  easing: string | undefined,
  departure: Departure,
  own: (animation: Animation) => void,
  invalidate: () => void,
  report: (code: string) => void,
): { dispose(): void; check(): void } {
  const root = host.shadowRoot;
  const win = host.ownerDocument.defaultView;
  if (!root || !win || media(win, '(forced-colors: active)'))
    return { dispose() {}, check() {} };
  const surfaces = [...root.querySelectorAll<HTMLElement>('.surface')].filter(
    (surface) => !surface.closest('.pulse'),
  );
  const bounds = host.getBoundingClientRect();
  const measure = (surface: HTMLElement, bounds: DOMRect) => {
    const box = surface.getBoundingClientRect();
    const css = win.getComputedStyle(surface);
    const gap = parseFloat(css.backgroundSize);
    return {
      size: parseFloat(css.getPropertyValue('--s')) || gap / 2,
      x: box.left - bounds.left,
      y: box.top - bounds.top,
      width: box.width,
      height: box.height,
      gap,
      // Where the CSS grid starts, so the fields line up with the static marks.
      offsetX: gridOffset(css.backgroundPositionX, box.width, gap),
      offsetY: gridOffset(css.backgroundPositionY, box.height, gap),
    };
  };
  const shapes = surfaces.map((surface) => measure(surface, bounds));
  if (
    !shapes.length ||
    shapes.length > 50 ||
    shapes.some(
      (shape) =>
        ![shape.x, shape.y, shape.width, shape.height, shape.gap].every(
          Number.isFinite,
        ) || shape.gap < 1,
    )
  )
    throw new TypeError();
  const count = shapes.reduce(
    (sum, shape) =>
      sum +
      Math.ceil(shape.width / shape.gap) * Math.ceil(shape.height / shape.gap),
    0,
  );
  const doc = host.ownerDocument;
  const budget = lease(doc, () => {});
  if (!budget.set('dots', count)) {
    budget.close();
    report('dot-limit');
    return { dispose() {}, check() {} };
  }
  const node = (tag: string, attributes: Record<string, string | number>) => {
    const element = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes))
      element.setAttribute(key, String(value));
    return element;
  };
  const svg = node('svg', {
    'aria-hidden': 'true',
    'data-dotquilt-dissolve': '',
  });
  let resize: ResizeObserver | undefined;
  let closed = false;
  const dispose = () => {
    if (closed) return;
    closed = true;
    resize?.disconnect();
    svg.remove();
    host.removeAttribute('data-custom');
    budget.close();
  };
  const check = () => {
    if (closed) return;
    const next = host.getBoundingClientRect();
    if (
      next.width !== bounds.width ||
      next.height !== bounds.height ||
      surfaces.some((surface, index) => {
        const before = shapes[index];
        const after = measure(surface, next);
        return (
          !before ||
          !surface.isConnected ||
          (Object.keys(before) as (keyof typeof before)[]).some(
            (key) => before[key] !== after[key],
          )
        );
      })
    )
      invalidate();
  };

  try {
    for (const [index, shape] of shapes.entries()) {
      const field = node('svg', {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      });
      const bands = Math.max(
        1,
        Math.min(12, Math.round(shape.width / (shape.gap * 4))),
      );
      const width = shape.width / bands;
      for (let band = 0; band < bands; band++) {
        const id = `d${index}-${band}`;
        const pattern = node('pattern', {
          id,
          patternUnits: 'userSpaceOnUse',
          x: shape.offsetX,
          y: shape.offsetY,
          width: shape.gap,
          height: shape.gap,
        });
        const mark = node('circle', { cx: shape.gap / 2, cy: shape.gap / 2 });
        pattern.append(mark);
        const rect = node('rect', {
          x: band * width,
          width,
          height: shape.height,
          fill: `url(#${id})`,
        });
        field.append(pattern, rect);
        const timing: KeyframeAnimationOptions = {
          duration: duration * exitWindow,
          delay:
            bands > 1 ? (band / (bands - 1)) * (1 - exitWindow) * duration : 0,
          fill: 'both',
        };
        own(
          rect.animate(
            [
              {
                opacity: restOpacity,
                transform: 'translateY(0px)',
                easing: easing ?? curves.sine,
              },
              { opacity: 0, transform: `translateY(${departure.driftPx}px)` },
            ],
            timing,
          ),
        );
        if (departure.shrink)
          own(
            mark.animate(
              [
                { r: `${shape.size / 2}px`, easing: easing ?? curves.sine },
                { r: `${(shape.size / 2) * (1 - departure.shrink)}px` },
              ],
              timing,
            ),
          );
      }
      svg.append(field);
    }
    root.append(svg);
    host.setAttribute('data-custom', '');
    resize = new win.ResizeObserver(check);
    resize.observe(host);
    for (const surface of surfaces) resize.observe(surface);
    return { dispose, check };
  } catch (error) {
    dispose();
    throw error;
  }
}
