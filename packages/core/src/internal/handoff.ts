import type {
  AnimationBinding,
  AnimationFamily,
  HandoffDefinition,
  RevealFrame,
  RevealTarget,
} from '../animations.js';
import { definitionOf } from './binding.js';
import { frames } from './frames.js';
import type { HandoffPaint } from './paint.js';
import type { Painter } from './painter.js';
import { createPainter } from './painter.js';
import type { surface as snapshot } from './surface.js';
import type { TargetTracker } from './target-tracker.js';
/** Private shared-wrapper output capability; never exposed to authored callbacks. */
export interface HandoffScope {
  readonly targets: TargetTracker;
  duration(): number;
  reveal(frame: RevealFrame): void;
  target(id: string, frame: RevealFrame): void;
}
export interface HandoffDriver {
  duration: number;
  restricted?: (() => boolean) | undefined;
  targetsChanged?: ((next: readonly RevealTarget[]) => boolean) | undefined;
  draw?: ((linear: number, eased?: number) => void) | undefined;
  activate(callback: () => void): void;
  dispose(): void;
}
export function createHandoff(
  binding: AnimationBinding<AnimationFamily, 'handoff'>,
  host: HTMLElement,
  content: HTMLElement,
  targets: readonly RevealTarget[],
  requestedDuration: number | undefined,
  current: () => boolean,
  own: (animation: Animation) => void,
  report: (code: string) => void,
  scope?: HandoffScope,
): HandoffDriver {
  const definition = definitionOf(binding) as HandoffDefinition<
    AnimationFamily,
    object,
    unknown
  > & {
    targets: import('./target-tracker.js').TargetFactory;
    reveal: typeof import('./reveal-effect.js').createRevealEffect;
    draw: HandoffPaint;
    snapshot: typeof snapshot;
    painter?: typeof createPainter;
  };
  const surface = definition.snapshot(
    host,
    binding.family,
    targets.map((t) => t.id),
  );
  const duration =
    requestedDuration ?? definition.duration(surface, binding.options);
  const prepared = definition.prepare(surface, binding.options);
  const targetMap = scope?.targets ?? definition.targets(content, targets, own);
  const reveal = scope ?? definition.reveal(content, own, true);
  let painter: Painter | undefined;
  let release: (() => void) | undefined;
  let resize: ResizeObserver | undefined;
  let invalidated = false;
  const dispose = () => {
    release?.();
    release = undefined;
    resize?.disconnect();
    painter?.dispose();
  };
  let lastProgress = 0;
  const draw: HandoffDriver['draw'] = (p, eased = p) => {
    if (invalidated || !current()) throw new TypeError();
    targetMap.check();
    painter ??= (definition.painter ?? createPainter)(
      host,
      report,
      binding.family === 'chart' || binding.family === 'table'
        ? 'surface'
        : undefined,
    );
    const total = scope?.duration() ?? duration;
    const deltaMs = (p - lastProgress) * total;
    lastProgress = p;
    painter.draw((dot) =>
      definition.draw(
        surface,
        binding.options,
        prepared,
        p,
        eased,
        total,
        deltaMs,
        dot,
        (frame) => {
          if (current()) {
            if (scope) scope.reveal(frame);
            else (reveal as ReturnType<typeof definition.reveal>).draw(frame);
          }
        },
        (id, frame) => {
          if (current()) {
            if (scope) return scope.target(id, frame);
            if (!targetMap.draw) throw new TypeError();
            targetMap.draw(id, frame);
          }
        },
      ),
    );
  };
  return {
    duration,
    targetsChanged: targetMap.changed,
    draw,
    dispose,
    activate(callback) {
      if (scope) return;
      release ??= frames(host, callback);
      const bounds = new Map<HTMLElement, DOMRect>();
      for (const element of [host, content, ...targets.map((t) => t.element)])
        bounds.set(element, element.getBoundingClientRect());
      resize = new ResizeObserver((entries) => {
        if (!current()) return;
        for (const { target } of entries) {
          const before = bounds.get(target as HTMLElement);
          const after = target.getBoundingClientRect();
          // Translation can perturb floating-point rect subtraction in WebKit.
          // A layout unit still invalidates; numerical noise does not.
          if (
            before &&
            (Math.abs(before.width - after.width) >= 1 / 64 ||
              Math.abs(before.height - after.height) >= 1 / 64)
          ) {
            invalidated = true;
            callback();
            return;
          }
        }
      });
      for (const element of bounds.keys()) resize.observe(element);
    },
  };
}
