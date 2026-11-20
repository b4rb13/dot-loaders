import * as adapter from '@dotquilt/react';
import * as core from 'dotquilt';
import type { AnimationFamily } from 'dotquilt/animations';
import * as chartAnimations from 'dotquilt/animations/chart';
import * as tableAnimations from 'dotquilt/animations/table';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';

const framework = location.pathname.slice(1);
const family = new URL(location.href).searchParams.get('family') ?? 'chart';
const second = new URL(location.href).searchParams.has('second');
const columns = [
  { kind: 'text', width: 1 },
] satisfies readonly core.TableColumn[];
const events: { type: string; reason?: string; animation?: string }[] = [];
const errors: string[] = [];
const calls = { chart: 0, table: 0, table2: 0, idle: 0, still: 0, frames: 0 };
const samples: {
  family: string;
  progress: number;
  linear: number;
  time: number;
  delta: number;
}[] = [];
const plans: {
  family: string;
  width: number;
  input: unknown;
  source: number;
  ids: readonly string[];
  frozen: boolean;
  option: number;
}[] = [];
let providerMode = 'valid';
let clicks = 0;
let retained: (() => void) | undefined;
const overrides = new Map<string, object>([['owner', { motion: 'paused' }]]);
const css = (name: string) => ({
  mode: 'external' as const,
  href: `/styles/${name}.css`,
});
const chartData = {
  kind: 'line' as const,
  points: [
    { x: 0, y: 50 },
    { x: 140, y: 10 },
    { x: 280, y: 45 },
  ],
  baseline: 80,
};
const tableData: core.TableInput = {
  kind: 'table',
  cells: ['a', 'b'].map((id, rowIndex) => ({
    rowId: `row-${id}`,
    rowIndex,
    columnIndex: 0,
    kind: 'text' as const,
    text: 'A',
    bounds: { x: 0, y: rowIndex * 32, width: 280, height: 32 },
    baseline: rowIndex * 32 + 24,
    tone: 'base' as const,
    glyphs: [
      {
        character: 'A',
        bounds: { x: 10, y: rowIndex * 32 + 5, width: 10, height: 16 },
      },
    ],
  })),
};
function projected<F extends 'chart' | 'table'>(
  name: F,
  key: 'chart' | 'table' | 'table2' = name,
) {
  return () => {
    calls[key]++;
    if (providerMode === 'mutate-content' && name === 'chart')
      document
        .getElementById('row-a')
        ?.append(
          document.createTextNode('Changed during another source preparation'),
        );
    if (providerMode === 'chart-null' && name === 'chart') return null;
    if (name === 'chart' && providerMode === 'bar')
      return {
        kind: 'bar',
        bars: [
          { x: 20, y: 20, width: 30, height: 60 },
          { x: 130, y: 40, width: 30, height: 40 },
        ],
        baseline: 80,
      };
    if (name === 'chart' && providerMode === 'scatter')
      return {
        kind: 'scatter',
        points: [
          { x: 40, y: 20 },
          { x: 230, y: 65 },
        ],
      };
    if (providerMode === 'throw') throw new Error('fixture provider');
    if (
      providerMode === 'null' ||
      (providerMode === 'retry' && calls[key] === 1)
    )
      return null;
    if (providerMode === 'invalid')
      return { kind: 'points', points: [{ x: Number.NaN, y: 0 }] };
    if (providerMode === 'oversize')
      return {
        kind: 'points',
        points: Array.from({ length: 2049 }, () => ({ x: 0, y: 0 })),
      };
    if (providerMode === 'boundary' || providerMode === 'nested-overflow') {
      if (name === 'chart')
        return {
          kind: 'scatter',
          points: Array.from({ length: 2048 }, (_, x) => ({
            x: x % 280,
            y: x % 80,
          })),
        };
      return {
        kind: 'table',
        cells: Array.from({ length: 8 }, (_, index) => ({
          ...tableData.cells[index % 2],
          columnIndex: Math.floor(index / 2),
          glyphs: Array.from(
            {
              length:
                255 +
                (providerMode === 'nested-overflow' && index === 7 ? 1 : 0),
            },
            () => tableData.cells[0]?.glyphs[0],
          ),
        })),
      };
    }
    if (providerMode === 'legacy')
      return {
        kind: 'rects',
        rects: [{ x: 10, y: 15, width: 20, height: 40 }],
      };
    if (providerMode === 'reentrant')
      owner().update({ state: 'pending', cycle: 'provider-new' });
    return name === 'chart'
      ? chartData
      : key === 'table2'
        ? {
            kind: 'table',
            cells: tableData.cells.map((cell) => ({
              ...cell,
              rowId: cell.rowIndex === 0 ? 'row-c' : 'row-d',
            })),
          }
        : tableData;
  };
}
function custom<F extends AnimationFamily>(kind: F, option = 4, rows = true) {
  return core.defineAnimation({
    contractVersion: 1,
    id: `fixture/shared-${kind}`,
    family: kind,
    phase: 'handoff',
    options: {
      parse: (value: Readonly<Partial<{ lift: number }>>) => ({
        lift: value.lift ?? option,
      }),
    },
    duration: () => 900,
    prepare(surface, options) {
      plans.push({
        family: surface.family,
        width: surface.width,
        input: surface.input,
        source: surface.source.length,
        ids: surface.revealTargetIds,
        frozen:
          Object.isFrozen(surface) &&
          Object.isFrozen(surface.input) &&
          Object.isFrozen(surface.source) &&
          Object.isFrozen(options),
        option: options.lift,
      });
      return { lift: options.lift };
    },
    frame({ surface, frame, prepared, dot, reveal, revealTarget }) {
      calls.frames++;
      if (providerMode === 'frame-throw') throw new Error('fixture frame');
      dot({
        x: surface.width / 2,
        y: 12,
        size: 2,
        opacity: 0.5,
        tone: 'accent',
      });
      // Deliberately omit a final full reveal. Completion must still be exact.
      reveal({ opacity: 0.4, translateY: prepared.lift, clipStart: 0.5 });
      for (const id of rows ? surface.revealTargetIds : [])
        revealTarget(id, { opacity: 0.5, translateY: prepared.lift });
      retained = () => {
        dot({ x: 0, y: 0, size: 2, opacity: 1, tone: 'base' });
        reveal({ opacity: 0, clipStart: 0 });
        for (const id of surface.revealTargetIds)
          revealTarget(id, { opacity: 0 });
      };
      if (frame.linearProgress > 1) throw new Error('Unbounded progress');
      return undefined;
    },
  })();
}
const idleFrame = ({ dot }: core.DrawContext<'skeleton'>) => {
  calls.idle++;
  dot({ x: 12, y: 12, size: 2, opacity: 0.5, tone: 'base' });
  return undefined;
};
const idle = core.defineAnimation({
  contractVersion: 1,
  id: 'fixture/shared-idle',
  family: 'skeleton',
  phase: 'idle',
  options: { parse: () => ({}) },
  frame: idleFrame,
  still(context) {
    calls.still++;
    return idleFrame(context);
  },
})();
function multiCustom(kind: 'chart' | 'table', key: string, mode: string) {
  return core.defineAnimation({
    contractVersion: 1,
    id: 'fixture/multi-shared-id',
    family: kind,
    phase: 'handoff',
    options: { parse: () => ({}) },
    duration: () => (kind === 'chart' ? 700 : 1100),
    prepare(surface) {
      if (mode === 'prepare-throw' && kind === 'chart')
        throw new Error('second source prepare');
      return {
        ids:
          kind === 'table' && surface.input.kind === 'table'
            ? surface.input.cells.map((cell) => cell.rowId)
            : [],
      };
    },
    frame({ surface, frame, prepared, dot, reveal, revealTarget }) {
      if (samples.length < 2000)
        samples.push({
          family: key,
          progress: frame.progress,
          linear: frame.linearProgress,
          time: frame.timeMs,
          delta: frame.deltaMs,
        });
      if (mode === 'saturate') {
        for (let i = 0; i < 4096; i++)
          dot({
            x: i % 64,
            y: Math.floor(i / 64),
            size: 1,
            opacity: 0.4,
            tone: 'base',
          });
      } else
        dot({
          x: 10 + frame.progress * 20,
          y: 10,
          size: 2,
          opacity: 0.5,
          tone: 'accent',
        });
      if (mode === 'double-reveal') reveal({ opacity: 0, clipStart: 0 });
      if (mode !== 'one-shot' || kind !== 'chart' || frame.linearProgress === 0)
        reveal({
          opacity: kind === 'chart' ? 0.7 : 0.4,
          clipStart: kind === 'chart' ? 0.25 : 0.75,
          translateY: kind === 'chart' ? 2 : -4,
        });
      for (const id of mode === 'conflict'
        ? surface.revealTargetIds
        : [...new Set(prepared.ids)])
        revealTarget(id, { opacity: 0.5, translateY: 2 });
      return undefined;
    },
  })();
}
const specs: [string, string, string, string, object][] = [
  [
    'SkeletonBlock',
    'skeleton-block',
    'block',
    'skeleton',
    { animations: { idle } },
  ],
  ['TypingDots', 'typing-dots', 'typing', 'typing', {}],
  ...(family === 'table' || family === 'region'
    ? [
        [
          'TableLoader',
          'table-loader',
          'table',
          'table',
          {
            rows: 2,
            columns,
            targetProvider: projected('table'),
          },
        ] as [string, string, string, string, object],
      ]
    : []),
  ...(family === 'chart' || family === 'region'
    ? [
        [
          'ChartLoader',
          'chart-loader',
          'chart',
          'chart',
          { targetProvider: projected('chart') },
        ] as [string, string, string, string, object],
      ]
    : []),
  ...(second
    ? [
        [
          'TableLoader',
          'table-loader',
          'table2',
          'table',
          {
            rows: 2,
            columns,
            targetProvider: projected('table', 'table2'),
          },
        ] as [string, string, string, string, object],
      ]
    : []),
];
if (new URL(location.href).searchParams.has('reverse')) specs.reverse();
const tree = () =>
  h(
    'div',
    { id: 'stage' },
    h(
      adapter.LoadingRegion,
      {
        id: 'owner',
        state: 'pending',
        stylePolicy: css('region'),
        timing: { duration: 900 },
        placeholder: h(
          'div',
          { id: 'placeholder' },
          ...specs.map(([name, , id, asset, props]) =>
            h(Reflect.get(adapter, name), {
              id,
              key: id,
              stylePolicy: css(asset),
              ...props,
              ...overrides.get(id),
            }),
          ),
        ),
        ...overrides.get('owner'),
      },
      h(
        'section',
        { id: 'content' },
        h('div', { id: 'row-a' }, 'Alpha'),
        h('div', { id: 'row-b' }, 'Beta'),
        ...(second
          ? [
              h('div', { id: 'row-c', key: 'c' }, 'Gamma'),
              h('div', { id: 'row-d', key: 'd' }, 'Delta'),
            ]
          : []),
        h('input', {
          id: 'keep',
          defaultValue: 'preserved',
          'aria-label': 'Current outcome',
          onClick: () => clicks++,
        }),
      ),
    ),
  );
