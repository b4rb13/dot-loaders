/**
 * The public API of every element, in one place: what editors, framework
 * packages and the docs can rely on. `scripts/element-manifest.ts` turns it
 * into `dist/custom-elements.json` (the Custom Elements Manifest standard)
 * and `dist/web-types.json` (JetBrains editors), and `tests/e2e/manifest.spec.ts`
 * checks it against the running elements, so it can't drift from the code.
 *
 * Types are written as they appear in `dotquilt`'s own declarations.
 */

export interface PropertySpec {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  /** The attribute that mirrors it, if any. */
  readonly attribute?: string;
  readonly default?: string;
  /** Read-only: not settable, and not an `update()` option. */
  readonly readonly?: boolean;
}
export interface AttributeSpec {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}
export interface MethodSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters?: readonly { name: string; type: string }[];
}
export interface NamedSpec {
  readonly name: string;
  readonly description: string;
}
export interface EventSpec extends NamedSpec {
  /** The event's type, e.g. `CustomEvent<HandoffDetail>`. */
  readonly type: string;
}
export interface CssPropertySpec extends NamedSpec {
  readonly default: string;
}
export interface ElementSpec {
  readonly tag: string;
  readonly className: string;
  /** The module in `dist` that declares the class. */
  readonly module: string;
  /** The package entry to import it from. */
  readonly entry: string;
  readonly register: string;
  readonly docs: string;
  readonly description: string;
  /** Every public property; `update()` accepts the ones that aren't read-only. */
  readonly properties: readonly PropertySpec[];
  /** Attributes read once on connection, with no property of their own. */
  readonly connectAttributes: readonly AttributeSpec[];
  readonly methods: readonly MethodSpec[];
  readonly events: readonly EventSpec[];
  readonly slots: readonly NamedSpec[];
  readonly parts: readonly NamedSpec[];
  readonly cssProperties: readonly CssPropertySpec[];
}

const site = 'https://dotquilt.dev';

// ---------------------------------------------------------------------------
// Shared pieces

const motion: PropertySpec = {
  name: 'motion',
  attribute: 'motion',
  type: "'system' | 'paused'",
  default: "'system'",
  description:
    "`system` follows the visitor's reduced-motion setting; `paused` stills the marks.",
};
const mark: PropertySpec = {
  name: 'mark',
  attribute: 'mark',
  type: "'dot' | 'dash' | 'square'",
  default: "'dot'",
  description:
    'The shape of each mark. Dashes suit text lines and table rows; squares stay crisp at small sizes.',
};
const speed: PropertySpec = {
  name: 'speed',
  attribute: 'speed',
  type: 'number',
  default: '1',
  description: 'How fast the idle motion runs, from above 0 up to 4.',
};
const pointerResponse: PropertySpec = {
  name: 'pointerResponse',
  attribute: 'pointer-response',
  type: "'none' | 'lift'",
  default: "'none'",
  description:
    '`lift` lights the marks around the pointer while the placeholder shows, on devices with a fine pointer.',
};
const stylePolicy: PropertySpec = {
  name: 'stylePolicy',
  type: 'StylePolicy',
  description:
    'How the element adds its styles: inline `<style>` (with an optional CSP nonce) or an external stylesheet. Set it before the element connects; the `nonce` attribute sets it too.',
};
const preset = (type: string): PropertySpec => ({
  name: 'preset',
  type,
  description:
    'A named bundle of options from `definePreset()`. Explicit options win over it.',
});
const animations = (type: string): PropertySpec => ({
  name: 'animations',
  type,
  description:
    'The idle and handoff animations, built-in or from `defineAnimation()`.',
});

const connectAttributes: readonly AttributeSpec[] = [
  {
    name: 'nonce',
    type: 'string',
    description:
      "A CSP nonce for the element's inline styles, read when it connects.",
  },
  {
    name: 'data-dotquilt-style-href',
    type: 'string',
    description:
      "Loads the element's styles from this stylesheet instead of inline, read when it connects (for a strict `style-src`).",
  },
];

const update = (patch: string): MethodSpec => ({
  name: 'update',
  description:
    'Sets several options at once, as one change. Keys that are not options of this element are reported as `unknown-option`.',
  parameters: [{ name: 'patch', type: patch }],
});
const refresh: MethodSpec = {
  name: 'refresh',
  description:
    'Measures and draws again, after a change the element cannot observe on its own.',
};

