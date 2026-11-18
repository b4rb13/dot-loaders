import type { AnimationFactory } from './animations.js';
import {
  fadeDefinition,
  labelPulseDefinition,
  lockDefinition,
  scrambleDefinition,
  textBinding,
} from './internal/text-definitions.js';
import { LoaderConfigurationError } from './types.js';
export interface ScrambleOptions {
  readonly changesPerSecond: number;
}
export interface LabelPulseOptions {
  readonly travelPxPerSecond: number;
}
export interface TextHandoffOptions {
  readonly staggerMs: number;
  readonly reelMs: number;
  readonly settleMs: number;
  readonly pop: number;
}
function factory<O extends object, P extends 'idle' | 'handoff'>(
  definition: { family: 'text'; phase: P; id: string },
  schema: Record<keyof O, readonly [number, number, number]>,
): AnimationFactory<'text', P, O> {
  return (options = {} as Readonly<Partial<O>>) => {
    if (
      !options ||
      Object.getPrototypeOf(options) !== Object.prototype ||
      Object.keys(options).some((key) => !Object.hasOwn(schema, key))
    )
      throw new LoaderConfigurationError(
        'invalid-options',
        'Invalid text animation options',
      );
    const parsed: Record<string, number> = {};
    for (const key of Object.keys(schema) as (keyof O)[]) {
      const [fallback, min, max] = schema[key],
        value = options[key] ?? fallback;
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new LoaderConfigurationError(
          'invalid-options',
          'Invalid text animation option',
        );
      parsed[String(key)] = Math.max(min, Math.min(max, value));
    }
    return textBinding(definition, parsed) as ReturnType<
      AnimationFactory<'text', P, O>
    >;
  };
}
export const scramble = /* @__PURE__ */ factory<ScrambleOptions, 'idle'>(
  scrambleDefinition,
  { changesPerSecond: [1000 / 280, 0.5, 4] },
);
export const labelPulse = /* @__PURE__ */ factory<LabelPulseOptions, 'idle'>(
  labelPulseDefinition,
  { travelPxPerSecond: [70, 20, 140] },
);
const handoffSchema = {
  staggerMs: [40, 0, 60],
  reelMs: [55, 0, 100],
  settleMs: [300, 40, 400],
  pop: [0, 0, 0.3],
} as const;
export const lock = /* @__PURE__ */ factory<TextHandoffOptions, 'handoff'>(
  lockDefinition,
  handoffSchema,
);
export const fade = /* @__PURE__ */ factory<
  { readonly duration: number },
  'handoff'
>(fadeDefinition, { duration: [150, 0, 4000] });
