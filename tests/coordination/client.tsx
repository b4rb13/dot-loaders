import * as core from '@dotquilt-internal/core';
import * as adapter from '@dotquilt-internal/react';
import { createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const framework = location.pathname.slice(1);
const events: { id: string; type: string; reason?: string }[] = [];
const errors: { id: string; code: string }[] = [];
let clicks = 0;
const overrides = new Map<string, object>([['parent', { motion: 'paused' }]]);
const css = (name: string) => ({
  mode: 'external' as const,
  href: `/styles/${name}.css`,
});
const surface = (name: string, id: string, extra = {}) =>
  h(Reflect.get(adapter, name), {
    id,
    stylePolicy: css(
      (
        {
          SkeletonBlock: 'skeleton',
          SkeletonLine: 'line',
          SkeletonCircle: 'circle',
          SkeletonText: 'skeleton-text',
          TypingDots: 'typing',
          TextLoader: 'text',
          ChartLoader: 'chart',
          TableLoader: 'table',
        } as Record<string, string>
      )[name] as string,
    ),
    ...extra,
    ...overrides.get(id),
  });
const field = (id: string) =>
  h('input', {
    id,
    defaultValue: 'kept',
    'aria-label': id,
    onClick: () => clicks++,
  });
function region(id: string, placeholder: ReactNode, content: ReactNode) {
  return h(
    adapter.LoadingRegion,
    {
      id,
      state: 'pending',
      timing: { duration: 900 },
      stylePolicy: css('region'),
      placeholder,
      ...overrides.get(id),
    },
    content,
  );
}
const chart = () =>
  region(
    'chart-region',
    surface('ChartLoader', 'chart'),
    h('div', { id: 'chart-content' }, field('chart-button')),
  );
const table = () =>
  region(
    'table-region',
    surface('TableLoader', 'table', {
      rows: 2,
      columns: [{ weight: 1, kind: 'text' }],
    }),
    h(
      'div',
      { id: 'table-content' },
      h('div', { id: 'row-a' }, 'Alpha'),
      h('div', { id: 'row-b' }, 'Beta'),
      field('table-button'),
    ),
  );
const tree = () =>
  h(
    'div',
    { id: 'stage' },
    region(
      'parent',
      h(
        'div',
        { id: 'parent-ph' },
        surface('SkeletonBlock', 'block'),
        surface('SkeletonLine', 'line'),
        surface('SkeletonCircle', 'circle'),
        surface('SkeletonText', 'multi', { lines: 2 }),
        surface('TypingDots', 'typing'),
      ),
      h(
        'section',
        { id: 'parent-content' },
        field('keep'),
        surface('TextLoader', 'text', {
          state: 'pending',
          children: '42.50',
          mask: '00.00',
        }),
        chart(),
        table(),
      ),
    ),
    region(
      'peer',
      surface('SkeletonBlock', 'peer-block'),
      field('peer-button'),
    ),
  );

let reactRoot: ReturnType<typeof createRoot> | undefined;
if (framework === 'react') {
  reactRoot = createRoot(document.getElementById('app') as HTMLElement);
  reactRoot.render(tree());
} else {
  // The native consumer creates application DOM without using the adapter.
  const element = (tag: string, id: string, children: Node[] = []) => {
    const el = document.createElement(tag);
    el.id = id;
    el.append(...children);
    return el;
  };
  const nativeField = (id: string) => {
    const el = element('input', id) as HTMLInputElement;
    el.value = 'kept';
    el.setAttribute('aria-label', id);
    el.onclick = () => clicks++;
    return el;
  };
  const nativeSurface = (
    tag: string,
    id: string,
    asset: string,
    patch = {},
  ) => {
    const el = element(`dotquilt-${tag}`, id);
    Reflect.set(el, 'stylePolicy', css(asset));
    Object.assign(el, patch);
    return el;
  };
  const nativeRegion = (id: string, children: Node[], content: Node[]) => {
    const placeholder = element('div', `${id}-ph`, children);
    placeholder.slot = 'placeholder';
    const host = element('dotquilt-region', id, [placeholder, ...content]);
    host.setAttribute('state', 'pending');
    Object.assign(host, {
      stylePolicy: css('region'),
      timing: { duration: 900 },
    });
    return host;
  };
  const nestedChart = nativeRegion(
    'chart-region',
    [nativeSurface('chart-loader', 'chart', 'chart')],
    [element('div', 'chart-content', [nativeField('chart-button')])],
  );
  const a = element('div', 'row-a'),
    b = element('div', 'row-b');
  a.textContent = 'Alpha';
  b.textContent = 'Beta';
  const nestedTable = nativeRegion(
    'table-region',
    [
      nativeSurface('table-loader', 'table', 'table', {
        rows: 2,
        columns: [{ weight: 1, kind: 'text' }],
      }),
    ],
    [element('div', 'table-content', [a, b, nativeField('table-button')])],
  );
  const text = nativeSurface('text-loader', 'text', 'text', { mask: '00.00' });
  text.textContent = '42.50';
  text.setAttribute('state', 'pending');
  const parent = nativeRegion(
    'parent',
    [
      ['skeleton-block', 'block', 'skeleton'],
      ['skeleton-line', 'line', 'line'],
      ['skeleton-circle', 'circle', 'circle'],
      ['skeleton-text', 'multi', 'skeleton-text'],
      ['typing-dots', 'typing', 'typing'],
    ].map(([tag, id, asset]) =>
      nativeSurface(tag as string, id as string, asset as string),
    ),
    [
      element('section', 'parent-content', [
        nativeField('keep'),
        text,
        nestedChart,
        nestedTable,
      ]),
    ],
  );
  parent.firstElementChild?.setAttribute('id', 'parent-ph');
  parent.setAttribute('motion', 'paused');
  document
    .getElementById('app')
    ?.append(
      element('div', 'stage', [
        parent,
        nativeRegion(
          'peer',
          [nativeSurface('skeleton-block', 'peer-block', 'skeleton')],
          [nativeField('peer-button')],
        ),
      ]),
    );
  for (const register of [
    core.registerSkeletonBlock,
    core.registerSkeletonLine,
    core.registerSkeletonCircle,
    core.registerSkeletonText,
    core.registerTypingDots,
    core.registerTextLoader,
    core.registerChartLoader,
    core.registerTableLoader,
    core.registerLoadingRegion,
  ])
    register();
}
const started = performance.now();
while (!document.getElementById('table')?.shadowRoot) {
  if (performance.now() - started > 5000)
    throw new Error('Fixture did not mount');
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
// Keep enhancement paused until external sheets are available. The clock test
// must not count a brief unstyled, visible child as an unseen motion window.
await Promise.all(
  [
    ...document.querySelectorAll(
      'dotquilt-region,[data-dotquilt-surface],dotquilt-text-loader',
    ),
  ]
    .flatMap((host) => [
      ...(host.shadowRoot?.querySelectorAll<HTMLLinkElement>(
        'link[rel=stylesheet]',
      ) ?? []),
    ])
    .map((link) =>
      link.sheet
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            link.addEventListener('load', () => resolve(), { once: true });
            link.addEventListener(
              'error',
              () => reject(new Error('Fixture stylesheet failed')),
              { once: true },
            );
          }),
    ),
);
overrides.set('parent', {});
if (reactRoot) reactRoot.render(tree());
else
  (document.getElementById('parent') as core.LoadingRegion).motion = undefined;
