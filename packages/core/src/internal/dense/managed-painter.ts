import type { Dot } from '../../animations.js';
import { capturePainter } from '../capture.js';
import {
  ancestors,
  paintLayer,
  type RefreshHost,
  styleRefresh,
} from '../dom.js';
import { available, lease } from '../ledger.js';
import { createPainter, type Painter, pointer } from '../painter.js';

type Capture = (limit?: number) => readonly Dot[];
interface Context {
  current?: Capture | undefined;
  sources: Set<Capture>;
  revision: number;
  release: Set<() => void>;
}
const ns = 'http://www.w3.org/2000/svg';
const bufferBytes = 4096 * 5 * 8;
const factoryKey = Symbol.for('dotquilt.painter.v1');
// Rich hosts opt into this private backend; basic consumers do not import Canvas.
export function installDensePainter(host: HTMLElement): void {
  if (Reflect.get(host, factoryKey)) return;
  const context: Context = {
    revision: 0,
    release: new Set(),
    sources: new Set(),
  };
  const prior = (host as RefreshHost)[styleRefresh];
  (host as RefreshHost)[styleRefresh] = () => {
    prior?.();
    context.revision++;
    for (const release of context.release) release();
  };
  Reflect.set(
    host,
    factoryKey,
    (
      element: HTMLElement,
      report: (code: string) => void,
      part: string | undefined,
      idle: boolean,
    ) => createDensePainter(element, report, part, idle, context),
  );
  Reflect.set(
    Reflect.get(host, factoryKey),
    'capture',
    (limit?: number) => context.current?.(limit) ?? Object.freeze([]),
  );
}
export function invalidateDensePainter(host: HTMLElement): void {
  (host as RefreshHost)[styleRefresh]?.();
}
function visible(host: HTMLElement): boolean {
  const win = host.ownerDocument.defaultView;
  if (!win || host.ownerDocument.hidden) return false;
  let { left, top, right, bottom } = host.getBoundingClientRect();
  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(win.innerWidth, right);
  bottom = Math.min(win.innerHeight, bottom);
  for (const element of ancestors(host)) {
    const css = win.getComputedStyle(element);
    if (css.visibility === 'hidden' || element.hidden) return false;
    const clipX = /hidden|clip|auto|scroll/.test(css.overflowX),
      clipY = /hidden|clip|auto|scroll/.test(css.overflowY);
    if (clipX || clipY) {
      const r = element.getBoundingClientRect();
      if (clipX) {
        left = Math.max(left, r.left);
        right = Math.min(right, r.right);
      }
      if (clipY) {
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
      }
    }
  }
  return (
    right > left &&
    bottom > top &&
    win.getComputedStyle(host).visibility !== 'hidden'
  );
}
export function managedPainter(
  host: HTMLElement,
  report: (code: string) => void,
  part?: string,
  idle = false,
): Painter {
  installDensePainter(host);
  return Reflect.get(host, factoryKey)(host, report, part, idle);
}
function createDensePainter(
  host: HTMLElement,
  report: (code: string) => void,
  part: string | undefined,
  idle: boolean,
  context: Context,
): Painter {
  const doc = host.ownerDocument,
    shadow = host.shadowRoot;
  if (!shadow) throw new TypeError('Drawing requires an enhanced host');
  const dark = doc.defaultView?.matchMedia('(prefers-color-scheme: dark)');
  let darkMode = dark?.matches;
  let lost = false;
  let disposed = false,
    revision = -1,
    onScreen = false,
    paused = false;
  let fallback: Painter | undefined;
  let root: SVGSVGElement | undefined,
    canvas: HTMLCanvasElement | undefined,
    foreign: SVGForeignObjectElement | undefined,
    base: SVGRectElement | undefined,
    accent: SVGRectElement | undefined;
  let budget: ReturnType<typeof lease> | undefined,
    values: Float64Array | undefined,
    length = 0;
  let drawing: CanvasRenderingContext2D | null = null;
  let width = 0,
    height = 0,
    padding = 0,
    ratio = 1,
    color = '',
    accentColor = '';
  const releaseBitmap = () => {
    if (canvas) canvas.width = canvas.height = 0;
    budget?.set('pixels', 0);
  };
  const contextLost = () => {
    // Keep committed primitives until the next engine frame adopts SVG.
    lost = true;
    releaseBitmap();
  };
  // Idle reservations can move before admission; an active reveal keeps its last visible frame.
  const invalidate = () => {
    if (idle) releaseBitmap();
  };
  context.release.add(invalidate);
  const clear = () => {
    canvas?.removeEventListener('contextlost', contextLost);
    releaseBitmap();
    budget?.close();
    budget = undefined;
    values = undefined;
    length = 0;
    root?.remove();
    root = undefined;
    canvas = undefined;
    drawing = null;
    fallback?.dispose();
    fallback = undefined;
    if (!shadow.querySelector('[data-dotquilt-painter]'))
      host.removeAttribute('data-custom');
  };
  const svg = () => (fallback ??= createPainter(host, report, part));
  const admit = () => {
    if (!values && !available(doc, 'bytes', bufferBytes)) return false;
    if (!root) {
      root = doc.createElementNS(ns, 'svg');
      root.setAttribute('aria-hidden', 'true');
      root.setAttribute('data-dotquilt-painter', '');
      if (part) root.setAttribute('part', part);
      foreign = doc.createElementNS(ns, 'foreignObject');
      canvas = doc.createElement('canvas');
      canvas.width = canvas.height = 0;
      canvas.addEventListener('contextlost', contextLost);
      canvas.setAttribute('data-dotquilt-bitmap', '');
      canvas.setAttribute('aria-hidden', 'true');
      foreign.append(canvas);
      root.append(foreign);
      base = doc.createElementNS(ns, 'rect');
      accent = doc.createElementNS(ns, 'rect');
      base.setAttribute('fill', 'var(--dotquilt-color,currentColor)');
      accent.setAttribute('fill', 'var(--dotquilt-accent-color,currentColor)');
      root.append(base, accent);
      paintLayer(shadow).append(root);
    }
    if (!canvas || !base || !accent || !foreign) return false;
    width = root.clientWidth;
    height = root.clientHeight;
    ratio = doc.defaultView?.devicePixelRatio || 1;
    padding = 0;
    const css = doc.defaultView?.getComputedStyle(base);
    color = css?.fill ?? 'currentColor';
    accentColor = doc.defaultView?.getComputedStyle(accent).fill ?? color;
    const w = Math.ceil((width + padding * 2) * ratio),
      h = Math.ceil((height + padding * 2) * ratio);
    if (
      !width ||
      !height ||
      w > 2048 ||
      h > 2048 ||
      !Number.isFinite(w * h) ||
      css?.stroke !== 'none' ||
      css.fillOpacity !== '1' ||
      css.shapeRendering !== 'auto' ||
      !doc.defaultView?.CSS.supports('color', color) ||
      !doc.defaultView.CSS.supports('color', accentColor) ||
      Math.abs(root.getBoundingClientRect().width - width) >= 1 / 64 ||
      Math.abs(root.getBoundingClientRect().height - height) >= 1 / 64 ||
      doc.defaultView?.getComputedStyle(root).overflow === 'visible'
    )
      return false;
    if (!available(doc, 'pixels', w * h, budget?.get('pixels') ?? 0))
      return false;
    budget ??= lease(doc, (code) =>
      report(code === 'dots-limit' ? 'document-dot-limit' : code),
    );
    // Reserve worst-case commands before calling author code: no mid-producer allocation/replay.
    if (
      !budget.set('pixels', w * h) ||
      (!values && !budget.set('bytes', bufferBytes))
    )
      return false;
    try {
      values ??= new Float64Array(4096 * 5);
      drawing ??= canvas.getContext('2d');
      if (!drawing) return false;
      if (canvas.width !== w || canvas.height !== h) {
        // Release the old bitmap before either new dimension can allocate pixels.
        canvas.width = canvas.height = 0;
        canvas.width = w;
        canvas.height = h;
      }
    } catch {
      return false;
    }
    foreign.setAttribute('x', String(-padding));
    foreign.setAttribute('y', String(-padding));
    foreign.setAttribute('width', String(width + padding * 2));
    foreign.setAttribute('height', String(height + padding * 2));
    host.setAttribute('data-custom', '');
    return true;
  };
  const capture: Capture = (limit = 4096) =>
    fallback
      ? capturePainter(fallback, limit)
      : Object.freeze(
          Array.from({ length: Math.min(length, limit) }, (_, i) =>
            Object.freeze({
              x: (values?.[i * 5] ?? 0) + 0,
              y: (values?.[i * 5 + 1] ?? 0) + 0,
              size: values?.[i * 5 + 2] ?? 0,
              opacity: values?.[i * 5 + 3] ?? 0,
              tone: values?.[i * 5 + 4]
                ? ('accent' as const)
                : ('base' as const),
            }),
          ),
        );
  context.sources.add(capture);
  return {
    capture,
    dispose() {
      if (disposed) return;
      disposed = true;
      context.sources.delete(capture);
      if (context.current === capture)
        context.current = context.sources.values().next().value;
      context.release.delete(invalidate);
      clear();
    },
    draw(produce) {
      if (disposed) return;
      context.current = capture;
      // A ready intent captures this final idle draw before disposing its writer.
      if (idle && fallback && Reflect.get(host, 'owner')?.state === 'ready') {
        fallback.draw(produce);
        return;
      }
      const still = idle && !host.hasAttribute('data-moving');
      const changed =
        revision !== context.revision ||
        darkMode !== dark?.matches ||
        ratio !== (doc.defaultView?.devicePixelRatio || 1) ||
        paused !== still;
      if (changed) {
        revision = context.revision;
        darkMode = dark?.matches;
        // SVG resolves paused appearance live; retain its bounded numeric writer.
        if (paused !== still || (!still && !canvas)) clear();
        paused = still;
        onScreen = visible(host);
      }
      if (idle && !onScreen) {
        clear();
        return;
      }
      if (paused) {
        svg().draw(produce);
        return;
      }
      if (lost) {
        clear();
        svg().draw(produce);
        return;
      }
      if (fallback) {
        fallback.draw(produce);
        return;
      }
      if (
        !onScreen ||
        ((changed || !root || !canvas?.width || !canvas.height) && !admit())
      ) {
        clear();
        svg().draw(produce);
        return;
      }
      const bitmap = canvas,
        ctx = drawing,
        data = values,
        resources = budget;
      if (!bitmap || !ctx || !data || !resources)
        throw new TypeError('Missing admitted painter');
      let active = true,
        count = 0,
        failed = false,
        error: unknown;
      const position = Reflect.get(host, pointer) as
        | { x: number; y: number }
        | undefined;
      try {
        produce((value) => {
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
          let slot = count - 1;
          if (slot >= length) {
            if (!resources.set('dots', length + 1)) return;
            slot = length++;
          }
          const at = slot * 5,
            r = Math.max(0, Math.min(32, size));
          data[at] = x;
          data[at + 1] = y;
          data[at + 2] = r;
          data[at + 3] = Math.max(0, Math.min(1, opacity));
          data[at + 4] = tone === 'accent' ? 1 : 0;
        });
      } catch (caught) {
        failed = true;
        error = caught;
      } finally {
        active = false;
      }
      if (disposed) {
        if (failed) throw error;
        return;
      }
      if (!failed && length > count) {
        length = count;
        resources.set('dots', length);
      }
      try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, bitmap.width, bitmap.height);
        ctx.setTransform(ratio, 0, 0, ratio, padding * ratio, padding * ratio);
        let tone = -1;
        for (let i = 0; i < length; i++) {
          const at = i * 5,
            r = data[at + 2] ?? 0,
            opacity = data[at + 3] ?? 0,
            nextTone = data[at + 4] ?? 0;
          if (tone !== nextTone) {
            tone = nextTone;
            ctx.fillStyle = tone ? accentColor : color;
          }
          if (!r || !opacity) continue;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(data[at] ?? 0, data[at + 1] ?? 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } catch {
        contextLost();
      }
      if (failed) throw error;
    },
  };
}
