import type { AnimationFactory, AnimationPhase } from '../animations.js';
import { LoaderConfigurationError } from '../types.js';
import { brand } from './binding.js';
import { clamp } from './math.js';

/** First-party schemas contain only a few finite numbers, never caller graphs. */
export function chartFactory<P extends AnimationPhase, O extends object>(
  definition: Readonly<{ family: 'chart'; phase: P; id: string }>,
  schema: Record<keyof O, readonly [number, number, number]>,
): AnimationFactory<'chart', P, O> {
  return (options = {} as Readonly<Partial<O>>) => {
    if (
      !options ||
      Object.getPrototypeOf(options) !== Object.prototype ||
      Reflect.ownKeys(options).some((key) => !Object.hasOwn(schema, key))
    )
      throw new LoaderConfigurationError(
        'invalid-options',
        'Invalid chart options',
      );
    const parsed = { ...options } as Record<string, number>;
    for (const key of Object.keys(schema) as (keyof O & string)[]) {
      const [fallback, min, max] = schema[key];
      const value = parsed[key] ?? fallback;
      if (!Number.isFinite(value))
        throw new LoaderConfigurationError(
          'invalid-options',
          'Invalid chart options',
        );
      parsed[key] = clamp(value as number, min, max);
    }
    return chartBinding<P, O>(definition, parsed as O);
  };
}

export function chartBinding<P extends AnimationPhase, O extends object>(
  definition: Readonly<{ family: 'chart'; phase: P; id: string }>,
  parsed: O,
): ReturnType<AnimationFactory<'chart', P, O>> {
  return Object.freeze({
    contractVersion: 1,
    family: 'chart',
    phase: definition.phase,
    id: definition.id,
    options: Object.freeze(parsed),
    [brand]: definition,
  }) as unknown as ReturnType<AnimationFactory<'chart', P, O>>;
}
