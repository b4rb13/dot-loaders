import type { RevealFrame, RevealTarget } from '../animations.js';
import { createReveal } from './reveal.js';
import type { TargetTracker } from './target-tracker.js';
import { createTargetTracker } from './target-tracker.js';
export function createTargets(
  content: HTMLElement,
  targets: readonly RevealTarget[],
  own: (animation: Animation) => void,
): TargetTracker {
  const tracker = createTargetTracker(content, targets);
  return {
    ...tracker,
    draw(id: string, frame: RevealFrame) {
      const target = tracker.records.find((t) => t.id === id);
      if (!target?.element.isConnected) throw new TypeError();
      target.effect ??= createReveal(target.element, own, false);
      target.effect.draw(frame);
    },
  };
}
