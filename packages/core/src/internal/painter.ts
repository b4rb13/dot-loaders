import type { Dot } from '../animations.js';
import { paintLayer } from './dom.js';
import { clamp } from './math.js';
export interface Painter {
  draw(callback: (dot: (value: Dot) => void) => void): void;
  dispose(): void;
  capture?(limit?: number): readonly Dot[];
  readonly points?: readonly PaintEntry[];
}
export type PaintEntry = Partial<Record<0 | 1 | 2 | 3, number>> & {
  4?: boolean;
};
type Factory = (
  host: HTMLElement,
  report: (code: string) => void,
  part?: string,
) => Painter;
const proofFactories = new WeakMap<HTMLElement, Factory>();
// Private comparison seam; no package export, component prop or renderer registry.
export function usePainterForProof(
  host: HTMLElement,
  factory: Factory,
): () => void {
  proofFactories.set(host, factory);
  return () => {
    if (proofFactories.get(host) === factory) proofFactories.delete(host);
  };
}
// Optional authoring support, reached only through an imported custom definition.
// The engine creates/disposes this painter. Author callbacks see bounded commands only.
interface Ledger {
  dots: number;
  users: number;
}
const ledgerKey = Symbol.for('dotquilt.v1.dot-ledger');
export const pointer: unique symbol = Symbol.for('dotquilt.pointer.v1');
type Index = 0 | 1 | 2 | 3;
type Entry = SVGCircleElement &
  Partial<Record<Index, number>> & { 4?: boolean };
type Channel = [attribute: string, value?: number, text?: string];
type Channels = [Channel, Channel, Channel, Channel];
function write(
  entry: Entry,
  index: Index,
  value: number,
  channels: Channels,
): void {
  if (entry[index] === value) return;
  const channel = channels[index];
  if (channel[1] !== value) {
    channel[2] = String(value);
    channel[1] = value;
  }
  // A matching finite value is observed only after its text is stored.
  entry.setAttribute(channel[0], channel[2] as string);
  entry[index] = value;
}
export function painterForProof(host: HTMLElement): Factory | undefined {
  return proofFactories.get(host);
}
export function createPainter(
  host: HTMLElement,
  report: (code: string) => void,
  part?: string,
): Painter {
  const proof = proofFactories.get(host);
  if (proof) return proof(host, report, part);
  const doc = host.ownerDocument;
  const ledger = (Reflect.get(doc, ledgerKey) as Ledger | undefined) ?? {
    dots: 0,
    users: 0,
  };
  Reflect.set(doc, ledgerKey, ledger);
  ledger.users++;
  let disposed = false;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  if (part) svg.setAttribute('part', part);
  svg.setAttribute('data-dotquilt-painter', '');
  if (host.shadowRoot) paintLayer(host.shadowRoot).append(svg);
  host.setAttribute('data-custom', '');
  // Remember only the primitives written by this painter, bounded by admitted nodes.
  const dots: Entry[] = [];
  // Four numeric formatting slots retain no commands and cannot grow with scene size.
  const channels = ['cx', 'cy', 'r', 'opacity'].map(
    (name): Channel => [name],
  ) as Channels;
  return {
    points: dots,
    draw(callback) {
      if (disposed) return;
      let active = true;
      let count = 0;
      const position = Reflect.get(host, pointer) as
        | { x: number; y: number }
        | undefined;
      try {
        callback((value) => {
          if (!active || disposed) return;
          if (++count > 4096) {
            report('dot-limit');
            return;
          }
          let { x, y, size, opacity, tone } = value;
          if (![x, y, size, opacity].every(Number.isFinite)) {
            report('invalid-dot');
            return;
          }
          if (position) {
            const lift = Math.max(
              0,
              1 - Math.hypot(x - position.x, y - position.y) / 40,
            );
            y -= lift * 2;
            size *= 1 + lift * 0.2;
            opacity = Math.min(1, opacity + lift * 0.3);
          }
          let entry = dots[count - 1];
          if (!entry) {
            if (ledger.dots >= 16384) {
              report('document-dot-limit');
              return;
            }
            ledger.dots++;
            entry = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dots.push(entry);
            svg.append(entry);
          }
          write(entry, 0, x, channels);
          write(entry, 1, y, channels);
          write(entry, 2, clamp(size, 0, 32), channels);
          write(entry, 3, clamp(opacity), channels);
          const accent = tone === 'accent';
          if (entry[4] !== accent) {
            entry.setAttribute(
              'fill',
              accent
                ? 'var(--dotquilt-accent-color,currentColor)'
                : 'var(--dotquilt-color,currentColor)',
            );
            entry[4] = accent;
          }
        });
      } finally {
        active = false;
      }
      while (dots.length > count) {
        dots.pop()?.remove();
        ledger.dots--;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ledger.dots -= dots.length;
      if (--ledger.users === 0) Reflect.deleteProperty(doc, ledgerKey);
      dots.length = 0;
      svg.remove();
      if (!host.shadowRoot?.querySelector('[data-dotquilt-painter]'))
        host.removeAttribute('data-custom');
    },
  };
}