const error: EventSpec = {
  name: 'dotquilt-error',
  type: 'CustomEvent<LoaderErrorDetail>',
  description:
    'An option was invalid or an animation failed. `detail.code` says which, `detail.field` names the property.',
};
const handoffEvents: readonly EventSpec[] = [
  {
    name: 'dotquilt-handoff-start',
    type: 'CustomEvent<HandoffDetail>',
    description: 'The handoff from the placeholder to the content begins.',
  },
  {
    name: 'dotquilt-handoff-end',
    type: 'CustomEvent<HandoffDetail>',
    description:
      'The handoff finished. `detail.reason` is `complete`, or why it swapped at once.',
  },
  {
    name: 'dotquilt-handoff-cancel',
    type: 'CustomEvent<HandoffDetail>',
    description: 'A newer state or cycle replaced the handoff.',
  },
];

const markColours: readonly CssPropertySpec[] = [
  {
    name: '--dotquilt-color',
    default: 'light-dark(#6e7889, #a3afc2)',
    description: 'The resting marks.',
  },
  {
    name: '--dotquilt-accent-color',
    default: 'light-dark(#4f8f93, #8dc4c5)',
    description: 'The idle glow and the chart handoff.',
  },
];
const markSize = (size: string, gap: string): readonly CssPropertySpec[] => [
  {
    name: '--dotquilt-dot-size',
    default: size,
    description: "Each dot's diameter.",
  },
  {
    name: '--dotquilt-dot-gap',
    default: gap,
    description: 'The space between dots.',
  },
];
const marksCss = [...markColours, ...markSize('4.4px', '4.6px')];
const surface: NamedSpec = {
  name: 'surface',
  description: 'The drawn marks.',
};

// ---------------------------------------------------------------------------
// Elements

const skeletonProperties: readonly PropertySpec[] = [
  motion,
  mark,
  speed,
  pointerResponse,
  stylePolicy,
  preset('SkeletonPreset'),
  animations("Animations<'skeleton'>"),
];
const skeletonUpdate = `{ animations?, motion?, speed?, pointerResponse?, preset?: SkeletonPreset, stylePolicy?, mark? }`;
const radius: CssPropertySpec = {
  name: '--dotquilt-radius',
  default: '.375rem',
  description: "The block's corners.",
};

const skeleton = (
  tag: string,
  className: string,
  module: string,
  description: string,
): ElementSpec => ({
  tag,
  className,
  module,
  entry: 'dotquilt/skeleton',
  register: `register${className}`,
  docs: `${site}/docs/components/skeleton/`,
  description,
  properties: skeletonProperties,
  connectAttributes,
  methods: [update(skeletonUpdate), refresh],
  events: [error],
  slots: [],
  parts: [surface],
  cssProperties: [...marksCss, radius],
});

const controllerProperties: readonly PropertySpec[] = [
  {
    name: 'state',
    attribute: 'state',
    type: "'pending' | 'refreshing' | 'ready'",
    default: "'ready'",
    description:
      'Whether the content is loading: `pending` shows the placeholder, `refreshing` keeps the content usable with a quiet cue, `ready` hands over.',
  },
  {
    name: 'cycle',
    attribute: 'cycle',
    type: 'string',
    description: "Names one load, so a stale answer can't settle a newer one.",
  },
  {
    name: 'delay',
    attribute: 'delay',
    type: 'number',
    default: '0',
    description:
      "Milliseconds to wait before showing the placeholder, so fast loads don't flicker. Up to 10000.",
  },
  {
    name: 'minDisplay',
    attribute: 'min-display',
    type: 'number',
    default: '0',
    description:
      'Once a placeholder shows, keep it at least this many milliseconds, so it never flashes. Up to 10000.',
  },
  {
    name: 'timing',
    type: 'Timing',
    description:
      "The handoff's length and curve. `{ duration: 0 }` swaps at once, for errors.",
  },
  {
    name: 'revealTargets',
    type: 'readonly RevealTarget[]',
    description:
      'Parts of the content that settle in turn under a custom handoff, or a TableLoader with a `targetProvider`.',
  },
  {
    name: 'presentation',
    type: "'pending' | 'refreshing' | 'ready' | 'handoff'",
    readonly: true,
    description:
      'What is on screen right now, including a handoff in progress.',
  },
  motion,
  stylePolicy,
];
const controllerUpdate = (extra: string) =>
  `{ state?, cycle?, timing?, animations?, revealTargets?, motion?, stylePolicy?, delay?, minDisplay?${extra} }`;

