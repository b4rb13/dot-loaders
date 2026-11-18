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

export const ridgeHeight = (nx: number, h: number, t: number, a: number) =>
  h *
  (0.48 +
    a *
      (Math.sin(nx * 8 - t * 0.7) * 0.6 +
        Math.sin(nx * 17 + t * 0.3) * 0.2 +
        Math.cos(nx * 4 - t * 0.5) * 0.4));
