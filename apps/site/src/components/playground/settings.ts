/**
 * The playground's settings: what can be chosen, the defaults, and the URL
 * form that makes a setup shareable. The gallery's "Open in playground" links
 * use the same parameters (see `playgroundHref` in ../examples/recipes.ts).
 */
import type { Demo, Family, Mark, Recipe } from '../examples/recipes';
import {
  animationOptions,
  changed,
  defaultHandoff,
  defaultIdle,
} from './animation-options';

export type Component = 'skeleton' | 'text' | 'chart' | 'table' | 'typing';

export const components: readonly [Component, string][] = [
  ['skeleton', 'Skeleton'],
  ['text', 'TextLoader'],
  ['chart', 'ChartLoader'],
  ['table', 'TableLoader'],
  ['typing', 'TypingDots'],
];

export const marks: readonly [Mark, string][] = [
  ['dot', 'Dot'],
  ['dash', 'Dash'],
  ['square', 'Square'],
];

export const variants = [
  ['line', 'Line'],
  ['bar', 'Bars'],
  ['scatter', 'Scatter'],
] as const;

/** Idle and handoff animations per component; '' is the built-in default. */
export const idles: Record<Component, readonly [string, string][]> = {
  skeleton: [
    ['', 'Default'],
    ['pulse', 'Pulse'],
  ],
  text: [
    ['', 'Default'],
    ['scrambleCharacters', 'Characters'],
    ['scrambleWords', 'Words'],
    ['labelPulse', 'Label pulse'],
  ],
  chart: [
    ['', 'Default'],
    ['scan', 'Scan'],
    ['terrain', 'Terrain'],
    ['bars', 'Bars'],
    ['scatter', 'Scatter'],
    ['cycle', 'Cycle'],
  ],
  table: [
    ['', 'Default'],
    ['typeOn', 'Type on'],
  ],
  typing: [['', 'Default']],
};
export const handoffs: Record<Component, readonly [string, string][]> = {
  skeleton: [
    ['', 'Default'],
    ['dissolve', 'Dissolve'],
  ],
  text: [
    ['', 'Default'],
    ['lock', 'Lock'],
    ['printText', 'Print'],
    ['fade', 'Fade'],
  ],
  chart: [['', 'Default']],
  table: [['', 'Default']],
  typing: [['', 'Default']],
};

/** Choices that take a short list of values. */
export const pointers = [
  ['none', 'Off'],
  ['lift', 'Lift'],
] as const;
export const durations = [
  ['auto', 'Default'],
  ['0', 'Instant'],
  ['300', '0.3 s'],
  ['600', '0.6 s'],
  ['2000', '2 s'],
] as const;
export const samples = [
  ['number', 'Number'],
  ['label', 'Label'],
  ['international', 'こんにちは'],
] as const;

/** Mark colours that sit well beside text, light and dark. */
export const palettes = [
  { id: 'slate', name: 'Slate', mark: '', glow: '', swatch: '#6e7889' },
  {
    id: 'sage',
    name: 'Sage',
    mark: 'light-dark(#5f7a6c, #9db8aa)',
    glow: 'light-dark(#3f8a6e, #86c9ad)',
    swatch: '#5f7a6c',
  },
  {
    id: 'ink',
    name: 'Ink',
    mark: 'light-dark(#56607e, #a6afcc)',
    glow: 'light-dark(#4b67b8, #9db3ec)',
    swatch: '#56607e',
  },
  {
    id: 'clay',
    name: 'Clay',
    mark: 'light-dark(#87705f, #c6b1a1)',
    glow: 'light-dark(#b0714b, #e0a582)',
    swatch: '#87705f',
  },
  {
    id: 'plum',
    name: 'Plum',
    mark: 'light-dark(#776479, #bba7bd)',
    glow: 'light-dark(#8e5a95, #c99bd0)',
    swatch: '#776479',
  },
] as const;

