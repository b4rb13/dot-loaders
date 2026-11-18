import type { CatalogSettings } from './catalog-model';
import { parseRecipeOptions } from './catalog-options';
import { previewVersion } from './example';

export type { CatalogSettings } from './catalog-model';

export const catalog = [
  {
    slug: 'text-loader',
    name: 'TextLoader',
    family: 'text',
    entry: 'text',
    tag: 'dotquilt-text-loader',
    summary:
      'Turn a short label into an expressive loading state, then reveal the real text.',
    use: 'A short value or label whose final meaning belongs in your interface.',
    limits:
      'Precise glyph decoration supports bounded single-line printable Basic Latin. Other scripts, RTL, multiline and oversized input fall back safely while retaining the full application text.',
    controls: [
      ['children / textContent', 'string | number', 'empty'],
      ['mask', 'string', 'omitted'],
      ['state', 'pending | refreshing | ready', 'ready'],
      ['cycle', 'string', 'omitted'],
    ],
    idles: [
      'default',
      'scramble',
      'scrambleCharacters',
      'scrambleWords',
      'labelPulse',
    ],
    reveals: ['default', 'lock', 'printText', 'fade'],
  },
  {
    slug: 'chart-loader',
    name: 'ChartLoader',
    family: 'chart',
    entry: 'chart',
    tag: 'dotquilt-chart-loader',
    summary:
      'Let a field of dots converge toward the chart your application actually owns.',
    use: 'Line, bar and scatter placeholders with application-provided target geometry.',
    limits:
      'At most 2,048 geometry items, copied and frozen. A provider is sampled at most twice per handoff; only null retries. Invalid or missing geometry falls back to a simple reveal.',
    controls: [
      ['variant', 'line | bar | scatter', 'line'],
      ['targetProvider', '(bounds) => geometry | null', 'omitted'],
    ],
    idles: ['default', 'ridge', 'scan', 'terrain', 'bars', 'scatter', 'cycle'],
    reveals: ['default', 'morphWipe'],
  },
  {
    slug: 'table-loader',
    name: 'TableLoader',
    family: 'table',
    entry: 'table',
    tag: 'dotquilt-table-loader',
    summary:
      'Converge placeholder cells toward your data and reveal the actual rows in sequence.',
    use: 'A real application table with explicit column weights, glyph projections and owned row targets.',
    limits:
      'At most 20 columns, 100 rows and 1,000 cells. Cells and glyphs share a 2,048-item projection cap; at most 100 reveal targets. Missing row/glyph semantics use the simple whole-content reveal.',
    controls: [
      ['rows', 'positive integer', '5'],
      ['rowHeight', 'CSS pixels', '32'],
      [
        'columns',
        'readonly TableColumn[]',
        'three equally weighted text columns',
      ],
      ['targetProvider', '(bounds) => geometry | null', 'omitted'],
    ],
    idles: ['default', 'typeOn', 'tableShimmer'],
    reveals: ['default', 'rows'],
  },
  {
    slug: 'skeleton-block',
    name: 'SkeletonBlock',
    family: 'skeleton',
    entry: 'skeleton',
    tag: 'dotquilt-skeleton-block',
    summary:
      'Reserve a flexible block of space while its content is on the way.',
    use: 'A composable rectangle sized by the application, inside a loading region.',
    limits:
      'The application reserves width and height. Decoration shares bounded document resources and degrades to a still placeholder under restrictions.',
    controls: [],
    idles: ['default', 'pulse'],
    reveals: ['default', 'dissolve'],
  },
  {
    slug: 'skeleton-line',
    name: 'SkeletonLine',
    family: 'skeleton',
    entry: 'skeleton',
    tag: 'dotquilt-skeleton-line',
    summary: 'A single line placeholder that follows your layout.',
    use: 'A title or one line of text; compose more than one when their widths differ.',
    limits:
      'Use host sizing and --dotquilt-radius. A single line is decorative; it does not announce readiness.',
    controls: [],
    idles: ['default', 'pulse'],
    reveals: ['default', 'dissolve'],
  },
  {
    slug: 'skeleton-circle',
    name: 'SkeletonCircle',
    family: 'skeleton',
    entry: 'skeleton',
    tag: 'dotquilt-skeleton-circle',
    summary: 'A round placeholder for an avatar or compact visual.',
    use: 'An application-sized circular slot inside a loading region.',
    limits:
      'Reserve matching dimensions for real content. Circular appearance does not create an image description or accessibility label.',
    controls: [],
    idles: ['default', 'pulse'],
    reveals: ['default', 'dissolve'],
  },
  {
    slug: 'skeleton-text',
    name: 'SkeletonText',
    family: 'skeleton',
    entry: 'skeleton',
    tag: 'dotquilt-skeleton-text',
    summary:
      'Compose several text lines without measuring or inspecting your content.',
    use: 'An article excerpt or paragraph with explicit line count and optional width fractions.',
    limits:
      'At most 50 lines. Width fractions are in (0, 1]; missing entries are full width except the final line at 0.6. One line defaults to full width.',
    controls: [
      ['lines', 'positive integer', '3'],
      ['widths', 'readonly number[]', 'default line fractions'],
    ],
    idles: ['default', 'pulse'],
    reveals: ['default', 'dissolve'],
  },
  {
    slug: 'typing-dots',
    name: 'TypingDots',
    family: 'typing',
    entry: 'typing',
    tag: 'dotquilt-typing-dots',
    summary:
      'A small, decorative sign of activity beside your own status text.',
    use: 'A chat or compact status placeholder with a separately owned accessible message.',
    limits:
      'Count is bounded to eight. TypingDots has no readiness state, pointer response or custom idle/handoff map; its region owns content presentation.',
    controls: [['count', 'positive integer', '3']],
    idles: ['default'],
    reveals: ['default'],
  },
  {
    slug: 'loading-region',
    name: 'LoadingRegion',
    family: 'region',
    entry: 'region',
    tag: 'dotquilt-region',
    summary:
      'Coordinate placeholders, real content and one explicit loading cycle.',
    use: 'Application-owned readiness, replacement or refresh loading, and coordinated content handoff.',
    limits:
      'Nested regions own their own cycles. A parent never completes a child request. Keep stable content nodes; reject stale application results before updating readiness.',
    controls: [
      ['state', 'pending | refreshing | ready', 'ready'],
      ['cycle', 'string', 'omitted'],
      ['placeholder', 'ReactNode / slot="placeholder"', 'omitted'],
      ['refreshIndicator', 'ReactNode / slot="refresh-indicator"', 'omitted'],
      ['revealTargets', 'readonly {id, element}[]', 'empty'],
    ],
    idles: ['default'],
    reveals: ['default'],
  },
] as const;
export type ComponentSlug = (typeof catalog)[number]['slug'];
export type CatalogComponent = (typeof catalog)[number];
export function findComponent(slug: string) {
  return catalog.find((item) => item.slug === slug);
}
export function requireComponent(slug: ComponentSlug): CatalogComponent {
  const value = findComponent(slug);
  if (!value) throw new Error('Unknown component');
  return value;
}
export function catalogDefaults(component: ComponentSlug): CatalogSettings {
  return {
    component,
    integration: 'react',
    idle: 'default',
    reveal: 'default',
    speed: 'auto',
    mode: 'direct',
    options: {},
    pointer: 'none',
    variant: 'line',
    rows: 5,
    lines: 3,
    count: 3,
    duration: 'auto',
    sample: 'latin',
  };
}
export function catalogQuery(settings: CatalogSettings) {
  return new URLSearchParams({
    schema: '3',
    version: previewVersion,
    ...Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [
        key,
        key === 'options' ? JSON.stringify(value) : String(value),
      ]),
    ),
  }).toString();
}
export function parseCatalogQuery(
  search: string,
  component: ComponentSlug,
): { settings: CatalogSettings; notice: string } {
  const defaults = catalogDefaults(component);
  const invalid = {
    settings: defaults,
    notice:
      'This link has unsupported settings. The static default example is shown.',
  };
  if (search.length > 4096) return invalid;
  const q = new URLSearchParams(search);
  if (!q.size) return { settings: defaults, notice: '' };
  const legacy = q.get('schema') === '2';
  if (legacy && search.length > 1024) return invalid;
  const keys = new Set([
    'schema',
    'version',
    ...Object.keys(defaults).filter(
      (key) => !legacy || (key !== 'mode' && key !== 'options'),
    ),
  ]);
  for (const key of q.keys())
    if (!keys.has(key) || q.getAll(key).length !== 1) return invalid;
  if (
    q.size !== keys.size ||
    !['2', '3'].includes(q.get('schema') ?? '') ||
    q.get('version') !== previewVersion ||
    q.get('component') !== component
  )
    return invalid;
  const model = requireComponent(component);
  const allowed: Record<string, readonly string[]> = {
    integration: ['react', 'native'],
    idle: model.idles,
    reveal: model.reveals,
    speed: legacy ? ['0.5', '1', '2'] : ['auto', '0.5', '1', '2'],
    pointer:
      model.family === 'typing' || model.family === 'region'
        ? ['none']
        : ['none', 'lift'],
    variant: ['line', 'bar', 'scatter'],
    rows: ['3', '5'],
    lines: ['1', '3', '5'],
    count: ['3', '5', '8'],
    duration: ['auto', '0', '300', '900'],
    sample: ['latin', 'zero', 'international'],
  };
  for (const [key, values] of Object.entries(allowed))
    if (!values.includes(q.get(key) ?? '')) return invalid;
  const mode = legacy ? 'direct' : q.get('mode');
  if (
    ![
      'direct',
      'preset',
      ...(model.family === 'typing' ? [] : ['custom']),
    ].includes(mode ?? '')
  )
    return invalid;
  let options: CatalogSettings['options'] = {};
  if (!legacy) {
    try {
      const parsed = parseRecipeOptions(
        JSON.parse(q.get('options') ?? ''),
        [
          ...model.idles,
          ...model.reveals,
          ...(model.family === 'typing'
            ? []
            : model.family === 'region'
              ? ['customReveal']
              : ['customIdle', 'customReveal']),
        ].filter((key) => key !== 'default'),
      );
      if (!parsed) return invalid;
      options = parsed;
    } catch {
      return invalid;
    }
  }
  return {
    settings: {
      component,
      integration: q.get('integration') as CatalogSettings['integration'],
      idle: q.get('idle') ?? 'default',
      reveal: q.get('reveal') ?? 'default',
      speed:
        q.get('speed') === 'auto'
          ? 'auto'
          : (Number(q.get('speed')) as CatalogSettings['speed']),
      mode: mode as CatalogSettings['mode'],
      options,
      pointer: q.get('pointer') as CatalogSettings['pointer'],
      variant: q.get('variant') as CatalogSettings['variant'],
      rows: Number(q.get('rows')) as CatalogSettings['rows'],
      lines: Number(q.get('lines')) as CatalogSettings['lines'],
      count: Number(q.get('count')) as CatalogSettings['count'],
      duration: q.get('duration') as CatalogSettings['duration'],
      sample: q.get('sample') as CatalogSettings['sample'],
    },
    notice: legacy
      ? 'This schema-2 configuration was migrated to schema 3. No request or motion was restored.'
      : '',
  };
}
