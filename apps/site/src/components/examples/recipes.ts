/**
 * The examples gallery, as data: each recipe is one loader in the place it
 * lives, with the marks and animations it uses. The live demo, the React and
 * HTML code and the playground link are all generated from these few fields,
 * so they always agree.
 */

export type Family =
  | 'skeleton'
  | 'text'
  | 'chart'
  | 'table'
  | 'typing'
  | 'region';
export type Mark = 'dot' | 'square' | 'dash';
export type Demo =
  | 'profile'
  | 'article'
  | 'comments'
  | 'kpi'
  | 'order'
  | 'status'
  | 'chart'
  | 'invoices'
  | 'people'
  | 'reply'
  | 'saving'
  | 'feed'
  | 'results';

export interface Recipe {
  id: string;
  family: Family;
  demo: Demo;
  title: string;
  text: string;
  mark?: Mark;
  /** An idle animation from the family's animations entry point. */
  idle?: string;
  /** A handoff animation from the family's animations entry point. */
  handoff?: string;
  variant?: 'line' | 'bar' | 'scatter';
  /** How fast the idle moves; 1 is the default pace. */
  speed?: number;
  /** Placeholder rows, for tables. */
  rows?: number;
  /** How long the simulated request takes, in ms. */
  delay: number;
}

export const families: Record<Family, string> = {
  skeleton: 'Skeleton',
  text: 'TextLoader',
  chart: 'ChartLoader',
  table: 'TableLoader',
  typing: 'TypingDots',
  region: 'LoadingRegion',
};

export const recipes: readonly Recipe[] = [
  {
    id: 'member-card',
    family: 'skeleton',
    demo: 'profile',
    title: 'Member card',
    text: 'An avatar and two lines, in the size of the real card.',
    delay: 2200,
  },
  {
    id: 'kpi-total',
    family: 'text',
    demo: 'kpi',
    title: 'Revenue total',
    text: 'A number that locks into place, glyph by glyph.',
    mark: 'square',
    delay: 2000,
  },
  {
    id: 'line-chart',
    family: 'chart',
    demo: 'chart',
    title: 'Line chart',
    text: 'A ridge of marks that glides onto your real line.',
    variant: 'line',
    delay: 2600,
  },
  {
    id: 'invoice-table',
    family: 'table',
    demo: 'invoices',
    title: 'Invoice table',
    text: 'Dashes shaped like each column; rows settle one by one.',
    mark: 'dash',
    delay: 2400,
  },
  {
    id: 'assistant-reply',
    family: 'typing',
    demo: 'reply',
    title: 'Assistant reply',
    text: 'Three marks in a bubble while the answer is written.',
    delay: 2600,
  },
  {
    id: 'activity-refresh',
    family: 'region',
    demo: 'feed',
    title: 'Refreshing feed',
    text: 'New items load while the old ones stay readable.',
    delay: 2200,
  },
  {
    id: 'article-preview',
    family: 'skeleton',
    demo: 'article',
    title: 'Article preview',
    text: 'A cover and a paragraph, breathing softly.',
    idle: 'pulse',
    delay: 2600,
  },
  {
    id: 'bar-chart',
    family: 'chart',
    demo: 'chart',
    title: 'Bar chart',
    text: 'Bars of marks that sway, then become your bars.',
    variant: 'bar',
    idle: 'bars',
    mark: 'square',
    delay: 2600,
  },
  {
    id: 'order-number',
    family: 'text',
    demo: 'order',
    title: 'Order number',
    text: 'Characters that shuffle until the real one arrives.',
    idle: 'scramble',
    mark: 'square',
    delay: 2200,
  },
  {
    id: 'comment-thread',
    family: 'skeleton',
    demo: 'comments',
    title: 'Comment thread',
    text: 'Square marks that dissolve into the conversation.',
    mark: 'square',
    handoff: 'dissolve',
    delay: 2400,
  },
  {
    id: 'people-table',
    family: 'table',
    demo: 'people',
    title: 'Team table',
    text: 'Cells that type themselves in while you wait.',
    idle: 'typeOn',
    mark: 'square',
    delay: 2800,
  },
  {
    id: 'scatter-chart',
    family: 'chart',
    demo: 'chart',
    title: 'Scatter plot',
    text: 'A drifting cloud that settles onto your points.',
    variant: 'scatter',
    idle: 'scatter',
    delay: 2600,
  },
  {
    id: 'shipping-status',
    family: 'text',
    demo: 'status',
    title: 'Status label',
    text: 'A short label that pulses, then fades in.',
    idle: 'labelPulse',
    handoff: 'fade',
    mark: 'dash',
    delay: 2000,
  },
  {
    id: 'saving',
    family: 'typing',
    demo: 'saving',
    title: 'Saving',
    text: 'A quiet inline status beside the button that started it.',
    mark: 'square',
    delay: 1800,
  },
  {
    id: 'search-results',
    family: 'region',
    demo: 'results',
    title: 'Search results',
    text: 'Lines of dashes where the results will be.',
    mark: 'dash',
    delay: 2200,
  },
];