export interface Settings {
  component: Component;
  mark: Mark;
  variant: 'line' | 'bar' | 'scatter';
  idle: string;
  handoff: string;
  palette: string;
  /** Dot diameter in px; squares and dashes have a fixed size. */
  size: number;
  /** Space between dots in px. */
  gap: number;
  speed: number;
  /** How long the simulated request takes, in ms. */
  delay: number;
  /** `lift`: marks light up around the pointer. Not for TypingDots. */
  pointer: 'none' | 'lift';
  /** The handoff's length: `auto` or ms. */
  duration: (typeof durations)[number][0];
  /** SkeletonText lines, table rows and TypingDots. */
  lines: number;
  rows: number;
  count: number;
  /** What the TextLoader waits for. */
  sample: (typeof samples)[number][0];
  /** Options for the idle and handoff animations (URL `i.key` / `h.key`). */
  idleOptions: Readonly<Record<string, number | string>>;
  handoffOptions: Readonly<Record<string, number | string>>;
}

export const defaults: Settings = {
  component: 'skeleton',
  mark: 'dot',
  variant: 'line',
  idle: '',
  handoff: '',
  palette: 'slate',
  size: 4.4,
  gap: 4.6,
  speed: 1,
  delay: 2400,
  pointer: 'none',
  duration: 'auto',
  lines: 3,
  rows: 3,
  count: 3,
  sample: 'number',
  idleOptions: {},
  handoffOptions: {},
};

export const ranges = {
  size: { min: 3, max: 7, step: 0.2 },
  gap: { min: 2.6, max: 9, step: 0.2 },
  speed: { min: 0.5, max: 2, step: 0.25 },
  delay: { min: 800, max: 6000, step: 200 },
  lines: { min: 1, max: 6, step: 1 },
  rows: { min: 2, max: 8, step: 1 },
  count: { min: 2, max: 8, step: 1 },
} as const;

const oneOf = <T extends string>(
  value: string | null,
  allowed: readonly (readonly [T, string])[],
  fallback: T,
): T => allowed.find(([key]) => key === value)?.[0] ?? fallback;

const within = (
  value: string | null,
  key: keyof typeof ranges,
  fallback: number,
) => {
  const number = Number(value);
  const { min, max } = ranges[key];
  return value !== null && Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
};

/** Settings from a URL's query; anything unknown or out of range is ignored. */
export function parse(search: string): Settings {
  const params = new URLSearchParams(search);
  const component = oneOf(
    params.get('component'),
    components,
    defaults.component,
  );
  return {
    component,
    mark: oneOf(params.get('mark'), marks, defaults.mark),
    variant: oneOf(params.get('variant'), variants, defaults.variant),
    idle: oneOf(params.get('idle'), idles[component], ''),
    handoff: oneOf(params.get('handoff'), handoffs[component], ''),
    palette: oneOf(
      params.get('palette'),
      palettes.map((palette) => [palette.id, palette.name] as const),
      defaults.palette,
    ),
    size: within(params.get('size'), 'size', defaults.size),
    gap: within(params.get('gap'), 'gap', defaults.gap),
    speed: within(params.get('speed'), 'speed', defaults.speed),
    delay: within(params.get('delay'), 'delay', defaults.delay),
    pointer: oneOf(params.get('pointer'), pointers, defaults.pointer),
    duration: oneOf(params.get('duration'), durations, defaults.duration),
    lines: within(params.get('lines'), 'lines', defaults.lines),
    rows: within(params.get('rows'), 'rows', defaults.rows),
    count: within(params.get('count'), 'count', defaults.count),
    sample: oneOf(params.get('sample'), samples, defaults.sample),
    idleOptions: optionsFrom(params, 'i', idle(component, params.get('idle'))),
    handoffOptions: optionsFrom(
      params,
      'h',
      handoff(component, params.get('handoff')),
    ),
  };
}

/** The animation in effect: the chosen one, or the component's default. */
export function idle(
  component: Component,
  chosen: string | null,
): string | undefined {
  return (
    (chosen && idles[component].some(([key]) => key === chosen) && chosen) ||
    defaultIdle[component]
  );
}
export function handoff(
  component: Component,
  chosen: string | null,
): string | undefined {
  return (
    (chosen && handoffs[component].some(([key]) => key === chosen) && chosen) ||
    defaultHandoff[component]
  );
}

