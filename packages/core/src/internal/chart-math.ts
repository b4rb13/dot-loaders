import { clamp } from './math.js';
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
export const noise = (x: number, t: number) =>
  0.5 +
  0.25 * Math.sin(x * 0.041 + t * 0.46) +
  0.15 * Math.sin(x * 0.017 - t * 0.71) +
  0.1 * Math.cos(x * 0.083 + t * 0.19);

/**
 * The ridge line from design/SPEC.md's mockup: two slow sines drifting in
 * opposite directions. `nx` is the position across (0–1), `t` seconds.
 */
export const ridgeHeight = (nx: number, h: number, t: number, a: number) =>
  h *
  (0.5 +
    a *
      (0.83 * Math.sin(2 * Math.PI * (1.1 * nx - t / 7.2)) +
        0.29 * Math.sin(2 * Math.PI * (2.9 * nx + t / 4.32))));
