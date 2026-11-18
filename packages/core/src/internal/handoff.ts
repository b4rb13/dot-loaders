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
/** A running handoff, as the loading controller drives it frame by frame. */
export interface HandoffDriver {
  duration: number;
  restricted?: (() => boolean) | undefined;
  targetsChanged?: ((next: readonly RevealTarget[]) => boolean) | undefined;
  draw?: ((linear: number, eased?: number) => void) | undefined;
  activate(callback: () => void): void;
  dispose(): void;
}
export type HandoffBinding = AnimationBinding<AnimationFamily, 'handoff'>;
/** What the loading controller gives a handoff when the region becomes ready. */
export interface HandoffRequest {
  /** The element whose surface the handoff draws on. */
  readonly host: HTMLElement;
  /** The region's content layer, which the handoff reveals. */
  readonly content: HTMLElement;
  readonly targets: readonly RevealTarget[];
  /** The caller's `timing.duration`; undefined lets the definition decide. */
  readonly duration: number | undefined;
  /** False once this handoff has been superseded or cancelled. */
  readonly current: () => boolean;
  /** Registers a Web Animation so it is cancelled with the handoff. */
  readonly own: (animation: Animation) => void;
  readonly report: (code: string) => void;
  /** Set when a coordinated handoff merges several sources' output. */
  readonly scope?: HandoffScope | undefined;
}
export type HandoffFactory = (
  binding: HandoffBinding,
  request: HandoffRequest,
) => HandoffDriver;
/** Where a region's handoff comes from: a placeholder, or the region itself. */
export interface HandoffSource {
  /** Used when neither the region nor its preset picks a handoff. */
  readonly binding: HandoffBinding | undefined;
  readonly host: HTMLElement;
  /** Reported in handoff events when no binding is in use. */
  readonly animation: string;
  /** Replaces the binding's own factory (rich, skeleton and coordinated sources). */
  readonly prepare?: (
    binding: HandoffBinding | undefined,
    request: HandoffRequest,
  ) => HandoffDriver;
}
/** Starts a source's handoff; throws when no factory can run it. */
export function runHandoff(
  prepare: HandoffSource['prepare'],
  binding: HandoffBinding | undefined,
  request: HandoffRequest,
): HandoffDriver {
  if (prepare) return prepare(binding, request);
  const factory = binding && definitionOf(binding).handoff;
  if (!binding || !factory) throw new TypeError();
  return factory(binding, request);
}
export const createHandoff: HandoffFactory = (
  binding,
  {
    host,
    content,
    targets,
    duration: requestedDuration,
    current,
    own,
    report,
    scope,
  },
) => {
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
      definition.draw({
        surface,
        options: binding.options,
        prepared,
        linear: p,
        progress: eased,
        duration: total,
        deltaMs,
        dot,
        reveal(frame) {
          if (current()) {
            if (scope) scope.reveal(frame);
            else (reveal as ReturnType<typeof definition.reveal>).draw(frame);
          }
        },
        revealTarget(id, frame) {
          if (current()) {
            if (scope) return scope.target(id, frame);
            if (!targetMap.draw) throw new TypeError();
            targetMap.draw(id, frame);
          }
        },
      }),
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
};