/** The settings the playground reads from its URL, for this recipe. */
export function playgroundHref(recipe: Recipe): string {
  const component = recipe.family === 'region' ? 'skeleton' : recipe.family;
  const params = new URLSearchParams({ component });
  if (recipe.mark && recipe.mark !== 'dot') params.set('mark', recipe.mark);
  if (recipe.variant && recipe.variant !== 'line')
    params.set('variant', recipe.variant);
  if (recipe.idle) params.set('idle', recipe.idle);
  if (recipe.handoff) params.set('handoff', recipe.handoff);
  return `/playground/?${params}`;
}

/** Where a family's animations are imported from. */
const animationEntry: Partial<Record<Family, string>> = {
  skeleton: 'skeleton',
  text: 'text',
  chart: 'chart',
  table: 'table',
};

/** The recipe's React props: variant, mark and animations. */
function reactProps(recipe: Recipe): string[] {
  const props: string[] = [];
  if (recipe.variant && recipe.variant !== 'line')
    props.push(`variant="${recipe.variant}"`);
  if (recipe.mark) props.push(`mark="${recipe.mark}"`);
  if (recipe.speed && recipe.speed !== 1) props.push(`speed={${recipe.speed}}`);
  const phases = [
    recipe.idle && `idle: ${recipe.idle}()`,
    recipe.handoff && `handoff: ${recipe.handoff}()`,
  ].filter(Boolean);
  if (phases.length) props.push(`animations={{ ${phases.join(', ')} }}`);
  return props;
}

/** A self-closing JSX element, on one line when it fits. */
function element(name: string, props: string[], indent: string): string {
  const line = `<${name}${props.map((prop) => ` ${prop}`).join('')} />`;
  if (indent.length + line.length <= 72) return line;
  return `<${name}
${props
  .map(
    (prop) => `${indent}  ${prop}
`,
  )
  .join('')}${indent}/>`;
}

/** ` mark="square"` for an HTML element. */
function htmlProps(recipe: Recipe): string {
  let out = '';
  if (recipe.variant && recipe.variant !== 'line')
    out += ` variant="${recipe.variant}"`;
  if (recipe.mark) out += ` mark="${recipe.mark}"`;
  if (recipe.speed && recipe.speed !== 1) out += ` speed="${recipe.speed}"`;
  return out;
}

function animationImport(recipe: Recipe): string {
  const names = [recipe.idle, recipe.handoff].filter(Boolean);
  const entry = animationEntry[recipe.family];
  if (!names.length || !entry) return '';
  return `import { ${names.join(', ')} } from '@dotquilt-internal/core/animations/${entry}';\n`;
}

function animationScript(recipe: Recipe, selector: string): string {
  const phases = [
    recipe.idle && `idle: ${recipe.idle}()`,
    recipe.handoff && `handoff: ${recipe.handoff}()`,
  ].filter(Boolean);
  if (!phases.length) return '';
  return `\nfor (const loader of document.querySelectorAll('${selector}'))\n  loader.animations = { ${phases.join(', ')} };`;
}

interface Shape {
  /** The React component names to import. */
  imports: string[];
  /** The component's props and the data it waits for. */
  signature: string;
  /** The ready condition. */
  ready: string;
  /** The placeholder JSX, indented for `placeholder={…}`. */
  placeholder: string;
  /** The real content JSX. */
  content: string;
  /** The native placeholder markup. */
  html: string;
  /** The loaders that take the recipe's animations, as a CSS selector. */
  selector: string;
  label: string;
}

