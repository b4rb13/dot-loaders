import type { Dot } from '../animations.js';
import {
  dotRadius,
  glowColor,
  type Mark,
  markBox,
  markColor,
  markOf,
} from './marks.js';
import { clamp } from './math.js';
import { measureSurface } from './skeleton-handoff.js';

/**
 * What a placeholder hands the region's morph (morph.ts): its marks as last
 * drawn, grouped into parts, in the region's coordinates. Each placeholder
 * reads its own, so the region carries none of their code.
 */
export const morphMarks: unique symbol = Symbol('dotquilt.morph-marks');
export interface MarkSource {
  [morphMarks](origin: DOMRect): readonly Part[];
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Corner radius in px. */
  readonly r: number;
}
export interface Seed {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly o: number;
  readonly mark: Mark;
  readonly fill: string;
  readonly accent: string;
}
export type Kind = 'row' | 'box' | 'round';
export interface Part {
  readonly kind: Kind;
  readonly box: Box;
  readonly seeds: readonly Seed[];
  /** Pitch and radius of the marks it lays out at its destination. */
  readonly pitch: number;
  readonly radius: number;
}

export const relative = (rect: DOMRect, origin: DOMRect, r = 0): Box => ({
  x: rect.left - origin.left,
  y: rect.top - origin.top,
  w: rect.width,
  h: rect.height,
  r,
});

/** Corner radius in px, from the first computed corner. */
export function radiusOf(
  css: CSSStyleDeclaration,
  w: number,
  h: number,
): number {
  const value = css.borderTopLeftRadius.split(/\s+/)[0] ?? '0';
  const n = parseFloat(value) || 0;
  return Math.min(
    Math.min(w, h) / 2,
    value.endsWith('%') ? (n / 100) * Math.min(w, h) : n,
  );
}
/** Whether a mark centred at (x, y) sits inside a rounded box. */
export function inside(box: Box, x: number, y: number, margin = 0): boolean {
  const dx = Math.max(0, Math.abs(x - box.x - box.w / 2) - (box.w / 2 - box.r));
  const dy = Math.max(0, Math.abs(y - box.y - box.h / 2) - (box.h / 2 - box.r));
  return (
    x >= box.x - margin &&
    x <= box.x + box.w + margin &&
    y >= box.y - margin &&
    y <= box.y + box.h + margin &&
    dx * dx + dy * dy <= (box.r + margin) ** 2
  );
}
/** A circle or a near-square with round corners, not a pill: an avatar or a dot. */
export const round = (box: Box): boolean =>
  box.r >= Math.min(box.w, box.h) / 2 - 1 &&
  Math.max(box.w, box.h) <= 1.3 * Math.min(box.w, box.h);

/** The marks' colours: the placeholder's own, or the defaults. */
export function colours(host: Element, css: CSSStyleDeclaration) {
  const own = css.getPropertyValue('--dotquilt-color').trim();
  const accent = css.getPropertyValue('--dotquilt-accent-color').trim();
  return {
    fill: own || markColor,
    accent: accent || glowColor,
    mark: markOf(host),
  };
}

/** A skeleton's marks, where its stylesheet draws them. */
export function skeletonParts(host: HTMLElement, origin: DOMRect): Part[] {
  const root = host.shadowRoot,
    win = host.ownerDocument.defaultView;
  if (!root || !win) return [];
  const css = win.getComputedStyle(host),
    look = colours(host, css),
    hostBox = host.getBoundingClientRect(),
    clip = relative(
      hostBox,
      origin,
      radiusOf(css, hostBox.width, hostBox.height),
    );
  const name = host.localName;
  const parts: Part[] = [];
  for (const surface of root.querySelectorAll<HTMLElement>('.surface')) {
    if (surface.closest('.pulse,.lift')) continue;
    const shape = measureSurface(win, surface, origin);
    if (
      ![shape.width, shape.height, shape.columnStep, shape.rowStep].every(
        (n) => Number.isFinite(n) && n > 0,
      )
    )
      continue;
    const opacity = +win.getComputedStyle(surface).opacity || 0;
    const r = look.mark === 'dot' ? shape.size / 2 : dotRadius;
    const seeds: Seed[] = [];
    const firstColumn = shape.columnOffset + shape.columnStep / 2,
      firstRow = shape.rowOffset + shape.rowStep / 2;
    for (
      let y = firstRow - shape.rowStep;
      y <= shape.height + r && seeds.length < 3000;
      y += shape.rowStep
    )
      for (
        let x = firstColumn - shape.columnStep;
        x <= shape.width + r;
        x += shape.columnStep
      ) {
        // Marks the edge cuts in half keep their visible share.
        const cover =
          clamp((x + r) / (2 * r)) *
          clamp((shape.width - x + r) / (2 * r)) *
          clamp((y + r) / (2 * r)) *
          clamp((shape.height - y + r) / (2 * r));
        const px = shape.x + x,
          py = shape.y + y;
        if (cover < 0.35 || !inside(clip, px, py, -r * 0.4)) continue;
        seeds.push({ x: px, y: py, r, o: opacity * cover, ...look });
      }
    if (!seeds.length) continue;
    const box = { x: shape.x, y: shape.y, w: shape.width, h: shape.height };
    const kind: Kind =
      name === 'dotquilt-skeleton-circle' || round(clip)
        ? 'round'
        : name === 'dotquilt-skeleton-block' &&
            shape.height > 2.5 * shape.rowStep
          ? 'box'
          : 'row';
    parts.push({
      kind,
      box: { ...box, r: kind === 'round' ? Math.min(box.w, box.h) / 2 : 0 },
      seeds,
      pitch: shape.columnStep,
      radius: r,
    });
  }
  return parts;
}

