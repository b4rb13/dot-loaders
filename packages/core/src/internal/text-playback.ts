import type { TextLoader } from '../text.js';
import { definitionOf } from './binding.js';
import { capturePainter } from './capture.js';
import { createEffect } from './effect.js';
import { now } from './element.js';
import { frames } from './frames.js';
import type { HandoffFactory } from './handoff.js';
import { createPainter, type Painter } from './painter.js';
import type { Runner } from './runner.js';
import { readSurface } from './surface.js';
import type {
  TextDraw,
  TextReveal,
  TextRevealFrame,
} from './text-definitions.js';

// Type-erased private recipe views. Public factories validate the family/phase
// and parse options before the engine ever reaches these first-party intrinsics.
interface IdleRecipe {
  frame(context: TextDraw, options: object): undefined;
  still(context: TextDraw, options: object): undefined;
}
interface HandoffRecipe {
  duration(surface: TextDraw['surface'], options: object): number;
  prepare(surface: TextDraw['surface'], options: object): unknown;
  frame(context: TextReveal, options: object): undefined;
}
// First-party recipes use the same bounded painter and document scheduler as
// author callbacks. Their fixed capabilities need no custom-target collection.
export function createTextRunner(
  host: HTMLElement,
  report: (code: string) => void,
  invalidate: () => void,
): Runner {
  let painter: Painter | undefined, release: (() => void) | undefined;
  let last = 0,
    phase = 0,
    previousSpeed = 1,
    failed = false;
  const dispose = () => {
    release?.();
    release = undefined;
    painter?.dispose();
    painter = undefined;
    last = 0;
  };
  return {
    capture: () => capturePainter(painter),
    reset() {
      failed = false;
    },
    dispose,
    draw(binding, still, speed) {
      if (
        still &&
        (host.ownerDocument.hidden ||
          host.matches('[hidden],[data-dotquilt-offscreen]') ||
          !host.clientWidth ||
          !host.clientHeight)
      ) {
        dispose();
        return;
      }
      if (failed || !binding) return;
      try {
        const time = now(host),
          deltaMs = last ? Math.min(100, time - last) : 0;
        phase += deltaMs * previousSpeed;
        previousSpeed = speed;
        last = still ? 0 : time;
        const definition = definitionOf(binding) as unknown as IdleRecipe;
        painter ??= createPainter(host, report, undefined, true);
        painter.draw((dot) => {
          const context: TextDraw = {
            surface: (host as TextLoader)[readSurface]('text'),
            timeMs: phase,
            dot,
          };
          (still ? definition.still : definition.frame)(
            context,
            binding.options,
          );
        });
        if (still) {
          release?.();
          release = undefined;
        } else if (host.isConnected) release ??= frames(host, invalidate);
      } catch {
        failed = true;
        dispose();
        report('animation-failed');
      }
    },
  };
}
export const createTextHandoff: HandoffFactory = (
  binding,
  { host, content, targets, duration: requestedDuration, current, own, report },
) => {
  if (targets.length) throw new TypeError();
  const definition = definitionOf(binding) as unknown as HandoffRecipe;
  const surface = (host as TextLoader)[readSurface]('text');
  const duration =
    requestedDuration ?? definition.duration(surface, binding.options);
  const prepared = definition.prepare(surface, binding.options);
  const reveal = createEffect(content, own);
  const rtl =
    host.ownerDocument.defaultView?.getComputedStyle(host).direction === 'rtl';
  let painter: Painter | undefined, release: (() => void) | undefined;
  return {
    duration,
    draw(p) {
      painter ??= createPainter(host, report, undefined, true);
      painter.draw((dot) => {
        const context: TextReveal = {
          surface,
          prepared: prepared as Readonly<unknown>,
          timeMs: duration * p,
          progress: p,
          rtl,
          dot,
          reveal(frame: TextRevealFrame) {
            if (!current()) return;
            // A soft front: opaque behind it, clear ahead, `edge` px between.
            const { front, edge = 0 } = frame;
            reveal({
              opacity: frame.opacity,
              translate: `0 ${frame.translateY ?? 0}px`,
              ...(front === undefined
                ? {
                    clipPath: `inset(0 ${(1 - (frame.clipStart ?? 1)) * 100}% 0 0)`,
                  }
                : {
                    maskImage: `linear-gradient(${frame.rtl ? 270 : 90}deg,#000 ${(front - edge).toFixed(1)}px,#0000 ${front.toFixed(1)}px)`,
                  }),
            });
          },
        };
        definition.frame(context, binding.options);
      });
    },
    activate(callback) {
      release ??= frames(host, callback);
    },
    dispose() {
      release?.();
      release = undefined;
      painter?.dispose();
    },
  };
};
