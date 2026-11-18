import type { Dot } from '../../animations.js';
import type { StylePolicy } from '../../types.js';
import { installStyles, node } from '../dom.js';
import type { Painter } from '../painter.js';
import { lease } from './resources.js';
import { observeView } from './view.js';

export type Candidate = 'svg' | 'canvas' | 'dom';
export const denseStyles = [
  '[data-dotquilt-painter][hidden]{display:none}[data-dotquilt-painter]{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none}[data-dotquilt-painter] i{position:absolute;left:0;top:0;width:2px;height:2px;transform-origin:0 0;border-radius:50%;background:var(--dotquilt-color,currentColor)}[data-dotquilt-painter] i.accent{background:var(--dotquilt-accent-color,currentColor)}@media(forced-colors:active){[data-dotquilt-painter]{display:none}}',
] as const;
/** Private candidate factories; benchmark-only choice, never a component prop. */
export function candidatePainter(
  kind: Candidate,
  externalHref = '/m2/dense.css',
) {
  return (host: HTMLElement, report: (code: string) => void): Painter => {
    const doc = host.ownerDocument,
      shadow = host.shadowRoot;
    if (!shadow) throw new TypeError('Drawing requires an enhanced host');
    const budget = lease(doc, report);
    let view: ReturnType<typeof observeView>;
    try {
      view = observeView(host);
    } catch (error) {
      budget.close();
      throw error;
    }
    const root =
      kind === 'svg'
        ? doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
        : node(doc, kind === 'canvas' ? 'canvas' : 'div');
    root.setAttribute('data-dotquilt-painter', '');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('hidden', '');
    const before = new Set(shadow.children);
    const policy = (host as HTMLElement & { stylePolicy: StylePolicy })
      .stylePolicy ?? { mode: 'inline' as const };
    const styles: Element[] = [];
    const canvas = kind === 'canvas' ? (root as HTMLCanvasElement) : undefined;
    let context: CanvasRenderingContext2D | null | undefined;
    let capacity = 0,
      values: Float32Array | undefined,
      count = 0,
      disposed = false;
    const elements: (SVGCircleElement | HTMLElement)[] = [];
    const effects: Animation[] = [];
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      for (const effect of effects) effect.cancel();
      effects.length = 0;
      elements.length = 0;
      values = undefined;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      root.remove();
      for (const style of styles) style.remove();
      if (!shadow.querySelector('[data-dotquilt-painter]'))
        host.removeAttribute('data-custom');
      view.release();
      budget.close();
    };
    try {
      installStyles(
        shadow,
        denseStyles,
        policy.mode === 'external'
          ? { mode: 'external', href: externalHref }
          : policy,
      );
      styles.push(...[...shadow.children].filter((n) => !before.has(n)));
      shadow.append(root);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        context = canvas.getContext('2d');
        if (!context) throw new TypeError('Canvas unavailable');
      }
    } catch (error) {
      dispose();
      throw error;
    }
    return {
      dispose,
      draw(produce) {
        if (disposed) return;
        const previous = count;
        count = 0;
        let active = true,
          attempted = false;
        try {
          produce((dot: Dot) => {
            if (!active || disposed) return;
            attempted = true;
            if (
              !Number.isFinite(dot.x) ||
              !Number.isFinite(dot.y) ||
              !Number.isFinite(dot.size) ||
              !Number.isFinite(dot.opacity) ||
              !Number.isFinite(Math.fround(dot.x)) ||
              !Number.isFinite(Math.fround(dot.y))
            ) {
              budget.issue('invalid-dot');
              return;
            }
            if (
              count >= 4096 ||
              (count >= previous && !budget.set('dots', count + 1))
            ) {
              budget.issue('dot-limit');
              return;
            }
            if (count === capacity) {
              const next = Math.min(4096, Math.max(32, capacity * 2)),
                bytes = next * 5 * 4;
              if (!budget.set('bytes', budget.get('bytes') + bytes)) return;
              let replacement: Float32Array;
              try {
                replacement = new Float32Array(next * 5);
              } catch (error) {
                budget.set('bytes', capacity * 5 * 4);
                throw error;
              }
              if (values) replacement.set(values);
              budget.set('bytes', bytes);
              values = replacement;
              capacity = next;
            }
            if (!values) return;
            const at = count++ * 5;
            values[at] = dot.x;
            values[at + 1] = dot.y;
            values[at + 2] = Math.max(0, Math.min(32, dot.size));
            values[at + 3] = Math.max(0, Math.min(1, dot.opacity));
            values[at + 4] = dot.tone === 'accent' ? 1 : 0;
          });
        } catch (error) {
          count = previous;
          budget.set('dots', previous);
          throw error;
        } finally {
          active = false;
        }
        if (disposed) return;
        if (attempted && count === 0) {
          dispose();
          throw new TypeError('No drawing commands admitted');
        }
        budget.set('dots', count);
        root.toggleAttribute('hidden', count === 0);
        host.toggleAttribute(
          'data-custom',
          !!shadow.querySelector('[data-dotquilt-painter]:not([hidden])'),
        );
        if (!count && canvas) {
          canvas.width = 0;
          canvas.height = 0;
          budget.set('pixels', 0);
          return;
        }
        const v = view.read();
        if (canvas && context) {
          const ratio = Math.min(
            v.dpr,
            2048 / Math.max(1, v.outerWidth),
            2048 / Math.max(1, v.outerHeight),
            Math.sqrt(1048576 / Math.max(1, v.outerWidth * v.outerHeight)),
          );
          const width = Math.max(0, Math.floor(v.outerWidth * ratio)),
            height = Math.max(0, Math.floor(v.outerHeight * ratio));
          if (canvas.width !== width || canvas.height !== height) {
            // Release the old bitmap before replacement; do not double-charge a temporary overlap.
            canvas.width = 0;
            canvas.height = 0;
            budget.set('pixels', 0);
            if (!budget.set('pixels', width * height)) {
              dispose();
              throw new TypeError('Canvas admission failed');
            }
            canvas.width = width;
            canvas.height = height;
          }
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.setTransform(ratio, 0, 0, ratio, v.x * ratio, v.y * ratio);
          let tone = -1;
          for (let i = 0; i < count; i++) {
            const at = i * 5,
              x = values?.[at] ?? 0,
              y = values?.[at + 1] ?? 0,
              size = values?.[at + 2] ?? 0;
            const opacity = values?.[at + 3] ?? 0;
            const nextTone = values?.[at + 4] ?? 0;
            if (tone !== nextTone) {
              tone = nextTone;
              context.fillStyle = tone ? v.accent : v.base;
            }
            if (!size || !opacity) continue;
            context.globalAlpha = opacity;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
          }
        } else {
          if (kind === 'svg')
            root.setAttribute(
              'viewBox',
              `0 0 ${Math.max(1, v.outerWidth)} ${Math.max(1, v.outerHeight)}`,
            );
          for (let i = 0; i < count; i++) {
            const at = i * 5,
              x = (values?.[at] ?? 0) + v.x,
              y = (values?.[at + 1] ?? 0) + v.y,
              size = values?.[at + 2] ?? 0,
              opacity = values?.[at + 3] ?? 0,
              accent = !!values?.[at + 4];
            let element = elements[i];
            if (!element) {
              element =
                kind === 'svg'
                  ? doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  : node(doc, 'i');
              root.append(element);
              elements.push(element);
            }
            if (kind === 'svg')
              for (const [name, value] of Object.entries({
                cx: x,
                cy: y,
                r: size,
                opacity,
                fill: accent
                  ? 'var(--dotquilt-accent-color,currentColor)'
                  : 'var(--dotquilt-color,currentColor)',
              }))
                element.setAttribute(name, String(value));
            else {
              element.setAttribute('class', accent ? 'accent' : 'base');
              const keys = [
                {
                  transform: `translate(${x - size}px,${y - size}px) scale(${size})`,
                  opacity,
                },
              ];
              const existing = effects[i];
              if (!existing) {
                const animation = element.animate(keys, {
                  duration: 1,
                  fill: 'both',
                });
                animation.pause();
                animation.currentTime = 0;
                effects[i] = animation;
              } else (existing.effect as KeyframeEffect).setKeyframes(keys);
            }
          }
          while (elements.length > count) {
            elements.pop()?.remove();
            effects.pop()?.cancel();
          }
        }
      },
    };
  };
}
