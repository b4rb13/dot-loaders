import { createEffect } from './effect.js';
import { frames } from './frames.js';
import type { HandoffDriver, HandoffRequest } from './handoff.js';
import { lease } from './ledger.js';
import { markBox, morphTiming } from './marks.js';
import { clamp } from './math.js';
import {
  type Box,
  inside,
  type Kind,
  type MarkSource,
  morphMarks,
  type Part,
  radiusOf,
  relative,
  round,
  type Seed,
  skeletonParts,
  typingPart,
} from './morph-marks.js';

/**
 * The region handoff (design/SPEC.md, "take shape, then hand over"), the
 * chart's handoff for every other placeholder:
 *
 * 1. Take shape. Each mark travels in a wave to where the real content is:
 *    lines grow or shrink to the length of each real text line, blocks and
 *    circles reshape to the real image or avatar, typing dots unroll into the
 *    message, and a placeholder card or bubble grows to the real one's size.
 * 2. Hand over. The content wipes in along a soft front at the idle glow's
 *    angle, and the marks leave exactly where the front passes them.
 *
 * Geometry is read once, when the region becomes ready; the content is
 * already laid out (hidden) while pending, so its lines and boxes are known.
 */

/** The front's direction: the idle glow's 104°, so lower lines follow a little later. */
const ax = Math.sin((104 * Math.PI) / 180),
  ay = -Math.cos((104 * Math.PI) / 180);
const front = (x: number, y: number) => x * ax + y * ay;
const sine = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
const settle = (t: number) => 1 - (1 - clamp(t)) ** 3;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const svgns = 'http://www.w3.org/2000/svg';

interface Atom {
  readonly kind: Kind | 'run';
  readonly box: Box;
}
interface Travel {
  readonly from: Seed;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly born: boolean;
  readonly dies: boolean;
  /** Stays where it is until the front passes: a mark with nowhere to go. */
  readonly holds?: boolean;
  /** 0 at the front's start, 1 at its end: when this mark sets off. */
  readonly order: number;
}

const centre = (box: Box) => [box.x + box.w / 2, box.y + box.h / 2] as const;

const transparent = (value: string) =>
  value === 'transparent' || /[,/]\s*0\)$/.test(value);
/** Has a background, a shadow or a full border: something you can see as a shape. */
function visual(css: CSSStyleDeclaration): boolean {
  return (
    css.backgroundImage !== 'none' ||
    !transparent(css.backgroundColor) ||
    css.boxShadow !== 'none' ||
    ['top', 'right', 'bottom', 'left'].every(
      (side) => parseFloat(css.getPropertyValue(`border-${side}-width`)) > 0,
    )
  );
}
/** The region's content nodes: everything not slotted elsewhere. */
function contentNodes(region: HTMLElement): Node[] {
  return [...region.childNodes].filter(
    (node) =>
      !(node instanceof Element) ||
      (!node.slot &&
        !node.matches(
          'style,script,template,[data-dotquilt-placeholder],[data-dotquilt-style],[data-dotquilt-static]',
        )),
  );
}

/** A box by its edges, in viewport px. */
interface Edges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}
const unclipped: Edges = {
  left: Number.NEGATIVE_INFINITY,
  top: Number.NEGATIVE_INFINITY,
  right: Number.POSITIVE_INFINITY,
  bottom: Number.POSITIVE_INFINITY,
};
const intersect = (a: Edges, b: Edges): Edges => ({
  left: Math.max(a.left, b.left),
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
});

/** How an element clips what it draws. */
interface Clip {
  /** `clip` or `clip-path`: clips the element and everything in it. */
  readonly own: Edges | undefined;
  /** Its padding box, on the axes where `overflow` clips its content. */
  readonly content: Edges | undefined;
  readonly position: string;
  /** Positioned or transformed: absolutely positioned content stays inside it. */
  readonly anchors: boolean;
  readonly transformed: boolean;
}

