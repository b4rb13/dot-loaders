/**
 * How a skeleton's marks leave during a region handoff, and where its CSS
 * grid draws them. Only a region hands a skeleton over, so this is the
 * region's code (skeleton-source.ts): a skeleton on its own never loads it.
 */
import { media } from './dom.js';
import { lease } from './ledger.js';
import { curves, markOf, shapes as markShapes, restOpacity } from './marks.js';
import type { Departure } from './skeleton-handoff.js';

/** Each band of marks takes this share of the handoff; later bands start later. */
const exitWindow = 0.5;

/** The offset of a repeating tile of `tile` px placed at `position` in `box` px. */
function gridOffset(position: string, box: number, tile: number): number {
  const value = parseFloat(position) || 0;
  const px = position.trim().endsWith('%')
    ? (value / 100) * (box - tile)
    : value;
  return tile > 0 ? ((px % tile) + tile) % tile : 0;
}

/** Plain numbers, so the resize check can compare measurements with `!==`. */
function flat<K extends string>(
  axis: K,
  { step, offset }: { step: number; offset: number },
) {
  return { [`${axis}Step`]: step, [`${axis}Offset`]: offset } as Record<
    `${K}Step` | `${K}Offset`,
    number
  >;
}

/**
 * Where the CSS grid puts its marks along one axis: the distance between
 * mark centres and the pattern offset that reproduces them. `space` draws
 * only whole tiles, the first and last touching the edges.
 */
function gridAxis(repeat: string, position: string, box: number, tile: number) {
  const count = Math.floor(box / tile);
  if (repeat === 'space' && count >= 2) {
    const step = (box - tile) / (count - 1);
    return { step, offset: (tile - step) / 2 };
  }
  return { step: tile, offset: gridOffset(position, box, tile) };
}

/**
 * Where a CSS-painted surface draws its marks, relative to `bounds`: its box,
 * the mark size and pitch, and the grid offsets that reproduce the pattern.
 */
export function measureSurface(
  win: Window,
  surface: HTMLElement,
  bounds: DOMRect,
) {
  const box = surface.getBoundingClientRect();
  const css = win.getComputedStyle(surface);
  // The tile is the pitch across and down; dashes have different ones.
  const [across = Number.NaN, down = across] = css.backgroundSize
    .split(/\s+/)
    .map(parseFloat);
  const repeat = css.backgroundRepeat.split(/\s+/);
  return {
    size: parseFloat(css.getPropertyValue('--s')) || across / 2,
    x: box.left - bounds.left,
    y: box.top - bounds.top,
    width: box.width,
    height: box.height,
    across,
    down,
    // Where the CSS grid puts its marks, so the fields line up with them.
    ...flat(
      'column',
      gridAxis(
        repeat[0] ?? 'repeat',
        css.backgroundPositionX,
        box.width,
        across,
      ),
    ),
    ...flat(
      'row',
      gridAxis(
        repeat[1] ?? repeat[0] ?? 'repeat',
        css.backgroundPositionY,
        box.height,
        down,
      ),
    ),
  };
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
    (surface) => !surface.closest('.pulse,.lift'),
  );
  const bounds = host.getBoundingClientRect();
  // Squares and dashes have a fixed spec size; dots follow --dotquilt-dot-size.
  const mark = markOf(host);
  const measure = (surface: HTMLElement, bounds: DOMRect) =>
    measureSurface(win, surface, bounds);
  const shapes = surfaces.map((surface) => measure(surface, bounds));
  if (
    !shapes.length ||
    shapes.length > 50 ||
    shapes.some(
      (shape) =>
        ![
          shape.x,
          shape.y,
          shape.width,
          shape.height,
          shape.across,
          shape.down,
        ].every(Number.isFinite) ||
        shape.across < 1 ||
        shape.down < 1,
    )
  )
    throw new TypeError();
  const count = shapes.reduce(
    (sum, shape) =>
      sum +
      Math.ceil(shape.width / shape.across) *
        Math.ceil(shape.height / shape.down),
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
        Math.min(12, Math.round(shape.width / (shape.across * 4))),
      );
      const width = shape.width / bands;
      for (let band = 0; band < bands; band++) {
        const id = `d${index}-${band}`;
        const pattern = node('pattern', {
          id,
          patternUnits: 'userSpaceOnUse',
          x: shape.columnOffset,
          y: shape.rowOffset,
          width: shape.columnStep,
          height: shape.rowStep,
        });
        // A dot's radius comes from the stylesheet; squares and dashes shrink
        // about their own centre.
        const glyph =
          mark === 'dot'
            ? node('circle', {
                cx: shape.columnStep / 2,
                cy: shape.rowStep / 2,
              })
            : node('rect', {
                x: (shape.columnStep - markShapes[mark].width) / 2,
                y: (shape.rowStep - markShapes[mark].height) / 2,
                width: markShapes[mark].width,
                height: markShapes[mark].height,
                rx: markShapes[mark].radius,
              });
        pattern.append(glyph);
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
            glyph.animate(
              mark === 'dot'
                ? [
                    { r: `${shape.size / 2}px`, easing: easing ?? curves.sine },
                    { r: `${(shape.size / 2) * (1 - departure.shrink)}px` },
                  ]
                : [
                    { scale: 1, easing: easing ?? curves.sine },
                    { scale: 1 - departure.shrink },
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
