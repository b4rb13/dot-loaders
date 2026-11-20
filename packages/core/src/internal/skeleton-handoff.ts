/**
 * What a skeleton tells the region that hands it over. The region owns the
 * time, the restrictions and the dissolve itself (dissolve.ts); the skeleton
 * only says how its marks should leave.
 */
export const skeletonHandoff: unique symbol = Symbol(
  'dotquilt.skeleton-handoff',
);

/** How the marks leave: vertical drift (negative is up) and how much they shrink. */
export interface Departure {
  readonly driftPx: number;
  readonly shrink: number;
}

export interface SkeletonExit {
  /** False when the skeleton's own handoff animation replaces the dissolve. */
  readonly dissolves: boolean;
  readonly departure: Departure;
  canAnimate(): boolean;
  report(code: string): void;
  /**
   * Hands the skeleton the dissolve's geometry check, which it runs when it
   * redraws mid-handoff. Returns the release.
   */
  watch(check: () => void): () => void;
}

export interface SkeletonParticipant extends HTMLElement {
  [skeletonHandoff](): SkeletonExit;
}