/** `clip-path: inset(…)` as edges, or undefined for anything else. */
function insetOf(value: string, box: DOMRect): Edges | undefined {
  const match = /^inset\(([^)]*)\)/.exec(value);
  const lengths = match?.[1]?.split(' round ')[0]?.trim().split(/\s+/) ?? [];
  const px = (length: string | undefined, of: number) => {
    const parts = /^(-?[\d.]+)(px|%)$/.exec(length ?? '');
    if (!parts) return Number.NaN;
    return parts[2] === '%' ? (Number(parts[1]) / 100) * of : Number(parts[1]);
  };
  const [top, right = top, bottom = top, left = right] = lengths;
  const edges = {
    left: box.left + px(left, box.width),
    top: box.top + px(top, box.height),
    right: box.right - px(right, box.width),
    bottom: box.bottom - px(bottom, box.height),
  };
  return Object.values(edges).every(Number.isFinite) ? edges : undefined;
}

/** `clip: rect(…)`, which applies to absolutely positioned elements. */
function rectOf(value: string, box: DOMRect): Edges | undefined {
  const sides = /^rect\((.*)\)$/.exec(value)?.[1]?.split(/[\s,]+/);
  if (sides?.length !== 4) return undefined;
  const [top, right, bottom, left] = sides.map((side) =>
    side === 'auto' ? undefined : Number.parseFloat(side),
  );
  return {
    left: box.left + (left ?? 0),
    top: box.top + (top ?? 0),
    right: box.left + (right ?? box.width),
    bottom: box.top + (bottom ?? box.height),
  };
}

function clipOf(element: Element, win: Window): Clip {
  const css = win.getComputedStyle(element);
  const position = css.position;
  const transformed = css.transform !== 'none';
  let own: Edges | undefined;
  let content: Edges | undefined;
  const box = () => element.getBoundingClientRect();
  // Other shapes count as the element's box, which they mostly stay inside.
  if (css.clipPath !== 'none') own = insetOf(css.clipPath, box()) ?? box();
  if ((position === 'absolute' || position === 'fixed') && css.clip !== 'auto')
    own = intersect(own ?? unclipped, rectOf(css.clip, box()) ?? unclipped);
  // Overflow clips block, flex, grid and table cell boxes, not inline ones
  // or table rows and groups.
  const x = css.overflowX !== 'visible',
    y = css.overflowY !== 'visible';
  if (
    (x || y) &&
    css.display !== 'inline' &&
    css.display !== 'contents' &&
    !/^table-(row|column|header|footer)/.test(css.display)
  ) {
    const { left, top } = box();
    const padding = {
      left: left + element.clientLeft,
      top: top + element.clientTop,
      right: left + element.clientLeft + element.clientWidth,
      bottom: top + element.clientTop + element.clientHeight,
    };
    content = {
      left: x ? padding.left : unclipped.left,
      top: y ? padding.top : unclipped.top,
      right: x ? padding.right : unclipped.right,
      bottom: y ? padding.bottom : unclipped.bottom,
    };
  }
  return {
    own,
    content,
    position,
    anchors: position !== 'static' || transformed,
    transformed,
  };
}

/**
 * The part of `rect` that shows once `from` and its ancestors up to `region`
 * have clipped it, or undefined when less than 2px of it shows either way.
 * getClientRects() and getBoundingClientRect() ignore clipping, so without
 * this a visually hidden header (a 1px box with `overflow: hidden`, `clip`
 * or `clip-path: inset(50%)`) would become a row of marks.
 *
 * With `ownBox`, `rect` is `from`'s own box, which its overflow doesn't clip.
 */
function visiblePart(
  rect: DOMRect,
  from: Element | null,
  region: Element,
  clips: (element: Element) => Clip,
  ownBox = false,
): Edges | undefined {
  let edges: Edges = rect;
  // Absolutely positioned content escapes the overflow of ancestors until
  // the one that contains it (any positioned one; a transformed one for fixed).
  let escaping: string | undefined;
  for (
    let element = from;
    element && element !== region;
    element = element.parentElement
  ) {
    const clip = clips(element);
    if (escaping && (escaping === 'fixed' ? clip.transformed : clip.anchors))
      escaping = undefined;
    if (clip.content && !escaping && !(ownBox && element === from))
      edges = intersect(edges, clip.content);
    if (clip.own) edges = intersect(edges, clip.own);
    if (clip.position === 'absolute' || clip.position === 'fixed')
      escaping = clip.position;
  }
  return edges.right - edges.left >= 2 && edges.bottom - edges.top >= 2
    ? edges
    : undefined;
}

