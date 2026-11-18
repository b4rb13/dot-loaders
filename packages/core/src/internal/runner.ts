import type { AnimationBinding, AnimationFamily } from '../animations.js';
import { definitionOf } from './binding.js';
import { capturePainter } from './capture.js';
import { frames } from './frames.js';
import type { IdlePaint } from './paint.js';
import { createPainter, type Painter } from './painter.js';
import type { surface } from './surface.js';
import { now } from './time.js';
export interface Runner {
  draw(
    binding: AnimationBinding<AnimationFamily, 'idle'> | undefined,
    still: boolean,
    speed: number,
    remaining?: number,
  ): void;
  capture?(): readonly import('../animations.js').Dot[];
  reset?(): void;
  dispose(): void;
}
export function createRunner(
  host: HTMLElement,
  report: (code: string) => void,
  invalidate: () => void,
  makePainter: typeof createPainter = createPainter,
): Runner {
  let painter: Painter | undefined;
  let release: (() => void) | undefined;
  let failed = false;
  let last = 0,
    phase = 0,
    previousSpeed = 1;
  const schedule = (active: boolean, callback: () => void) => {
    if (active) release ??= frames(host, callback);
    else {
      release?.();
      release = undefined;
    }
  };
  const dispose = () => {
    schedule(false, invalidate);
    painter?.dispose();
    painter = undefined;
    last = 0;
  };
  return {
    capture: () => capturePainter(painter),
    reset() {
      failed = false;
    },
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
      if (failed) return;
      try {
        const time = now(host),
          deltaMs = last ? Math.min(100, time - last) : 0;
        phase += deltaMs * previousSpeed;
        last = still ? 0 : time;
        previousSpeed = speed;
        if (!binding) return;
        const definition = definitionOf(binding) as unknown as {
          draw: IdlePaint;
          snapshot: typeof surface;
        };
        painter ??= makePainter(
          host,
          report,
          binding.family === 'chart' || binding.family === 'table'
            ? 'surface'
            : undefined,
        );
        painter.draw((dot) =>
          definition.draw({
            surface: definition.snapshot(host, binding.family),
            options: binding.options,
            timeMs: phase,
            deltaMs,
            still,
            dot,
          }),
        );
        schedule(!still && host.isConnected, invalidate);
      } catch {
        failed = true;
        dispose();
        report('animation-failed');
      }
    },
    dispose,
  };
}
