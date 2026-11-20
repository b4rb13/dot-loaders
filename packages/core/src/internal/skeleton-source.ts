import type { LoadingRegion } from '../region.js';
import type { SkeletonBlock } from '../skeleton-block.js';
import { definitionOf } from './binding.js';
import { dissolveSkeleton } from './dissolve.js';
import { media } from './dom.js';
import type { HandoffDriver, HandoffSource } from './handoff.js';
import { handoff } from './marks.js';
import {
  type SkeletonExit,
  type SkeletonParticipant,
  skeletonHandoff,
} from './skeleton-handoff.js';
import { targetChanges } from './target-changes.js';

/**
 * The morph (morph.ts) is about a third of the region's code and runs only
 * when data arrives, so it loads on its own: the first time a region shows
 * its placeholder (owner decision, 2026-11-20). A region that becomes ready
 * before it has loaded hands over with the spec's dissolve or fade instead.
 */
let morph: typeof import('./morph.js') | undefined;
let requested = false;
export function loadMorph(): void {
  if (requested) return;
  requested = true;
  import('./morph.js').then(
    (module) => {
      morph = module;
    },
    // A failed load leaves the dissolve and fade in place.
    () => {},
  );
}

/**
 * Starts one skeleton's dissolve and returns its release. The dissolve is
 * the region's code (dissolve.ts): only a region hands a skeleton over.
 */
function launch(
  skeleton: HTMLElement,
  exit: SkeletonExit,
  duration: number,
  easing: string | undefined,
  own: (animation: Animation) => void,
  invalidate: () => void,
): () => void {
  if (!exit.dissolves || !exit.canAnimate()) return () => {};
  const effect = dissolveSkeleton(
    skeleton,
    duration,
    easing,
    exit.departure,
    own,
    invalidate,
    exit.report,
  );
  const unwatch = exit.watch(effect.check);
  return () => {
    unwatch();
    effect.dispose();
  };
}

export function createSkeletonSource(
  child: SkeletonBlock | undefined,
  owner: LoadingRegion,
  participants: readonly HTMLElement[],
): HandoffSource {
  const exits = participants.flatMap((participant) =>
    skeletonHandoff in participant
      ? [
          [
            participant,
            (participant as SkeletonParticipant)[skeletonHandoff](),
          ] as const,
        ]
      : [],
  );
  const easing = owner.timing.easing;
  return {
    binding: child?.animations.handoff ?? child?.preset?.animations?.handoff,
    host: child ?? owner,
    animation: child ? 'dotquilt/dissolve' : 'dotquilt/fade',
    prepare(binding, request) {
      const { targets, duration: requestedDuration, current, own } = request;
      // With no animation chosen anywhere, the placeholder takes the content's
      // shape and then hands over (morph.ts). Anything it can't read, or a
      // morph that hasn't loaded yet, falls back to the spec's dissolve.
      const win = owner.ownerDocument.defaultView;
      // Only for Dotquilt placeholders: a region around anything else fades.
      if (
        morph &&
        !binding &&
        request.placeholder &&
        participants.length &&
        win &&
        !media(win, '(forced-colors: active)')
      )
        try {
          return morph.createMorph(
            owner,
            participants as HTMLElement[],
            request.placeholder,
            request,
            requestedDuration ?? handoff.duration,
          );
        } catch {}
      const definition = binding && definitionOf(binding);
      const driver = binding && definition?.handoff?.(binding, request);
      // The controller validates a missing/malformed custom fade driver and settles
      // with the same animation-failed diagnostic as the original strict route.
      if (!child && binding) return driver as HandoffDriver;
      const duration =
        driver?.duration ??
        requestedDuration ??
        (binding?.options as { duration?: number } | undefined)?.duration ??
        handoff.duration;
      const releases: (() => void)[] = [];
      return {
        duration,
        targetsChanged: targetChanges(targets),
        draw: driver?.draw,
        activate(callback) {
          if (!definition || definition.dissolve) {
            for (const [skeleton, exit] of exits) {
              releases.push(
                launch(skeleton, exit, duration, easing, own, () =>
                  owner.refresh(),
                ),
              );
              if (!current()) {
                for (const release of releases) release();
                return;
              }
            }
          }
          driver?.activate(callback);
        },
        dispose() {
          driver?.dispose();
          for (const release of releases) release();
        },
      };
    },
  };
}
