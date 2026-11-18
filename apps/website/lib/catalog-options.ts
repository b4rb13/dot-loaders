import type {
  BarsOptions,
  CycleOptions,
  MorphWipeOptions,
  RidgeOptions,
  ScanOptions,
  ScatterOptions,
  TerrainOptions,
} from '@dotquilt-internal/core/animations/chart';
import type {
  DissolveOptions,
  PulseOptions,
} from '@dotquilt-internal/core/animations/skeleton';
import type {
  RowsOptions,
  TypeOnOptions,
} from '@dotquilt-internal/core/animations/table';
import type {
  LabelPulseOptions,
  ScrambleOptions,
  TextHandoffOptions,
} from '@dotquilt-internal/core/animations/text';

export interface CustomIdleOptions {
  readonly periodMs: number;
  readonly minimumOpacity: number;
}
export interface CustomRevealOptions {
  readonly duration: number;
  readonly liftPx: number;
}
export interface FactoryOptions {
  pulse: PulseOptions;
  dissolve: DissolveOptions;
  scramble: ScrambleOptions;
  scrambleCharacters: ScrambleOptions;
  scrambleWords: ScrambleOptions;
  labelPulse: LabelPulseOptions;
  lock: TextHandoffOptions;
  printText: TextHandoffOptions;
  fade: { readonly duration: number };
  ridge: RidgeOptions;
  scan: ScanOptions;
  terrain: TerrainOptions;
  bars: BarsOptions;
  scatter: ScatterOptions;
  cycle: CycleOptions;
  morphWipe: MorphWipeOptions;
  typeOn: TypeOnOptions;
  tableShimmer: TypeOnOptions;
  rows: RowsOptions;
  customIdle: CustomIdleOptions;
  customReveal: CustomRevealOptions;
}
export type RecipeKey = keyof FactoryOptions;
export type RecipeOptions = Readonly<{
  [K in RecipeKey]?: Readonly<Partial<FactoryOptions[K]>>;
}>;
export type NumberSpec = Readonly<{
  kind: 'number';
  default: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}>;