/** TypingDots: its dots unroll into the message's lines, at field size. */
export function typingPart(host: HTMLElement, origin: DOMRect): Part[] {
  const root = host.shadowRoot,
    win = host.ownerDocument.defaultView;
  if (!root || !win) return [];
  const look = colours(host, win.getComputedStyle(host));
  const unit = markBox(look.mark, dotRadius).height;
  const seeds = [...root.querySelectorAll<HTMLElement>('.dot')].flatMap(
    (dot) => {
      const box = dot.getBoundingClientRect();
      if (!box.width || !box.height) return [];
      return [
        {
          x: box.left - origin.left + box.width / 2,
          y: box.top - origin.top + box.height / 2,
          r: (dotRadius * box.height) / unit,
          o: +win.getComputedStyle(dot).opacity || 0.3,
          ...look,
        },
      ];
    },
  );
  if (!seeds.length) return [];
  const xs = seeds.map((s) => s.x),
    ys = seeds.map((s) => s.y),
    x = Math.min(...xs),
    y = Math.min(...ys);
  return [
    {
      kind: 'row',
      box: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, r: 0 },
      seeds,
      pitch: 9,
      radius: dotRadius,
    },
  ];
}

/**
 * A TableLoader: its painted marks, grouped into runs, one per cell (two rows
 * of marks that sit together), so each cell becomes the text in its place.
 */
export function denseParts(
  host: HTMLElement,
  origin: DOMRect,
  marks: readonly Dot[],
): Part[] {
  const win = host.ownerDocument.defaultView;
  if (!win || !marks.length) return [];
  const look = colours(host, win.getComputedStyle(host));
  const box = host.getBoundingClientRect();
  const seeds = marks
    .filter((mark) => mark.tone !== 'accent' && mark.opacity > 0.02)
    .map(
      (mark): Seed => ({
        x: box.left - origin.left + mark.x,
        y: box.top - origin.top + mark.y,
        r: mark.size,
        o: mark.opacity,
        ...look,
      }),
    );
  if (!seeds.length) return [];
  // The pitch: the usual distance to the next mark along a row.
  const sorted = [...seeds].sort((a, b) => a.y - b.y || a.x - b.x);
  const steps = sorted
    .slice(1)
    .map((seed, i) => seed.x - (sorted[i] as Seed).x)
    .filter((step) => step > 0.5)
    .sort((a, b) => a - b);
  const pitch = steps[Math.floor(steps.length / 2)] ?? 9;
  // Bands of rows, then runs within a band split where marks stop.
  const bands: Seed[][] = [];
  for (const seed of sorted) {
    const band = bands.at(-1);
    const last = band?.at(-1);
    if (band && last && seed.y - last.y <= pitch * 1.5) band.push(seed);
    else bands.push([seed]);
  }
  const parts: Part[] = [];
  for (const band of bands) {
    const across = [...band].sort((a, b) => a.x - b.x);
    let run: Seed[] = [];
    const flush = () => {
      if (!run.length) return;
      const xs = run.map((seed) => seed.x),
        ys = run.map((seed) => seed.y),
        x = Math.min(...xs),
        y = Math.min(...ys);
      parts.push({
        kind: 'row',
        box: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, r: 0 },
        seeds: run,
        pitch,
        radius: run[0]?.r ?? dotRadius,
      });
      run = [];
    };
    for (const seed of across) {
      const last = run.at(-1);
      if (last && seed.x - last.x > pitch * 2.2) flush();
      run.push(seed);
    }
    flush();
  }
  return parts;
}