let root: ReturnType<typeof createRoot> | undefined;
if (framework === 'react') {
  root = createRoot(document.getElementById('app') as HTMLElement);
  root.render(tree());
} else {
  const el = (tag: string, id: string) =>
    Object.assign(document.createElement(tag), { id });
  const stage = el('div', 'stage'),
    host = el('dotquilt-region', 'owner'),
    placeholder = el('div', 'placeholder'),
    content = el('section', 'content');
  placeholder.slot = 'placeholder';
  for (const [, tag, id, asset, props] of specs)
    placeholder.append(
      Object.assign(el(`dotquilt-${tag}`, id), {
        stylePolicy: css(asset),
        ...props,
      }),
    );
  for (const id of second
    ? ['row-a', 'row-b', 'row-c', 'row-d']
    : ['row-a', 'row-b']) {
    const row = el('div', id);
    row.textContent = id;
    content.append(row);
  }
  const keep = el('input', 'keep') as HTMLInputElement;
  keep.value = 'preserved';
  keep.setAttribute('aria-label', 'Current outcome');
  keep.onclick = () => clicks++;
  content.append(keep);
  host.append(placeholder, content);
  Object.assign(host, {
    state: 'pending',
    motion: 'paused',
    timing: { duration: 900 },
    stylePolicy: css('region'),
  });
  stage.append(host);
  document.getElementById('app')?.append(stage);
  for (const register of [
    core.registerSkeletonBlock,
    core.registerTypingDots,
    core.registerChartLoader,
    core.registerTableLoader,
    core.registerLoadingRegion,
  ])
    register();
}
function owner() {
  return document.getElementById('owner') as core.LoadingRegion;
}
while (!owner()?.shadowRoot)
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
await Promise.all(
  [...document.querySelectorAll('dotquilt-region,[data-dotquilt-surface]')]
    .flatMap((host) => [
      ...(host.shadowRoot?.querySelectorAll<HTMLLinkElement>(
        'link[rel=stylesheet]',
      ) ?? []),
    ])
    .map((link) =>
      link.sheet
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Fixture stylesheet'));
          }),
    ),
);
function patch(id: string, value: object) {
  if (root) {
    overrides.set(id, { ...overrides.get(id), ...value });
    root.render(tree());
  } else (document.getElementById(id) as core.LoadingRegion).update(value);
}
owner().addEventListener('dotquilt-error', (e) =>
  errors.push((e as CustomEvent).detail.code),
);
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
])
  owner().addEventListener(type, (e) =>
    events.push({ type, ...(e as CustomEvent).detail }),
  );