for (const host of document.querySelectorAll(
  'dotquilt-region,dotquilt-text-loader',
))
  for (const type of [
    'dotquilt-handoff-start',
    'dotquilt-handoff-end',
    'dotquilt-handoff-cancel',
  ])
    host.addEventListener(type, (event) => {
      if (event.target === host)
        events.push({ id: host.id, type, ...(event as CustomEvent).detail });
    });
document.addEventListener('dotquilt-error', (event) =>
  errors.push({
    id: (event.target as HTMLElement).id,
    code: (event as CustomEvent).detail.code,
  }),
);
const keep = document.getElementById('keep');
const row = document.getElementById('row-a');
const host = (id: string) => document.getElementById(id) as core.LoadingRegion;
const chartHost = document.getElementById('chart') as core.ChartLoader;
chartHost.targetProvider = () => ({
  kind: 'line',
  points: [
    { x: 0, y: 40 },
    { x: 100, y: 10 },
    { x: 200, y: 35 },
  ],
  baseline: 60,
});
const tableHost = document.getElementById('table') as core.TableLoader;
tableHost.targetProvider = () => ({
  kind: 'table',
  cells: ['a', 'b'].map((id, index) => ({
    rowId: `row-${id}`,
    rowIndex: index,
    columnIndex: 0,
    kind: 'text' as const,
    text: 'A',
    bounds: { x: 0, y: index * 32, width: 200, height: 32 },
    baseline: index * 32 + 24,
    tone: 'base' as const,
    glyphs: [
      {
        character: 'A',
        bounds: { x: 10, y: index * 32 + 5, width: 10, height: 16 },
      },
    ],
  })),
});
host('table-region').revealTargets = ['row-a', 'row-b'].map((id) => ({
  id,
  element: document.getElementById(id) as HTMLElement,
}));
if (reactRoot) {
  overrides.set('chart', { targetProvider: chartHost.targetProvider });
  overrides.set('table', { targetProvider: tableHost.targetProvider });
  overrides.set('table-region', {
    revealTargets: host('table-region').revealTargets,
  });
  reactRoot.render(tree());
}
Object.assign(window, {
  coordination: {
    events,
    errors,
    patch: (id: string, patch: object) => {
      if (reactRoot) {
        overrides.set(id, { ...overrides.get(id), ...patch });
        reactRoot.render(tree());
      } else host(id).update(patch);
    },
    identity: () =>
      keep === document.getElementById('keep') &&
      row === document.getElementById('row-a'),
    clicks: () => clicks,
    remove: () => {
      if (reactRoot) reactRoot.unmount();
      else document.getElementById('stage')?.remove();
    },
    saturate: () => {
      const draw = ({ dot }: core.DrawContext<'skeleton'>) => {
        for (let i = 0; i < 4096; i++)
          dot({
            x: i % 64,
            y: Math.floor(i / 64),
            size: 1,
            opacity: 0.4,
            tone: 'base',
          });
        return undefined;
      };
      const binding = core.defineAnimation({
        contractVersion: 1,
        id: 'fixture/coordination-saturation',
        family: 'skeleton',
        phase: 'idle',
        options: { parse: () => ({}) },
        frame: draw,
        still: draw,
      })();
      const placeholder = document.getElementById('peer-block')?.parentElement;
      for (let i = 0; i < 5; i++) {
        const el = document.createElement(
          'dotquilt-skeleton-block',
        ) as core.SkeletonBlock;
        el.id = `saturated-${i}`;
        el.stylePolicy = css('skeleton');
        el.animations = { idle: binding };
        placeholder?.append(el);
      }
    },
  },
});