/** Caches each element's clip for one plan. */
function clipCache(region: Element): (element: Element) => Clip {
  const win = region.ownerDocument.defaultView;
  const cache = new Map<Element, Clip>();
  const none: Clip = {
    own: undefined,
    content: undefined,
    position: 'static',
    anchors: false,
    transformed: false,
  };
  return (element) => {
    let clip = cache.get(element);
    if (!clip) {
      clip = win ? clipOf(element, win) : none;
      cache.set(element, clip);
    }
    return clip;
  };
}

/** Lines of text, as runs of words that sit together, in reading order. */
function textRuns(
  nodes: readonly Node[],
  origin: DOMRect,
  region: Element,
  clips: (element: Element) => Clip,
): Box[] {
  const doc = nodes[0]?.ownerDocument;
  if (!doc) return [];
  const rects: Edges[] = [];
  const range = doc.createRange();
  const collect = (text: Text) => {
    if (!/\S/.test(text.data) || rects.length > 600) return;
    const parent = text.parentElement;
    if (parent?.closest('[aria-hidden=true] svg, script, style')) return;
    range.selectNodeContents(text);
    for (const rect of range.getClientRects()) {
      const shown = visiblePart(rect, parent, region, clips);
      if (shown) rects.push(shown);
    }
  };
  for (const node of nodes) {
    if (node instanceof Text) collect(node);
    else if (node instanceof Element) {
      const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode())
        collect(text as Text);
    }
  }
  rects.sort(
    (a, b) =>
      Math.round((a.top + a.bottom) / 8) - Math.round((b.top + b.bottom) / 8) ||
      a.left - b.left,
  );
  const runs: { l: number; t: number; r: number; b: number }[] = [];
  for (const rect of rects) {
    const height = rect.bottom - rect.top;
    const run = runs.find(
      (run) =>
        Math.min(run.b, rect.bottom) - Math.max(run.t, rect.top) >=
          0.5 * Math.min(run.b - run.t, height) &&
        rect.left - run.r <= 0.6 * height &&
        rect.left - run.r >= -2,
    );
    if (run) {
      run.r = Math.max(run.r, rect.right);
      run.t = Math.min(run.t, rect.top);
      run.b = Math.max(run.b, rect.bottom);
    } else
      runs.push({ l: rect.left, t: rect.top, r: rect.right, b: rect.bottom });
  }
  return runs.slice(0, 80).map((run) => ({
    x: run.l - origin.left,
    y: run.t - origin.top,
    w: run.r - run.l,
    h: run.b - run.t,
    r: 0,
  }));
}

/** Images, avatars, badges: boxes in the content a block or circle can become. */
function contentBoxes(
  nodes: readonly Node[],
  origin: DOMRect,
  area: number,
  region: Element,
  clips: (element: Element) => Clip,
): Atom[] {
  const win = nodes[0]?.ownerDocument?.defaultView;
  if (!win) return [];
  const atoms: Atom[] = [];
  let seen = 0;
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    for (const element of [node, ...node.querySelectorAll('*')]) {
      if (++seen > 240) return atoms;
      if (element.parentElement?.closest('svg')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 14 || rect.height < 14) continue;
      // A container around most of the content is not a shape to become.
      if (
        rect.width * rect.height > 0.6 * area &&
        /\S/.test(element.textContent ?? '')
      )
        continue;
      const css = win.getComputedStyle(element);
      if (
        !element.matches('img,svg,video,canvas,iframe,object') &&
        !visual(css)
      )
        continue;
      const shown = visiblePart(rect, element, region, clips, true);
      if (!shown) continue;
      const width = shown.right - shown.left,
        height = shown.bottom - shown.top;
      if (width < 14 || height < 14) continue;
      const r = radiusOf(css, width, height);
      const box: Box = {
        x: shown.left - origin.left,
        y: shown.top - origin.top,
        w: width,
        h: height,
        r,
      };
      atoms.push({
        kind: round(box) ? 'round' : 'box',
        box,
      });
    }
  }
  return atoms;
}

