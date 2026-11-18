import { clamp } from './math.js';
import { createRevealEffect, revealValues } from './reveal-effect.js';

function validatedValues(
  opacity: number,
  translateY: number,
  clipStart: number,
  clip: boolean,
) {
  if (![opacity, translateY, clipStart].every(Number.isFinite))
    throw new TypeError();
  return revealValues(
    clamp(opacity),
    clamp(translateY, -8, 8),
    clamp(clipStart),
    clip,
  );
}
/** Authored/proof commands retain finite validation and the established clamps. */
export function createReveal(
  element: HTMLElement,
  own: (animation: Animation) => void,
  clip: boolean,
) {
  return createRevealEffect(element, own, clip, validatedValues);
}
