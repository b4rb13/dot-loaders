import type {
  AnimationBinding,
  AnimationFamily,
  AnimationPhase,
  HandoffDefinition,
  IdleDefinition,
} from '../animations.js';
import type { HandoffFactory } from './handoff.js';
import type { Runner } from './runner.js';
export const brand: unique symbol = Symbol('dotquilt.animation');
type Definition = (
  | IdleDefinition<AnimationFamily, object>
  | HandoffDefinition<AnimationFamily, object, unknown>
) & {
  runner?: (
    host: HTMLElement,
    report: (code: string) => void,
    invalidate: () => void,
  ) => Runner;
  handoff?: HandoffFactory;
  dissolve?: boolean;
};
export function definitionOf(
  binding: AnimationBinding<AnimationFamily, AnimationPhase>,
): Definition {
  const value = binding[brand] as unknown as Definition;
  if (
    !value ||
    binding.contractVersion !== 1 ||
    value.family !== binding.family ||
    value.phase !== binding.phase
  )
    throw new TypeError();
  return value;
}

/** Validate a family map without importing the optional animation authoring runtime. */
export function validateBindings(
  bindings: import('../animations.js').Animations<AnimationFamily> | undefined,
  family: AnimationFamily,
): void {
  for (const phase of ['idle', 'handoff'] as const) {
    const binding = bindings?.[phase];
    if (binding) {
      if (binding.family !== family || binding.phase !== phase)
        throw new TypeError();
      definitionOf(binding);
    }
  }
}