/** Destination marks for an atom, laid out at the part's pitch. */
function layout(atom: Atom, part: Part): { x: number; y: number }[] {
  const { box } = atom,
    pitch = part.pitch,
    r = part.radius;
  const points: { x: number; y: number }[] = [];
  const across = (width: number, rows: number, top: number) => {
    const count = Math.max(1, Math.floor((width - 2 * r) / pitch) + 1);
    const step = count > 1 ? (width - 2 * r) / (count - 1) : 0;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < count; i++)
        points.push({
          x: box.x + r + (count > 1 ? i * step : (width - 2 * r) / 2),
          y: top + j * pitch,
        });
  };
  if (atom.kind === 'run') {
    // A text line: as many rows of marks as cover its letters (two for body
    // text, more for large figures), centred on the line.
    const rows = Math.max(1, Math.min(5, Math.round(box.h / pitch)));
    across(box.w, rows, box.y + box.h / 2 - ((rows - 1) * pitch) / 2);
    return points;
  }
  const rows = Math.max(1, Math.floor((box.h - 2 * r) / pitch) + 1);
  const step = rows > 1 ? (box.h - 2 * r) / (rows - 1) : 0;
  const count = Math.max(1, Math.floor((box.w - 2 * r) / pitch) + 1);
  const stepX = count > 1 ? (box.w - 2 * r) / (count - 1) : 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < count; i++) {
      const x = box.x + r + i * stepX,
        y = box.y + r + j * step;
      if (inside(box, x, y, r * 0.15)) points.push({ x, y });
    }
  return points;
}

const distance = (a: Box, b: Box) => {
  const [ax0, ay0] = centre(a),
    [bx0, by0] = centre(b);
  return Math.hypot(ax0 - bx0, ay0 - by0);
};

/** Pairs each item of `from` with at most one of `to`, cheapest first. */
function pair<A, B>(
  from: readonly A[],
  to: readonly B[],
  cost: (a: A, b: B) => number,
): Map<A, B> {
  const options = from.flatMap((a) => to.map((b) => ({ a, b, c: cost(a, b) })));
  options.sort((x, y) => x.c - y.c);
  const pairs = new Map<A, B>(),
    taken = new Set<B>();
  for (const { a, b, c } of options)
    if (Number.isFinite(c) && !pairs.has(a) && !taken.has(b)) {
      pairs.set(a, b);
      taken.add(b);
    }
  return pairs;
}

export interface MorphPlan {
  readonly travels: readonly Travel[];
  readonly width: number;
  readonly height: number;
  readonly rtl: boolean;
  readonly shell?:
    | { readonly element: HTMLElement; readonly from: Box; readonly to: Box }
    | undefined;
}

/**
 * A placeholder's marks: chart and table hand over what they painted;
 * skeletons and TypingDots are read from where their CSS draws them.
 */
function partsOf(participant: HTMLElement, origin: DOMRect): readonly Part[] {
  if (morphMarks in participant)
    return (participant as HTMLElement & MarkSource)[morphMarks](origin);
  if (participant.localName === 'dotquilt-typing-dots')
    return typingPart(participant, origin);
  if (participant.localName.startsWith('dotquilt-skeleton-'))
    return skeletonParts(participant, origin);
  return [];
}