type SelectSpec<T extends string = string> = Readonly<{
  kind: 'select';
  default: T;
  values: readonly T[];
  unit: string;
}>;
export type OptionSpec = NumberSpec | SelectSpec;
type Fields<O> = {
  readonly [K in keyof O]: O[K] extends number
    ? NumberSpec
    : SelectSpec<Extract<O[K], string>>;
};
const number = (
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
): NumberSpec => ({ kind: 'number', default: value, min, max, step, unit });
const textHandoff = {
  staggerMs: number(24, 0, 40, 1, 'ms / character'),
  reelMs: number(55, 0, 100, 1, 'ms'),
  settleMs: number(90, 40, 180, 1, 'ms'),
  pop: number(0.2, 0, 0.3, 0.01, 'relative scale'),
} as const;
const tableIdle = {
  cadenceMs: number(600, 250, 1200, 10, 'ms'),
  cellStyle: {
    kind: 'select',
    default: 'auto',
    values: [
      'auto',
      'text',
      'number',
      'badge',
      'date',
      'badge-text',
      'text-badge',
    ],
    unit: 'treatment',
  },
} as const;
// These are website input limits. Public factories remain the validation authority.
// dissolve.duration has no finite factory ceiling; this editor deliberately stops at 4,000ms.
export const optionSpecs = {
  pulse: { periodMs: number(1600, 800, 4000, 50, 'ms') },
  dissolve: {
    duration: number(300, 0, 4000, 10, 'ms'),
    fallPx: number(5, 0, 8, 0.5, 'CSS px'),
  },
  scramble: { changesPerSecond: number(2.8, 0.5, 4, 0.1, 'changes / second') },
  scrambleCharacters: {
    changesPerSecond: number(2.8, 0.5, 4, 0.1, 'changes / character / second'),
  },
  scrambleWords: {
    changesPerSecond: number(2.8, 0.5, 4, 0.1, 'word steps / second'),
  },
  labelPulse: { travelPxPerSecond: number(70, 20, 140, 1, 'CSS px / second') },
  lock: textHandoff,
  printText: textHandoff,
  fade: { duration: number(150, 0, 4000, 10, 'ms') },
  ridge: {
    amplitude: number(0.24, 0, 0.4, 0.01, 'surface-height fraction'),
    highlightWidth: number(90, 20, 180, 1, 'CSS px'),
  },
  scan: {
    amplitude: number(0.24, 0, 0.4, 0.01, 'surface-height fraction'),
    bandWidth: number(36, 12, 80, 1, 'CSS px'),
    trail: number(160, 40, 240, 1, 'CSS px'),
  },
  terrain: {
    amplitude: number(0.24, 0, 0.4, 0.01, 'surface-height fraction'),
    relief: number(1, 0.4, 1.4, 0.05, 'multiplier'),
  },
  bars: { sway: number(0.07, 0, 0.12, 0.01, 'surface fraction') },
  scatter: {
    radius: number(13, 6, 24, 1, 'CSS px'),
    spread: number(0.24, 0.1, 0.35, 0.01, 'surface fraction'),
    sway: number(0.045, 0, 0.1, 0.005, 'surface fraction'),
  },
  cycle: {
    holdMs: number(3200, 800, 3200, 50, 'ms'),
    blendMs: number(460, 200, 600, 10, 'ms'),
  },
  morphWipe: {
    morphEnd: number(0.86, 0.55, 0.95, 0.01, 'timeline fraction'),
    wipeStart: number(0.29, 0.15, 0.6, 0.01, 'timeline fraction'),
    edge: number(40, 4, 80, 1, 'CSS px'),
  },
  typeOn: tableIdle,
  tableShimmer: tableIdle,
  rows: {
    staggerMs: number(35, 0, 50, 1, 'ms / row'),
    settlePx: number(4, 0, 8, 0.5, 'CSS px'),
  },
  customIdle: {
    periodMs: number(1800, 800, 4000, 50, 'ms'),
    minimumOpacity: number(0.35, 0.2, 1, 0.05, 'opacity multiplier'),
  },
  customReveal: {
    duration: number(450, 0, 2000, 10, 'ms'),
    liftPx: number(3, 0, 8, 0.5, 'CSS px'),
  },
} as const satisfies { readonly [K in RecipeKey]: Fields<FactoryOptions[K]> };

export function fieldsFor(
  key: RecipeKey,
): Readonly<Record<string, OptionSpec>> {
  return optionSpecs[key];
}
export function isRecipeKey(key: string): key is RecipeKey {
  return Object.hasOwn(optionSpecs, key);
}
export function parseRecipeOptions(
  value: unknown,
  allowed: readonly string[],
): RecipeOptions | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return null;
  const result: Record<string, Record<string, number | string>> = {};
  for (const [recipe, input] of Object.entries(value)) {
    if (
      !allowed.includes(recipe) ||
      !isRecipeKey(recipe) ||
      !input ||
      typeof input !== 'object' ||
      Object.getPrototypeOf(input) !== Object.prototype
    )
      return null;
    const fields = fieldsFor(recipe);
    const options: Record<string, number | string> = {};
    for (const [key, v] of Object.entries(input)) {
      if (typeof v !== 'number' && typeof v !== 'string') return null;
      if (!Object.hasOwn(fields, key)) return null;
      const spec = fields[key];
      if (!spec) return null;
      if (
        spec.kind === 'number'
          ? typeof v !== 'number' ||
            !Number.isFinite(v) ||
            v < spec.min ||
            v > spec.max
          : typeof v !== 'string' || !spec.values.includes(v)
      )
        return null;
      options[key] = v;
    }
    if (Object.keys(options).length) result[recipe] = options;
  }
  return result as RecipeOptions;
}
