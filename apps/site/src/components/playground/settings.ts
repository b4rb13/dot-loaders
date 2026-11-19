/**
 * The playground's settings: what can be chosen, the defaults, and the URL
 * form that makes a setup shareable. The gallery's "Open in playground" links
 * use the same parameters (see `playgroundHref` in ../examples/recipes.ts).
 */
import type { Demo, Family, Mark, Recipe } from '../examples/recipes';

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
    ['scramble', 'Scramble'],
    ['labelPulse', 'Label pulse'],
  ],
  chart: [
    ['', 'Default'],
    ['bars', 'Bars'],
    ['scatter', 'Scatter'],
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
    ['fade', 'Fade'],
  ],
  chart: [['', 'Default']],
  table: [['', 'Default']],
  typing: [['', 'Default']],
};

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
};

export const ranges = {
  size: { min: 3, max: 7, step: 0.2 },
  gap: { min: 2.6, max: 9, step: 0.2 },
  speed: { min: 0.5, max: 2, step: 0.25 },
  delay: { min: 800, max: 6000, step: 200 },
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
  };
}

/** The query for these settings: only what differs from the defaults. */
export function serialize(settings: Settings): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults) as (keyof Settings)[])
    if (settings[key] !== defaults[key]) params.set(key, String(settings[key]));
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
  return {
    id: 'playground',
    family: settings.component as Family,
    demo: demos[settings.component],
    title: 'Playground',
    text: '',
    ...(settings.mark !== 'dot' && { mark: settings.mark }),
    ...(settings.idle && { idle: settings.idle }),
    ...(settings.handoff && { handoff: settings.handoff }),
    ...(settings.component === 'chart' && { variant: settings.variant }),
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