/** Reads the placeholder and the content and decides where every mark goes. */
export function planMorph(
  region: HTMLElement,
  participants: readonly HTMLElement[],
): MorphPlan {
  const origin = region.getBoundingClientRect();
  const parts = participants.flatMap((participant) =>
    partsOf(participant, origin),
  );
  const nodes = contentNodes(region);
  const area = Math.max(1, origin.width * origin.height);
  const clips = clipCache(region);
  const runs = textRuns(nodes, origin, region, clips);
  const boxes = contentBoxes(nodes, origin, area, region, clips);

  // Blocks and circles become the content's boxes: a circle prefers a round
  // one, and a box much bigger or smaller than the block is not its match.
  const shapes = parts.filter((part) => part.kind !== 'row');
  const shapePairs = pair(shapes, boxes, (part, atom) => {
    const ratio = (atom.box.w * atom.box.h) / (part.box.w * part.box.h);
    if (ratio < 0.12 || ratio > 8) return Number.POSITIVE_INFINITY;
    const mismatch = (part.kind === 'round') !== (atom.kind === 'round');
    return (
      distance(part.box, atom.box) +
      Math.abs(Math.log(ratio)) * 40 +
      (mismatch ? 120 : 0)
    );
  });
  const covered = [...shapePairs.values()].map((atom) => atom.box);
  const free = runs
    .filter(
      (run) =>
        !covered.some((box) => inside(box, ...centre(run), 0) && box !== run),
    )
    .map((box): Atom => ({ kind: 'run', box }));
  // Lines become text lines: the nearest in height first, then along the line.
  // The two blocks are aligned first, so a placeholder that sits lower or
  // further in than its content still pairs its lines in reading order.
  const rows = parts.filter((part) => part.kind === 'row');
  const edge = (boxes: readonly Box[], key: 'x' | 'y') =>
    boxes.length ? Math.min(...boxes.map((box) => box[key])) : 0;
  const lines = free.map((atom) => atom.box),
    marks = rows.map((part) => part.box);
  const dx = edge(lines, 'x') - edge(marks, 'x'),
    dy = edge(lines, 'y') - edge(marks, 'y');
  const rowPairs = pair(rows, free, (part, atom) => {
    const [, py] = centre(part.box),
      [, ay0] = centre(atom.box);
    return (
      Math.abs(py + dy - ay0) + 0.4 * Math.abs(part.box.x + dx - atom.box.x)
    );
  });

  // Every destination gets a source part: its pair, or the nearest part.
  const jobs: { part: Part; atom: Atom }[] = [];
  for (const [part, atom] of shapePairs) jobs.push({ part, atom });
  for (const [part, atom] of rowPairs) jobs.push({ part, atom });
  const paired = new Set([...rowPairs.values()]);
  const sources = parts.filter(
    (part) => part.kind === 'row' || !shapePairs.has(part),
  );
  for (const atom of free) {
    if (paired.has(atom) || !parts.length) continue;
    const nearest = (sources.length ? sources : parts).reduce((best, part) =>
      distance(part.box, atom.box) < distance(best.box, atom.box) ? part : best,
    );
    jobs.push({ part: nearest, atom });
  }

  const width = origin.width,
    height = origin.height;
  // Right-to-left text reads, and so wipes, from the right edge.
  const rtl =
    region.ownerDocument.defaultView?.getComputedStyle(region).direction ===
    'rtl';
  const along = (x: number, y: number) => front(rtl ? width - x : x, y);
  const span = Math.max(1, front(width, height));
  const used = new Set<Seed>();
  const travels: Travel[] = [];
  const nearestSeed = (part: Part, x: number, y: number) => {
    let best = part.seeds[0] as Seed,
      d = Number.POSITIVE_INFINITY;
    for (const seed of part.seeds) {
      const e = (seed.x - x) ** 2 + (seed.y - y) ** 2;
      if (e < d) {
        d = e;
        best = seed;
      }
    }
    return best;
  };
  const destinations = new Map<Part, { x: number; y: number }[]>();
  for (const { part, atom } of jobs) {
    const points = layout(atom, part);
    destinations.set(part, [...(destinations.get(part) ?? []), ...points]);
    for (const point of points) {
      // The source mark at the same place, relative to each shape.
      const u = (point.x - atom.box.x) / Math.max(1, atom.box.w),
        v = (point.y - atom.box.y) / Math.max(1, atom.box.h);
      const seed = nearestSeed(
        part,
        part.box.x + u * part.box.w,
        part.box.y + v * part.box.h,
      );
      travels.push({
        from: seed,
        x: point.x,
        y: point.y,
        r: part.radius,
        born: used.has(seed),
        dies: false,
        order: clamp(along(point.x, point.y) / span),
      });
      used.add(seed);
    }
  }
  // Marks nobody needs fold into the nearest destination and fade: their own
  // part's, or for a spare line any line's, so the whole skeleton becomes the
  // content. A spare block or circle stays put until the front passes.
  const everywhere = [...destinations.values()].flat();
  for (const part of parts) {
    const points =
      destinations.get(part) ?? (part.kind === 'row' ? everywhere : undefined);
    for (const seed of part.seeds) {
      if (used.has(seed)) continue;
      let to: { x: number; y: number } | undefined;
      let d = Number.POSITIVE_INFINITY;
      for (const point of points ?? []) {
        const e = (point.x - seed.x) ** 2 + (point.y - seed.y) ** 2;
        if (e < d) {
          d = e;
          to = point;
        }
      }
      travels.push({
        from: seed,
        x: to?.x ?? seed.x,
        y: to?.y ?? seed.y,
        r: to ? part.radius : seed.r,
        born: false,
        dies: !!to,
        holds: !to,
        order: clamp(along(seed.x, seed.y) / span),
      });
    }
  }

  // A card or bubble around the placeholder grows into the content's own:
  // the first element, down a chain of only children, that you can see.
  let shell: MorphPlan['shell'];
  const win = region.ownerDocument.defaultView;
  const shellOf = (element: Element | undefined) => {
    for (let depth = 0; element && win && depth < 4; depth++) {
      if (element.localName.startsWith('dotquilt-')) return undefined;
      if (visual(win.getComputedStyle(element))) return element as HTMLElement;
      element = element.children.length === 1 ? element.children[0] : undefined;
    }
    return undefined;
  };
  const elements = nodes.filter(
    (node) =>
      node instanceof Element || (node instanceof Text && /\S/.test(node.data)),
  );
  const own = shellOf(
    region.querySelector(':scope > [slot=placeholder]') ?? undefined,
  );
  const theirs = shellOf(
    elements.length === 1 && elements[0] instanceof Element
      ? elements[0]
      : undefined,
  );
  if (own && theirs) {
    const from = relative(own.getBoundingClientRect(), origin),
      to = relative(theirs.getBoundingClientRect(), origin);
    if (
      Math.abs(from.w - to.w) +
        Math.abs(from.h - to.h) +
        Math.abs(from.x - to.x) +
        Math.abs(from.y - to.y) >
      1
    )
      shell = { element: own, from, to };
  }
  return { travels, width, height, rtl, shell };
}

