import type { RevealFrame } from '../animations.js';
import { createEffect } from './effect.js';
export function revealValues(
  opacity: number,
  translateY: number,
  clipStart: number,
  clip: boolean,
): PropertyIndexedKeyframes {
  return {
    opacity,
    translate: `0 ${translateY}px`,
    ...(clip ? { clipPath: `inset(0 ${(1 - clipStart) * 100}% 0 0)` } : {}),
  };
}
/** Trusted engine commands; custom definitions provide the validated mapper. */
export function createRevealEffect(
  element: HTMLElement,
  own: (animation: Animation) => void,
  clip: boolean,
  map = revealValues,
) {
  let animation: Animation | undefined;
  const effect = createEffect(element, (value) => {
    animation = value;
    own(value);
  });
  return {
    get animation() {
      return animation;
    },
    draw({ opacity, translateY = 0, clipStart = 1 }: RevealFrame) {
      effect(map(opacity, translateY, clipStart, clip));
    },
  };
}