function shape(recipe: Recipe): Shape {
  const p = reactProps(recipe);
  const h = htmlProps(recipe);
  switch (recipe.demo) {
    case 'profile':
      return {
        imports: ['SkeletonCircle', 'SkeletonLine'],
        signature: 'MemberCard({ member }: { member: Member | null })',
        ready: 'member',
        placeholder: `<div className="profile">
          ${element('SkeletonCircle', p, '          ')}
          ${element('SkeletonLine', p, '          ')}
          ${element('SkeletonLine', ['className="short"', ...p], '          ')}
        </div>`,
        content: '{member && <Profile member={member} />}',
        html: `<div slot="placeholder" class="profile">
    <dotquilt-skeleton-circle${h}></dotquilt-skeleton-circle>
    <dotquilt-skeleton-line${h}></dotquilt-skeleton-line>
    <dotquilt-skeleton-line class="short"${h}></dotquilt-skeleton-line>
  </div>`,
        selector: '[slot=placeholder] > *',
        label: 'Member',
      };
    case 'article':
      return {
        imports: ['SkeletonBlock', 'SkeletonText'],
        signature: 'ArticlePreview({ article }: { article: Article | null })',
        ready: 'article',
        placeholder: `<div className="article">
          ${element('SkeletonBlock', ['className="cover"', ...p], '          ')}
          ${element('SkeletonText', ['lines={3}', ...p], '          ')}
        </div>`,
        content: '{article && <Preview article={article} />}',
        html: `<div slot="placeholder" class="article">
    <dotquilt-skeleton-block class="cover"${h}></dotquilt-skeleton-block>
    <dotquilt-skeleton-text lines="3"${h}></dotquilt-skeleton-text>
  </div>`,
        selector: '[slot=placeholder] > *',
        label: 'Article',
      };
    case 'comments':
      return {
        imports: ['SkeletonCircle', 'SkeletonText'],
        signature: 'Comments({ comments }: { comments: Comment[] | null })',
        ready: 'comments',
        placeholder: `<ul className="comments">
          {[1, 2, 3].map((n) => (
            <li key={n}>
              ${element('SkeletonCircle', p, '              ')}
              ${element('SkeletonText', ['lines={2}', ...p], '              ')}
            </li>
          ))}
        </ul>`,
        content: '{comments && <Thread comments={comments} />}',
        html: `<ul slot="placeholder" class="comments">
    <li>
      <dotquilt-skeleton-circle${h}></dotquilt-skeleton-circle>
      <dotquilt-skeleton-text lines="2"${h}></dotquilt-skeleton-text>
    </li>
    <!-- … two more rows … -->
  </ul>`,
        selector:
          '[slot=placeholder] dotquilt-skeleton-circle, [slot=placeholder] dotquilt-skeleton-text',
        label: 'Comments',
      };
    case 'chart':
      return {
        imports: ['ChartLoader'],
        signature: 'Revenue({ data }: { data: number[] | null })',
        ready: 'data',
        placeholder: element('ChartLoader', p, '        '),
        content: `{data && <${recipe.variant === 'bar' ? 'Bars' : recipe.variant === 'scatter' ? 'Points' : 'Line'} data={data} />}`,
        html: `<dotquilt-chart-loader slot="placeholder"${h}></dotquilt-chart-loader>`,
        selector: 'dotquilt-chart-loader',
        label: 'Revenue',
      };
    case 'invoices':
    case 'people':
      return {
        imports: ['TableLoader'],
        signature:
          recipe.demo === 'invoices'
            ? 'Invoices({ rows }: { rows: Invoice[] | null })'
            : 'Team({ rows }: { rows: Person[] | null })',
        ready: 'rows',
        placeholder: `<TableLoader
          rows={${recipe.rows ?? 3}}
          columns={${recipe.demo === 'invoices' ? 'invoiceColumns' : 'teamColumns'}}${p.map((prop) => `\n          ${prop}`).join('')}
        />`,
        content: '{rows && <Rows rows={rows} />}',
        html: `<dotquilt-table-loader slot="placeholder" rows="${recipe.rows ?? 3}"${h}></dotquilt-table-loader>`,
        selector: 'dotquilt-table-loader',
        label: recipe.demo === 'invoices' ? 'Invoices' : 'Team',
      };
    case 'reply':
      return {
        imports: ['TypingDots'],
        signature: 'Reply({ reply }: { reply: string | null })',
        ready: 'reply',
        placeholder: `<div className="bubble">
          ${element('TypingDots', p, '          ')}
        </div>`,
        content: '<div className="bubble">{reply}</div>',
        html: `<div slot="placeholder" class="bubble">
    <dotquilt-typing-dots${h}></dotquilt-typing-dots>
  </div>`,
        selector: 'dotquilt-typing-dots',
        label: 'Assistant reply',
      };
    case 'saving':
      return {
        imports: ['TypingDots'],
        signature: 'SaveStatus({ saved }: { saved: boolean })',
        ready: 'saved',
        placeholder: element('TypingDots', p, '        '),
        content: '<span>Saved</span>',
        html: `<dotquilt-typing-dots slot="placeholder"${h}></dotquilt-typing-dots>`,
        selector: 'dotquilt-typing-dots',
        label: 'Save status',
      };
    case 'feed':
      return {
        imports: ['SkeletonText'],
        signature:
          'Activity({ items, loading }: { items: Item[] | null; loading: boolean })',
        ready: 'items',
        placeholder: '<SkeletonText lines={3} />',
        content: '{items && <Feed items={items} />}',
        html: `<dotquilt-skeleton-text slot="placeholder" lines="3"${h}></dotquilt-skeleton-text>`,
        selector: 'dotquilt-skeleton-text',
        label: 'Activity',
      };
    case 'results':
      return {
        imports: ['SkeletonText'],
        signature: 'Results({ results }: { results: Result[] | null })',
        ready: 'results',
        placeholder: element('SkeletonText', ['lines={4}', ...p], '        '),
        content: '{results && <ResultList results={results} />}',
        html: `<dotquilt-skeleton-text slot="placeholder" lines="4"${h}></dotquilt-skeleton-text>`,
        selector: 'dotquilt-skeleton-text',
        label: 'Search results',
      };
    default:
      throw new Error(`No shape for ${recipe.demo}`);
  }
}

