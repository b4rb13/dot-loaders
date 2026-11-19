import type { LoadingRegion } from '../region.js';
import type { SkeletonBlock } from '../skeleton-block.js';
import { definitionOf } from './binding.js';
import { media } from './dom.js';
import type { HandoffDriver, HandoffSource } from './handoff.js';
import { handoff } from './marks.js';
import { createMorph } from './morph.js';
import { skeletonHandoff } from './skeleton-handoff.js';
import { targetChanges } from './target-changes.js';
export function createSkeletonSource(
  child: SkeletonBlock | undefined,
  owner: LoadingRegion,
  participants: readonly HTMLElement[],
): HandoffSource {
  const launches = participants.flatMap((participant) =>
    skeletonHandoff in participant
      ? [(participant as SkeletonBlock)[skeletonHandoff]()]
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
      // shape and then hands over (morph.ts). Anything it can't read falls
      // back to the spec's dissolve.
      const win = owner.ownerDocument.defaultView;
      // Only for Dotquilt placeholders: a region around anything else fades.
      if (
        !binding &&
        request.placeholder &&
        participants.length &&
        win &&
        !media(win, '(forced-colors: active)')
      )
        try {
          return createMorph(
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
            for (const launch of launches) {
              releases.push(
                launch(duration, easing, own, () => owner.refresh()),
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