/** `i.bandWidth=48` and the like, checked against the animation's options. */
function optionsFrom(
  params: URLSearchParams,
  prefix: 'i' | 'h',
  name: string | undefined,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const option of (name && animationOptions[name]) || []) {
    const value = params.get(`${prefix}.${option.key}`);
    if (value === null) continue;
    if ('values' in option) {
      if (option.values.some(([key]) => key === value)) out[option.key] = value;
      continue;
    }
    const number = Number(value);
    if (Number.isFinite(number))
      out[option.key] = Math.min(option.max, Math.max(option.min, number));
  }
  return changed(name, out);
}

/** The query for these settings: only what differs from the defaults. */
export function serialize(settings: Settings): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (key === 'idleOptions' || key === 'handoffOptions') continue;
    if (settings[key] !== defaults[key]) params.set(key, String(settings[key]));
  }
  for (const [key, value] of Object.entries(settings.idleOptions))
    params.set(`i.${key}`, String(value));
  for (const [key, value] of Object.entries(settings.handoffOptions))
    params.set(`h.${key}`, String(value));
  // A component is always named, so a link says what it shows.
  params.set('component', settings.component);
  return params.toString();
}

const demos: Record<Component, Demo> = {
  skeleton: 'article',
  text: 'kpi',
  chart: 'chart',
  table: 'invoices',
  typing: 'reply',
};

/** The settings as a recipe, so the playground's code matches the gallery's. */
export function recipe(settings: Settings): Recipe {
  const { component } = settings;
  const idleName = idle(component, settings.idle);
  const handoffName = handoff(component, settings.handoff);
  const idleOptions = changed(idleName, settings.idleOptions);
  const handoffOptions = changed(handoffName, settings.handoffOptions);
  // A default animation is named only when one of its options changed.
  const idleUsed =
    settings.idle || (Object.keys(idleOptions).length ? idleName : '');
  const handoffUsed =
    settings.handoff || (Object.keys(handoffOptions).length ? handoffName : '');
  return {
    id: 'playground',
    family: component as Family,
    demo: demos[component],
    // Names what loads, as the TextLoader's accessible label.
    title: 'Revenue this month',
    text: '',
    ...(settings.mark !== 'dot' && { mark: settings.mark }),
    ...(idleUsed && { idle: idleUsed, idleOptions }),
    ...(handoffUsed && { handoff: handoffUsed, handoffOptions }),
    ...(component === 'chart' && { variant: settings.variant }),
    ...(settings.pointer === 'lift' &&
      component !== 'typing' && { pointer: 'lift' as const }),
    ...(settings.duration !== 'auto' && {
      duration: Number(settings.duration),
    }),
    ...(component === 'skeleton' && { lines: settings.lines }),
    ...(component === 'table' && { rows: settings.rows }),
    ...(component === 'typing' && { count: settings.count }),
    ...(component === 'text' && { sample: settings.sample }),
    speed: settings.speed,
    delay: settings.delay,
  };
}

/** The CSS for the colours and dot size, or null when they are the defaults. */
export function css(settings: Settings): string | null {
  const palette = palettes.find((entry) => entry.id === settings.palette);
  const lines = [
    palette?.mark && `  --dotquilt-color: ${palette.mark};`,
    palette?.glow && `  --dotquilt-accent-color: ${palette.glow};`,
    settings.mark === 'dot' &&
      settings.size !== defaults.size &&
      `  --dotquilt-dot-size: ${settings.size}px;`,
    settings.mark === 'dot' &&
      settings.gap !== defaults.gap &&
      `  --dotquilt-dot-gap: ${settings.gap}px;`,
  ].filter(Boolean);
  return lines.length
    ? `/* On any ancestor of the loaders. */\n.your-app {\n${lines.join('\n')}\n}`
    : null;
}
