/** Inclusive finite-command bounds, shared by recipes and owned rendering. */
export const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.max(minimum, Math.min(maximum, value));