export const elements: readonly ElementSpec[] = [
  skeleton(
    'dotquilt-skeleton-block',
    'SkeletonBlock',
    'dist/skeleton-block.js',
    'A rectangle of marks for images, charts and other blocks. On handoff the marks travel to the content’s real shape.',
  ),
  skeleton(
    'dotquilt-skeleton-line',
    'SkeletonLine',
    'dist/skeleton-line.js',
    'One line of text, drawn in marks.',
  ),
  skeleton(
    'dotquilt-skeleton-circle',
    'SkeletonCircle',
    'dist/skeleton-circle.js',
    'A circle of marks for avatars and icons.',
  ),
  {
    ...skeleton(
      'dotquilt-skeleton-text',
      'SkeletonText',
      'dist/skeleton-text.js',
      'A paragraph of lines, drawn in marks.',
    ),
    properties: [
      ...skeletonProperties,
      {
        name: 'lines',
        attribute: 'lines',
        type: 'number',
        default: '3',
        description: 'How many lines, up to 50.',
      },
      {
        name: 'widths',
        type: 'readonly number[]',
        description:
          "Each line's length as a share of the width, from above 0 to 1. The last line is shorter by default.",
      },
    ],
    methods: [
      update(skeletonUpdate.replace(' }', ', lines?, widths? }')),
      refresh,
    ],
  },
  {
    tag: 'dotquilt-typing-dots',
    className: 'TypingDots',
    module: 'dist/typing.js',
    entry: 'dotquilt/typing',
    register: 'registerTypingDots',
    docs: `${site}/docs/components/typing-dots/`,
    description:
      'A row of dots in a slow wave, for a reply being written. Hidden from assistive technology; announce the status yourself.',
    properties: [
      motion,
      mark,
      { ...speed, description: 'How fast the wave moves, up to 4.' },
      {
        name: 'count',
        attribute: 'count',
        type: 'number',
        default: '3',
        description: 'How many dots, up to 8.',
      },
      stylePolicy,
      preset('TypingPreset'),
    ],
    connectAttributes,
    methods: [
      update(
        '{ count?, speed?, motion?, preset?: TypingPreset, stylePolicy?, mark? }',
      ),
      refresh,
    ],
    events: [error],
    slots: [],
    parts: [surface],
    cssProperties: [...markColours, ...markSize('8px', '6px')],
  },
  {
    tag: 'dotquilt-text-loader',
    className: 'TextLoader',
    module: 'dist/text.js',
    entry: 'dotquilt/text',
    register: 'registerTextLoader',
    docs: `${site}/docs/components/text-loader/`,
    description:
      'A value in the making: scrambling characters in marks that lock into the real text when it arrives.',
    properties: [
      ...controllerProperties,
      {
        name: 'mask',
        attribute: 'mask',
        type: 'string',
        description:
          'The shape the placeholder shows. Defaults to the text itself.',
      },
      mark,
      { ...speed, description: 'How fast the characters change, up to 4.' },
      pointerResponse,
      preset('TextPreset'),
      animations("Animations<'text'>"),
    ],
    connectAttributes,
    methods: [
      update(
        controllerUpdate(
          ', mask?, speed?, pointerResponse?, preset?: TextPreset, mark?',
        ),
      ),
      refresh,
    ],
    events: [...handoffEvents, error],
    slots: [
      { name: '', description: 'The real text.' },
      {
        name: 'placeholder',
        description:
          'Server-rendered mask markup; the element draws its own placeholder once styled.',
      },
      {
        name: 'refresh-indicator',
        description: 'Your own cue while refreshing.',
      },
    ],
    parts: [
      { name: 'content', description: 'The layer holding the real text.' },
      { name: 'placeholder', description: 'The placeholder layer.' },
      { name: 'refresh-indicator', description: 'The refresh cue layer.' },
    ],
    cssProperties: marksCss,
  },
  {
    tag: 'dotquilt-chart-loader',
    className: 'ChartLoader',
    module: 'dist/chart.js',
    entry: 'dotquilt/chart',
    register: 'registerChartLoader',
    docs: `${site}/docs/components/chart-loader/`,
    description:
      'A field of marks that takes the shape of a chart, then hands over to the real one.',
    properties: [
      {
        name: 'variant',
        attribute: 'variant',
        type: "'line' | 'bar' | 'scatter'",
        default: "'line'",
        description: 'The kind of chart it stands in for.',
      },
      {
        name: 'targetProvider',
        type: 'TargetProvider',
        description: 'Where the real chart is, for the handoff.',
      },
      motion,
      mark,
      { ...speed, description: 'How fast the ridge and glow move, up to 4.' },
      pointerResponse,
      stylePolicy,
      preset('ChartPreset'),
      animations("Animations<'chart'>"),
    ],
    connectAttributes,
    methods: [
      update(
        '{ variant?, targetProvider?, speed?, pointerResponse?, animations?, preset?: ChartPreset, motion?, stylePolicy?, mark? }',
      ),
      refresh,
    ],
    events: [error],
    slots: [],
    parts: [surface],
    cssProperties: marksCss,
  },
  {
    tag: 'dotquilt-table-loader',
    className: 'TableLoader',
    module: 'dist/table.js',
    entry: 'dotquilt/table',
    register: 'registerTableLoader',
    docs: `${site}/docs/components/table-loader/`,
    description:
      'Rows of marks shaped like your columns, that gather into each cell’s real text on handoff.',
    properties: [
      {
        name: 'rows',
        attribute: 'rows',
        type: 'number',
        default: '5',
        description: 'How many rows to show, up to 100.',
      },
      {
        name: 'rowHeight',
        attribute: 'row-height',
        type: 'number',
        default: '32',
        description: 'Row height in pixels.',
      },
      {
        name: 'columns',
        type: 'readonly TableColumn[]',
        description:
          'What each column holds (`text`, `number`, `badge` or `date`) and its share of the width. Up to 20; three text columns by default.',
      },
      {
        name: 'targetProvider',
        type: 'TableTargetProvider',
        description: 'Where the real cells are, for the `rows` handoff.',
      },
      motion,
      mark,
      { ...speed, description: 'How fast the glow moves, up to 4.' },
      pointerResponse,
      stylePolicy,
      preset('TablePreset'),
      animations("Animations<'table'>"),
    ],
    connectAttributes,
    methods: [
      update(
        '{ rows?, rowHeight?, columns?, targetProvider?, speed?, pointerResponse?, animations?, preset?: TablePreset, motion?, stylePolicy?, mark? }',
      ),
      refresh,
    ],
    events: [error],
    slots: [],
    parts: [surface],
    cssProperties: marksCss,
  },
  {
    tag: 'dotquilt-region',
    className: 'LoadingRegion',
    module: 'dist/region.js',
    entry: 'dotquilt/region',
    register: 'registerLoadingRegion',
    docs: `${site}/docs/components/loading-region/`,
    description:
      'Wraps content that loads: shows its placeholder while pending, keeps the content inert and hidden from assistive technology, then hands over to it.',
    properties: [
      ...controllerProperties.map((property) =>
        property === motion
          ? {
              ...motion,
              description:
                "`system` follows the visitor's reduced-motion setting; `paused` stills every loader inside.",
            }
          : property,
      ),
      preset('RegionPreset'),
      animations("Pick<Animations<'region'>, 'handoff'>"),
    ],
    connectAttributes,
    methods: [update(controllerUpdate(', preset?: RegionPreset')), refresh],
    events: [...handoffEvents, error],
    slots: [
      { name: '', description: 'Your content.' },
      {
        name: 'placeholder',
        description: 'The loader shown while pending.',
      },
      {
        name: 'refresh-indicator',
        description:
          'Your own cue while refreshing, in place of the row of marks.',
      },
    ],
    parts: [
      { name: 'content', description: 'The layer holding your content.' },
      { name: 'placeholder', description: 'The placeholder layer.' },
      { name: 'refresh-indicator', description: 'The refresh cue layer.' },
      {
        name: 'refresh-thread',
        description: 'The row of marks above the top edge while refreshing.',
      },
    ],
    cssProperties: [
      ...marksCss,
      {
        name: '--dotquilt-refresh-gap',
        default: '6px',
        description: 'How far above a refreshing region its row of marks sits.',
      },
    ],
  },
];
