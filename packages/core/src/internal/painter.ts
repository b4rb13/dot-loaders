import type { Dot } from '../animations.js';
import { paintLayer } from './dom.js';
import { lease } from './ledger.js';
import {
  glowColor,
  type Mark,
  markBox,
  markColor,
  markOf,
  peakOpacity,
} from './marks.js';
import { clamp } from './math.js';
export interface Painter {
  draw(callback: (dot: (value: Dot) => void) => void): void;
  dispose(): void;
  capture?(limit?: number): readonly Dot[];
  readonly points?: readonly PaintEntry[];
}
export type PaintEntry = Partial<Record<0 | 1 | 2 | 3 | 5, number>> & {
  4?: boolean;
};
// Optional authoring support, reached only through an imported custom definition.
// The engine creates/disposes this painter. Author callbacks see bounded commands only.
export const pointer: unique symbol = Symbol.for('dotquilt.pointer.v1');
/**
 * The pointer lift (design/SPEC.md): marks within 56 px of the pointer light
 * up in the accent, strongest at the pointer, like the skeleton's lift layer.
 * Returns the accent's opacity at offset (dx, dy).
 */
export function liftAt(dx: number, dy: number): number {
  return peakOpacity * Math.max(0, 1 - Math.hypot(dx, dy) / 56);
}
/** A drawn mark; the indexes cache x, y, radius, opacity, accent and angle. */
type Entry = SVGElement &
  Partial<Record<0 | 1 | 2 | 3 | 5, number>> & { 4?: boolean };
const svgns = 'http://www.w3.org/2000/svg';

/**
 * TextLoader's glyph marks sit on a matrix whose pitch is about 2.8 radii, much
 * tighter than a field's: squares and dashes are fitted to it, so the marks of
 * a character stay distinct. A dash spans nearly the whole pitch, like a
 * scanline; a square is two thirds of it.
 */
function glyphBox(mark: 'square' | 'dash', r: number) {
  return mark === 'square'
    ? { width: 1.85 * r, height: 1.85 * r, radius: 0.45 * r }
    : { width: 2.55 * r, height: 0.9 * r, radius: 0.45 * r };
}
/**
 * Places a dot as a circle, or a square or dash as a rounded rectangle,
 * turned about its centre by `angle` radians.
 */
function place(
  entry: Entry,
  mark: Mark,
  x: number,
  y: number,
  r: number,
  angle: number,
  glyphs: boolean,
) {
  if (mark === 'dot') {
    entry.setAttribute('cx', String(x));
    entry.setAttribute('cy', String(y));
    entry.setAttribute('r', String(r));
    return;
  }
  const box = glyphs ? glyphBox(mark, r) : markBox(mark, r);
  entry.setAttribute('x', String(x - box.width / 2));
  entry.setAttribute('y', String(y - box.height / 2));
  entry.setAttribute('width', String(box.width));
  entry.setAttribute('height', String(box.height));
  entry.setAttribute('rx', String(box.radius));
  if (angle)
    entry.setAttribute(
      'transform',
      `rotate(${(angle * 180) / Math.PI} ${x} ${y})`,
    );
  else entry.removeAttribute('transform');
}
export function createPainter(
  host: HTMLElement,
  report: (code: string) => void,
  part?: string,
  /** Draws glyph marks (TextLoader), fitted to their matrix. */
  glyphs = false,
): Painter {
  const doc = host.ownerDocument;
  // The surface cap is checked per command below, so a refused lease means
  // the document is full.
  const budget = lease(doc, (code) =>
    report(code === 'dots-limit' ? 'document-dot-limit' : code),
  );
  let disposed = false;
  const svg = doc.createElementNS(svgns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  if (part) svg.setAttribute('part', part);
  svg.setAttribute('data-dotquilt-painter', '');
  if (host.shadowRoot) paintLayer(host.shadowRoot).append(svg);
  host.setAttribute('data-custom', '');
  // Remember only the primitives written by this painter, bounded by admitted nodes.
  const dots: Entry[] = [];
  // The mark the entries draw; a new mark replaces them.
  let shape: Mark = 'dot';
  return {
    points: dots,
    draw(callback) {
      if (disposed) return;
      let active = true;
      let count = 0;
      const position = Reflect.get(host, pointer) as
        | { x: number; y: number }
        | undefined;
      const mark = markOf(host);
      if (mark !== shape) {
        for (const entry of dots.splice(0)) entry.remove();
        budget.set('dots', 0);
        shape = mark;
      }
      try {
        const write = (
          x: number,
          y: number,
          size: number,
          opacity: number,
          accent: boolean,
          angle: number,
        ) => {
          if (++count > 4096) {
            report('dot-limit');
            return;
          }
          let entry = dots[count - 1];
          if (!entry) {
            if (!budget.set('dots', dots.length + 1)) return;
            entry = doc.createElementNS(
              svgns,
              mark === 'dot' ? 'circle' : 'rect',
            ) as Entry;
            dots.push(entry);
            svg.append(entry);
          }
          const r = clamp(size, 0, 32);
          if (
            entry[0] !== x ||
            entry[1] !== y ||
            entry[2] !== r ||
            (entry[5] ?? 0) !== angle
          ) {
            place(entry, mark, x, y, r, angle, glyphs);
            entry[0] = x;
            entry[1] = y;
            entry[2] = r;
            entry[5] = angle;
          }
          opacity = clamp(opacity);
          if (entry[3] !== opacity) {
            entry.setAttribute('opacity', String(opacity));
            entry[3] = opacity;
          }
          if (entry[4] !== accent) {
            entry.setAttribute('fill', accent ? glowColor : markColor);
            entry[4] = accent;
          }
        };
        callback((value) => {
          if (!active || disposed) return;
          const { x, y, size, opacity, tone, angle = 0 } = value;
          if (![x, y, size, opacity, angle].every(Number.isFinite)) {
            report('invalid-dot');
            return;
          }
          write(x, y, size, opacity, tone === 'accent', angle);
          // The pointer lights the marks around it, as a skeleton's lift does.
          const halo = position ? liftAt(x - position.x, y - position.y) : 0;
          if (halo > 0.02 && tone !== 'accent')
            write(x, y, size, halo * Math.min(1, opacity * 3), true, angle);
        });
      } finally {
        active = false;
      }
      if (dots.length > count) {
        for (const entry of dots.splice(count)) entry.remove();
        budget.set('dots', dots.length);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      budget.close();
      dots.length = 0;
      svg.remove();
      if (!host.shadowRoot?.querySelector('[data-dotquilt-painter]'))
        host.removeAttribute('data-custom');
    },
  };
}