const keep = document.getElementById('keep');
const targets = () =>
  (second ? ['row-a', 'row-b', 'row-c', 'row-d'] : ['row-a', 'row-b']).map(
    (id) => ({
      id,
      element: document.getElementById(id) as HTMLElement,
    }),
  );
patch('owner', { motion: undefined, revealTargets: targets() });
Object.assign(window, {
  shared: {
    events,
    errors,
    calls,
    samples,
    plans,
    patch,
    provider: (mode: string) => {
      providerMode = mode;
      calls.chart = calls.table = calls.table2 = 0;
    },
    source: (option = 4, rows = true) =>
      patch(
        family === 'table'
          ? 'table'
          : family === 'skeleton'
            ? 'block'
            : 'chart',
        {
          animations: {
            handoff: custom(
              family === 'skeleton'
                ? 'skeleton'
                : family === 'table'
                  ? 'table'
                  : 'chart',
              option,
              rows,
            ),
          },
        },
      ),
    override: (option = 4, preset = false) =>
      patch(
        'owner',
        preset
          ? {
              preset: core.definePreset({
                kind: 'region',
                animations: { handoff: custom('region', option) },
              }),
            }
          : { animations: { handoff: custom('region', option) } },
      ),
    stale: () => retained?.(),
    mutateProviderData: () => {
      chartData.points[0] = { x: 999, y: 999 };
    },
    targets,
    identity: () => keep === document.getElementById('keep'),
    clicks: () => clicks,
    theme: () => {
      owner().classList.add('updated');
      core.refreshStyles(owner());
    },
    multi: (mode: string) => {
      for (const id of ['table', 'chart', ...(second ? ['table2'] : [])])
        patch(id, {
          animations: {
            handoff: multiCustom(id === 'chart' ? 'chart' : 'table', id, mode),
          },
        });
    },
    repertoire: (
      variant: core.ChartVariant,
      idle: 'typeOn' | 'tableShimmer',
      cellStyle: tableAnimations.TypeOnOptions['cellStyle'],
      index: number,
    ) => {
      providerMode = variant === 'line' ? 'valid' : variant;
      calls.chart = calls.table = calls.table2 = 0;
      const chartIdles = [
        chartAnimations.ridge(),
        chartAnimations.scan(),
        chartAnimations.terrain(),
        chartAnimations.bars(),
        chartAnimations.scatter(),
        chartAnimations.cycle(),
      ];
      patch('chart', {
        variant,
        animations: {
          idle: chartIdles[index % 6],
          handoff: chartAnimations.morphWipe(),
        },
      });
      for (const id of ['table', ...(second ? ['table2'] : [])])
        patch(id, {
          animations: {
            idle: (idle === 'typeOn'
              ? tableAnimations.typeOn
              : tableAnimations.tableShimmer)({
              cellStyle,
              cadenceMs: index % 2 ? 250 : 1200,
            }),
            handoff: tableAnimations.rows({
              staggerMs: index % 2 ? 0 : 24,
              settlePx: index % 2 ? 0 : 8,
            }),
          },
        });
    },
    idleOnly: () => {
      patch('chart', {
        animations: {
          idle: chartAnimations.scan({ amplitude: 0 }),
          handoff: undefined,
        },
      });
      patch('table', {
        animations: {
          idle: tableAnimations.tableShimmer({ cellStyle: 'date' }),
          handoff: undefined,
        },
      });
    },
    remove: () => {
      if (root) root.unmount();
      else document.getElementById('stage')?.remove();
    },
  },
});
