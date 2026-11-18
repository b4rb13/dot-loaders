import { media } from './dom.js';

/** Private compatible-copy seam. Region owns time, restrictions and terminal cleanup. */
export type SkeletonDeparture = (
  duration: number,
  easing: string,
  own: (animation: Animation) => void,
  invalidate: () => void,
) => () => void;
export const skeletonHandoff: unique symbol = Symbol.for(
  'dotquilt.skeleton.handoff.v1',
);

interface Ledger {
  dots: number;
  users: number;
}
const ledgerKey = Symbol.for('dotquilt.v1.dot-ledger');

/** Nine interleaved dot fields share one clock; no per-dot loop or animation. */
export function dissolveSkeleton(
  host: HTMLElement,
  duration: number,
  easing: string,
  fallPx: number,
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
    return {
      x: box.left - bounds.left,
      y: box.top - bounds.top,
      width: box.width,
      height: box.height,
      gap: parseFloat(css.backgroundSize),
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
  const ledger: Ledger = Reflect.get(doc, ledgerKey) ?? { dots: 0, users: 0 };
  if (count > 4096 || ledger.dots + count > 16384) {
    report('dot-limit');
    return { dispose() {}, check() {} };
  }
  ledger.users++;
  ledger.dots += count;
  Reflect.set(doc, ledgerKey, ledger);
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
    ledger.dots -= count;
    if (--ledger.users === 0) Reflect.deleteProperty(doc, ledgerKey);
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
      for (let i = 0; i < 9; i++) {
        const id = `d${index}-${i}`;
        const pattern = node('pattern', {
          id,
          patternUnits: 'userSpaceOnUse',
          width: shape.gap * 3,
          height: shape.gap * 3,
        });
        pattern.append(
          node('circle', {
            cx: shape.gap * ((i % 3) + 0.5),
            cy: shape.gap * (Math.floor(i / 3) + 0.5),
          }),
        );
        const rect = node('rect', {
          width: shape.width,
          height: shape.height,
          fill: `url(#${id})`,
        });
        field.append(pattern, rect);
        const delay = ((i * 5) % 9) / 20;
        own(
          rect.animate(
            [
              { opacity: 0.3, transform: 'translateY(0px)', offset: 0 },
              { opacity: 0.3, transform: 'translateY(0px)', offset: delay },
              { opacity: 0, transform: `translateY(${fallPx}px)`, offset: 1 },
            ],
            { duration, easing, fill: 'both' },
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
