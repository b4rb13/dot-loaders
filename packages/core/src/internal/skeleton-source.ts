import type { LoadingRegion } from '../region.js';
import type { SkeletonBlock } from '../skeleton-block.js';
import { definitionOf } from './binding.js';
import type { HandoffDriver } from './handoff.js';
import type { LoadingController } from './loading-controller.js';
import { skeletonHandoff } from './skeleton-handoff.js';
import { targetChanges } from './target-changes.js';
export function createSkeletonSource(
  child: SkeletonBlock | undefined,
  owner: LoadingRegion,
  participants: readonly HTMLElement[],
): ReturnType<LoadingController['handoffSource']> {
  const launches = participants.flatMap((participant) =>
    skeletonHandoff in participant
      ? [(participant as SkeletonBlock)[skeletonHandoff]()]
      : [],
  );
  const easing = owner.timing.easing ?? 'ease-out';
  return [
    child?.animations.handoff ?? child?.preset?.animations?.handoff,
    child ?? owner,
    child ? 'dotquilt/dissolve' : 'dotquilt/fade',
    (
      binding,
      host,
      content,
      targets,
      requestedDuration,
      current,
      own,
      report,
    ) => {
      const definition = binding && definitionOf(binding);
      const driver = definition?.handoff?.(
        binding as NonNullable<typeof binding>,
        host,
        content,
        targets,
        requestedDuration,
        current,
        own,
        report,
      );
      // The controller validates a missing/malformed custom fade driver and settles
      // with the same animation-failed diagnostic as the original strict route.
      if (!child && binding) return driver as HandoffDriver;
      const duration =
        driver?.duration ??
        requestedDuration ??
        (binding?.options as { duration?: number } | undefined)?.duration ??
        (child ? 300 : 150);
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
  ];
}
