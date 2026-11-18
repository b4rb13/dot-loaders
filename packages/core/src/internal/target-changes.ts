import type { RevealTarget } from '../animations.js';
/** Additions are allowed; replacing or removing captured targets settles the handoff. */
export const targetChanges =
  (targets: readonly RevealTarget[]) => (next: readonly RevealTarget[]) =>
    targets.some(
      (old) =>
        !next.some(
          (target) => old.id === target.id && old.element === target.element,
        ),
    );
