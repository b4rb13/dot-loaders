import type { AnimationFamily, Animations } from '../animations.js';
import {
  LoaderConfigurationError,
  type Motion,
  type Timing,
} from '../types.js';
import { validateBindings } from './binding.js';
import {
  accept,
  capturePresetData,
  countRule,
  motionRule,
  type PresetSchema,
  plain,
  pointerRule,
  speedRule,
  variantRule,
} from './preset-data.js';
export type PresetKind = AnimationFamily | 'typing';
/** Local defaults only: application content, readiness and style credentials stay outside presets. */
export interface Preset<K extends PresetKind = PresetKind> {
  readonly kind: K;
  readonly motion?: Motion | undefined;
  readonly speed?: K extends 'region' ? never : number | undefined;
  readonly pointerResponse?: K extends 'region' | 'typing'
    ? never
    : 'none' | 'lift' | undefined;
  readonly variant?: K extends 'chart'
    ? import('../chart.js').ChartVariant | undefined
    : never;
  readonly count?: K extends 'typing' ? number | undefined : never;
  readonly timing?: K extends 'text' | 'region' ? Timing | undefined : never;
  readonly animations?: K extends AnimationFamily
    ?
        | (K extends 'region' ? Pick<Animations<K>, 'handoff'> : Animations<K>)
        | undefined
    : never;
}

function easing(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (/^(linear|ease(-in)?(-out)?)$/.test(value)) return true;
  const match = /^cubic-bezier\(([^()]+)\)$/.exec(value);
  const parts = match?.[1]?.split(',').map((part) => part.trim());
  if (
    parts?.length !== 4 ||
    parts.some((part) => !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(part))
  )
    return false;
  const numbers = parts.map(Number);
  return (
    numbers.every(Number.isFinite) &&
    [numbers[0], numbers[2]].every(
      (number) => number !== undefined && number >= 0 && number <= 1,
    )
  );
}

const timingRule = (input: Timing): Timing => {
  if (!plain(input)) throw new TypeError();
  const value = { ...input };
  return Object.freeze(
    accept(
      value,
      !Reflect.ownKeys(value).some(
        (key) => key !== 'duration' && key !== 'easing',
      ) &&
        (value.duration === undefined ||
          (typeof value.duration === 'number' &&
            Number.isFinite(value.duration) &&
            value.duration >= 0)) &&
        (value.easing === undefined || easing(value.easing)),
    ),
  );
};
const animationRule = (
  input: Animations<AnimationFamily>,
  kind: PresetKind,
): Animations<AnimationFamily> => {
  if (!plain(input)) throw new TypeError();
  const value = { ...input };
  if (
    Reflect.ownKeys(value).some(
      (key) => key !== 'handoff' && (key !== 'idle' || kind === 'region'),
    )
  )
    throw new TypeError();
  validateBindings(value, kind as AnimationFamily);
  return Object.freeze(value);
};
export const skeletonPreset: PresetSchema = /*@__PURE__*/ Object.freeze({
  animations: animationRule,
  motion: motionRule,
  speed: speedRule,
  pointerResponse: pointerRule,
});
export const regionPreset: PresetSchema = /*@__PURE__*/ Object.freeze({
  timing: timingRule,
  animations: animationRule,
  motion: motionRule,
});
export const textPreset: PresetSchema = /*@__PURE__*/ Object.freeze({
  timing: timingRule,
  animations: animationRule,
  motion: motionRule,
  speed: speedRule,
  pointerResponse: pointerRule,
});
export const chartPreset: PresetSchema = /*@__PURE__*/ Object.freeze({
  animations: animationRule,
  motion: motionRule,
  speed: speedRule,
  pointerResponse: pointerRule,
  variant: variantRule,
});
export const tablePreset: PresetSchema = skeletonPreset;
export const typingPreset: PresetSchema = /*@__PURE__*/ Object.freeze({
  motion: motionRule,
  speed: speedRule,
  count: countRule,
});
const schemas = /*@__PURE__*/ Object.freeze({
  skeleton: skeletonPreset,
  region: regionPreset,
  text: textPreset,
  chart: chartPreset,
  table: tablePreset,
  typing: typingPreset,
});
export function capturePreset<K extends PresetKind>(
  value: Preset<K>,
  expected?: K,
): Preset<K> {
  try {
    return capturePresetData(value, expected, (kind) =>
      typeof kind === 'string' && Object.hasOwn(schemas, kind)
        ? schemas[kind]
        : undefined,
    );
  } catch {
    throw new LoaderConfigurationError(
      'invalid-preset',
      'Invalid family preset configuration',
    );
  }
}
