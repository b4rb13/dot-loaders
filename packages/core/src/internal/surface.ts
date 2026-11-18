import type { AnimationFamily, AnimationSurface } from '../animations.js';
export const readSurface: unique symbol = Symbol.for('dotquilt.surface.v1');
type SurfaceHost = HTMLElement & {
  [readSurface]<F extends AnimationFamily>(
    family: F,
    ids: readonly string[],
  ): AnimationSurface<F>;
};
export function nativeSurface<F extends AnimationFamily>(
  host: HTMLElement,
  family: F,
  ids: readonly string[] = [],
): AnimationSurface<F> {
  return (host as SurfaceHost)[readSurface](family, ids);
}
export function surface<F extends AnimationFamily>(
  host: HTMLElement,
  family: F,
  ids: readonly string[] = [],
): AnimationSurface<F> {
  if ((host as SurfaceHost)[readSurface])
    return nativeSurface(host, family, ids);
  const { width, height } = host.getBoundingClientRect();
  return Object.freeze({
    family,
    width,
    height,
    input: Object.freeze({
      shapes: Object.freeze(
        family === 'skeleton'
          ? [Object.freeze({ x: 0, y: 0, width, height })]
          : [],
      ),
    }),
    source: Object.freeze([]),
    revealTargetIds: Object.freeze([...ids]),
  }) as unknown as AnimationSurface<F>;
}
