import type { RevealFrame, RevealTarget } from '../animations.js';
import { ancestors } from './dom.js';
import type { createReveal } from './reveal.js';
import { targetChanges } from './target-changes.js';
export interface TargetTracker {
  changed(next: readonly RevealTarget[]): boolean;
  check(): void;
  draw?: (id: string, frame: RevealFrame) => void;
}
export type TargetFactory = (
  content: HTMLElement,
  targets: readonly RevealTarget[],
  own: (animation: Animation) => void,
) => TargetTracker;
interface TargetRecord extends RevealTarget {
  effect?: ReturnType<typeof createReveal>;
}
/** Records retain ownership checks without importing custom target drawing. */
export function createTargetTracker(
  content: HTMLElement,
  targets: readonly RevealTarget[],
) {
  const owner = content.getRootNode() as ShadowRoot;
  const assigned = (
    content.firstElementChild as HTMLSlotElement
  ).assignedElements();
  const records: TargetRecord[] = targets.map(({ id, element }, i) => {
    if (
      !id ||
      targets.some((t, j) => j < i && (t.id === id || t.element === element)) ||
      element.matches('dotquilt-region,dotquilt-text-loader') ||
      ancestors(element).find((el) =>
        el.matches('dotquilt-region,dotquilt-text-loader'),
      ) !== owner.host ||
      !assigned.some((el) => el === element || el.contains(element))
    )
      throw new TypeError();
    return { id, element };
  });
  return {
    records,
    changed: targetChanges(targets),
    check() {
      for (const { element, effect } of records)
        if (
          element
            .getAnimations()
            .some(
              (animation) =>
                animation !== effect?.animation &&
                animation.effect &&
                (animation.effect as KeyframeEffect)
                  .getKeyframes()
                  .some(
                    (frame) =>
                      'opacity' in frame ||
                      'translate' in frame ||
                      'clipPath' in frame,
                  ),
            )
        )
          throw new TypeError();
    },
  };
}
