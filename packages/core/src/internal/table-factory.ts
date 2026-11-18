import type {
  AnimationBinding,
  AnimationFactory,
  AnimationPhase,
} from '../animations.js';
import { LoaderConfigurationError } from '../types.js';
import { brand } from './binding.js';
import { clamp } from './math.js';
export const tableCellStyles = /* @__PURE__ */ Object.freeze([
  'auto',
  'text',
  'number',
  'badge',
  'date',
  'badge-text',
  'text-badge',
]);
export function tableBinding<P extends AnimationPhase, O extends object>(
  definition: Readonly<{ family: 'table'; phase: P; id: string }>,
  options: O,
): AnimationBinding<'table', P, O> {
  return Object.freeze({
    contractVersion: 1,
    family: 'table',
    phase: definition.phase,
    id: definition.id,
    options: Object.freeze(options),
    [brand]: definition,
  }) as unknown as AnimationBinding<'table', P, O>;
}
export function tableFactory<P extends AnimationPhase, O extends object>(
  definition: Readonly<{ family: 'table'; phase: P; id: string }>,
  schema: Record<string, readonly [number, number, number]>,
  styles = false,
): AnimationFactory<'table', P, O> {
  return (options = {} as Partial<O>) => {
    if (
      !options ||
      Object.getPrototypeOf(options) !== Object.prototype ||
      Reflect.ownKeys(options).some(
        (k) => !Object.hasOwn(schema, k) && !(styles && k === 'cellStyle'),
      )
    )
      throw new LoaderConfigurationError(
        'invalid-options',
        'Invalid table options',
      );
    const out = { ...options } as Record<string, unknown>;
    for (const [key, [fallback, min, max]] of Object.entries(schema)) {
      const n = out[key] ?? fallback;
      if (!Number.isFinite(n))
        throw new LoaderConfigurationError(
          'invalid-options',
          'Invalid table options',
        );
      out[key] = clamp(n as number, min, max);
    }
    if (styles) {
      const style = out.cellStyle ?? 'auto';
      if (!tableCellStyles.includes(style as string))
        throw new LoaderConfigurationError(
          'invalid-options',
          'Invalid cell style',
        );
      out.cellStyle = style;
    }
    return tableBinding(definition, out as O);
  };
}