/** The React code for a recipe: a component that waits for its data. */
export function reactCode(recipe: Recipe): string {
  if (recipe.family === 'text') {
    const mask =
      recipe.demo === 'kpi'
        ? '$00,000'
        : recipe.demo === 'order'
          ? 'INV-0000'
          : 'Shipped, Nov 0';
    const name =
      recipe.demo === 'kpi'
        ? 'Total'
        : recipe.demo === 'order'
          ? 'OrderNumber'
          : 'ShippingStatus';
    return `import { TextLoader } from '@dotquilt-internal/react';
${animationImport(recipe)}
export function ${name}({ value }: { value: string | null }) {
  return (
    <TextLoader
      aria-label="${recipe.title}"
      mask="${mask}"${recipe.mark ? `\n      mark="${recipe.mark}"` : ''}${recipe.speed && recipe.speed !== 1 ? `\n      speed={${recipe.speed}}` : ''}${
        recipe.idle || recipe.handoff
          ? `\n      animations={{ ${[recipe.idle && `idle: ${recipe.idle}()`, recipe.handoff && `handoff: ${recipe.handoff}()`].filter(Boolean).join(', ')} }}`
          : ''
      }
      state={value ? 'ready' : 'pending'}
    >
      {value}
    </TextLoader>
  );
}`;
  }
  const s = shape(recipe);
  const refresh = recipe.demo === 'feed';
  const table = recipe.demo === 'invoices' || recipe.demo === 'people';
  const columns = !table
    ? ''
    : recipe.demo === 'invoices'
      ? `import type { TableColumn } from '@dotquilt-internal/core/table';\n\nconst invoiceColumns: TableColumn[] = [\n  { kind: 'text', width: 1.6 },\n  { kind: 'number' },\n  { kind: 'badge' },\n];\n`
      : `import type { TableColumn } from '@dotquilt-internal/core/table';\n\nconst teamColumns: TableColumn[] = [\n  { kind: 'text', width: 1.4 },\n  { kind: 'text' },\n  { kind: 'date' },\n];\n`;
  return `import { LoadingRegion, ${s.imports.join(', ')} } from '@dotquilt-internal/react';
${animationImport(recipe)}${columns}
export function ${s.signature} {
  return (
    <LoadingRegion
      aria-label="${s.label}"
      state={${refresh ? "loading ? 'refreshing' : items ? 'ready' : 'pending'" : `${s.ready} ? 'ready' : 'pending'`}}
      placeholder={
        ${s.placeholder}
      }
    >
      ${s.content}
    </LoadingRegion>
  );
}`;
}

/** The HTML for a recipe, with the script that sets it up. */
export function htmlCode(recipe: Recipe): string {
  if (recipe.family === 'text') {
    const mask =
      recipe.demo === 'kpi'
        ? '$00,000'
        : recipe.demo === 'order'
          ? 'INV-0000'
          : 'Shipped, Nov 0';
    return `<dotquilt-text-loader state="pending" mask="${mask}"${htmlProps(recipe)} aria-label="${recipe.title}"></dotquilt-text-loader>

<script type="module">
  import { registerTextLoader } from '@dotquilt-internal/core/text';
  ${animationImport(recipe).trim()}
  registerTextLoader();
  const loader = document.querySelector('dotquilt-text-loader');${animationScript(recipe, 'dotquilt-text-loader').replaceAll('\n', '\n  ')}
  // When the value arrives:
  // loader.textContent = value;
  // loader.update({ state: 'ready' });
</script>`.replace('\n  \n', '\n');
  }
  const s = shape(recipe);
  return `<dotquilt-region state="pending" aria-label="${s.label}">
  ${s.html}
  <!-- your content -->
</dotquilt-region>

<script type="module">
  import { registerAll } from '@dotquilt-internal/core/register-all';
  ${animationImport(recipe).trim()}
  registerAll();
  const region = document.querySelector('dotquilt-region');${animationScript(recipe, s.selector).replaceAll('\n', '\n  ')}
  // When your data arrives:
  // region.update({ state: '${recipe.demo === 'feed' ? 'ready' : 'ready'}' });
</script>`.replace('\n  \n', '\n');
}