/** Draws the plan's marks on one overlay, a CSP-safe SVG in the region. */
function overlay(region: HTMLElement, travels: readonly Travel[]) {
  const doc = region.ownerDocument;
  const svg = doc.createElementNS(svgns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('overflow', 'visible');
  svg.setAttribute('data-dotquilt-morph', '');
  const entries = travels.map((travel) => {
    const entry = doc.createElementNS(
      svgns,
      travel.from.mark === 'dot' ? 'circle' : 'rect',
    ) as SVGElement & { k?: string };
    svg.append(entry);
    return entry;
  });
  region.shadowRoot?.append(svg);
  return {
    place(
      index: number,
      x: number,
      y: number,
      r: number,
      opacity: number,
      accent: boolean,
    ) {
      const entry = entries[index],
        travel = travels[index];
      if (!entry || !travel) return;
      const mark = travel.from.mark;
      const fill = accent ? travel.from.accent : travel.from.fill;
      const key = `${x.toFixed(2)} ${y.toFixed(2)} ${r.toFixed(2)} ${opacity.toFixed(3)} ${fill}`;
      if (entry.k === key) return;
      entry.k = key;
      if (mark === 'dot') {
        entry.setAttribute('cx', x.toFixed(2));
        entry.setAttribute('cy', y.toFixed(2));
        entry.setAttribute('r', r.toFixed(2));
      } else {
        const box = markBox(mark, r);
        entry.setAttribute('x', (x - box.width / 2).toFixed(2));
        entry.setAttribute('y', (y - box.height / 2).toFixed(2));
        entry.setAttribute('width', box.width.toFixed(2));
        entry.setAttribute('height', box.height.toFixed(2));
        entry.setAttribute('rx', box.radius.toFixed(2));
      }
      entry.setAttribute('opacity', opacity.toFixed(3));
      entry.setAttribute('fill', fill);
    },
    dispose() {
      svg.remove();
    },
  };
}

/**
 * The default region handoff for skeleton and typing placeholders, and for
 * any placeholder without an animation of its own. Paints both layers itself.
 */
export function createMorph(
  region: HTMLElement,
  participants: readonly HTMLElement[],
  placeholder: HTMLElement,
  request: HandoffRequest,
  duration: number,
): HandoffDriver & { readonly paints: true } {
  const plan = planMorph(region, participants);
  const doc = region.ownerDocument;
  const budget = lease(doc, request.report);
  if (!budget.set('dots', plan.travels.length)) {
    budget.close();
    throw new RangeError('dot-limit');
  }
  const { content, own, current } = request;
  const paint = overlay(region, plan.travels);
  // The masks ride on the controller's own clock animations for the two
  // layers (attach), so each layer has exactly one animation.
  let layers: { outgoing: Animation; incoming: Animation } | undefined;
  const masked = (layer: 'outgoing' | 'incoming') => {
    let previous = '';
    return (mask: string) => {
      const animation = layers?.[layer];
      if (!animation || mask === previous) return;
      previous = mask;
      (animation.effect as KeyframeEffect | null)?.setKeyframes({
        opacity: [1, 1],
        maskImage: [mask, mask],
      });
    };
  };
  const reveal = masked('incoming'),
    conceal = masked('outgoing');
  const shell = plan.shell && createEffect(plan.shell.element, own);
  const origin = region.getBoundingClientRect();
  const offset = (element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    return plan.rtl
      ? front(origin.right - box.right, box.top - origin.top)
      : front(box.left - origin.left, box.top - origin.top);
  };
  const contentOffset = offset(content),
    placeholderOffset = offset(placeholder);
  const span = front(plan.width, plan.height);
  const { travel, stagger, wipeStart, edge, arrive } = morphTiming;
  let release: (() => void) | undefined;
  let hidden = false;
  const draw = (p: number) => {
    if (!current()) return;
    // The placeholder's own marks hide while the overlay draws them. Created
    // on the first frame, once the controller owns this handoff's animations.
    if (!hidden) {
      hidden = true;
      for (const participant of participants)
        own(
          participant.animate(
            { visibility: ['hidden', 'hidden'] },
            { duration, fill: 'both' },
          ),
        );
    }
    const at =
      -edge + (span + 2 * edge) * sine((p - wipeStart) / (1 - wipeStart));
    const wipe = (from: string, to: string, shift: number) =>
      `linear-gradient(${plan.rtl ? 256 : 104}deg,${from} ${(at - edge - shift).toFixed(1)}px,${to} ${(at - shift).toFixed(1)}px)`;
    reveal(wipe('#000', '#0000', contentOffset));
    conceal(wipe('#0000', '#000', placeholderOffset));
    if (shell && plan.shell) {
      const q = settle(p / (wipeStart + 0.1));
      const { from, to } = plan.shell;
      shell({
        width: `${mix(from.w, to.w, q).toFixed(1)}px`,
        height: `${mix(from.h, to.h, q).toFixed(1)}px`,
        translate: `${(mix(from.x, to.x, q) - from.x).toFixed(1)}px ${(mix(from.y, to.y, q) - from.y).toFixed(1)}px`,
        boxSizing: 'border-box',
      });
    }
    plan.travels.forEach((item, index) => {
      const q = sine((p - stagger * item.order) / travel);
      const x = mix(item.from.x, item.x, q),
        y = mix(item.from.y, item.y, q);
      const start = item.born ? 0 : item.from.o;
      const opacity = item.holds
        ? start
        : item.dies
          ? mix(start, 0, clamp(q * 1.4))
          : mix(start, arrive, q);
      // Ahead of the front a mark stays; inside the soft edge it gives way.
      const stay = clamp(
        (front(plan.rtl ? plan.width - x : x, y) - at + edge) / edge,
      );
      paint.place(
        index,
        x,
        y,
        mix(item.from.r, item.r, q),
        opacity * stay,
        // Lit while travelling, as if the idle glow carried it; ink on arrival.
        !item.holds && q > 0.08 && q < 0.82,
      );
    });
  };
  return {
    duration,
    paints: true,
    draw,
    attach(outgoing, incoming) {
      layers = { outgoing, incoming };
    },
    activate(callback) {
      release ??= frames(region, callback);
    },
    dispose() {
      release?.();
      release = undefined;
      paint.dispose();
      budget.close();
    },
  };
}
