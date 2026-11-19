/**
 * Shared by the examples gallery and the playground: wiring a demo's loaders
 * (chart geometry, table columns, animations) and running a simulated load.
 */
import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from '@dotquilt-internal/core/animations/chart';
import { dissolve, pulse } from '@dotquilt-internal/core/animations/skeleton';
import {
  rows,
  tableShimmer,
  typeOn,
} from '@dotquilt-internal/core/animations/table';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from '@dotquilt-internal/core/animations/text';
import type { ChartLoader } from '@dotquilt-internal/core/chart';
import type { LoadingRegion } from '@dotquilt-internal/core/region';
import type { TableColumn, TableLoader } from '@dotquilt-internal/core/table';
import type { TextLoader } from '@dotquilt-internal/core/text';
import { linePoints, revenue } from '../../../../../examples/site/data';

/** Every animation a recipe can name, by name, taking its options. */
type Options = Readonly<Record<string, number | string>>;
const animations: Record<string, (options?: Options) => unknown> = {
  bars: (o) => bars(o as never),
  morphWipe: (o) => morphWipe(o as never),
  ridge: (o) => ridge(o as never),
  scatter: (o) => scatter(o as never),
  scan: (o) => scan(o as never),
  terrain: (o) => terrain(o as never),
  cycle: (o) => cycle(o as never),
  dissolve: (o) => dissolve(o as never),
  pulse: (o) => pulse(o as never),
  rows: (o) => rows(o as never),
  tableShimmer: (o) => tableShimmer(o as never),
  typeOn: (o) => typeOn(o as never),
  fade: (o) => fade(o as never),
  labelPulse: (o) => labelPulse(o as never),
  lock: (o) => lock(o as never),
  printText: (o) => printText(o as never),
  scramble: (o) => scramble(o as never),
  scrambleCharacters: (o) => scrambleCharacters(o as never),
  scrambleWords: (o) => scrambleWords(o as never),
};

/** Deals by size and days to close, as drawn in the demo (320 × 180). */
const deals = [
  [18, 40],
  [34, 62],
  [52, 48],
  [70, 96],
  [88, 70],
  [104, 112],
  [126, 88],
  [142, 120],
  [160, 104],
  [178, 134],
  [196, 118],
  [214, 140],
  [236, 128],
  [252, 150],
  [274, 138],
  [296, 160],
];
const columns: Record<string, TableColumn[]> = {
  invoices: [
    { kind: 'text', width: 1.6 },
    { kind: 'number' },
    { kind: 'badge' },
  ],
  people: [{ kind: 'text', width: 1.4 }, { kind: 'text' }, { kind: 'date' }],
};

/** Every loader element a demo can hold. */
export const loaderSelector =
  'dotquilt-skeleton-block, dotquilt-skeleton-circle, dotquilt-skeleton-line, dotquilt-skeleton-text, dotquilt-text-loader, dotquilt-chart-loader, dotquilt-table-loader, dotquilt-typing-dots';

/** Gives every loader in `scope` these animations; empty names clear them. */
export function animate(
  scope: ParentNode,
  idle?: string,
  handoff?: string,
  idleOptions: Options = {},
  handoffOptions: Options = {},
) {
  for (const loader of scope.querySelectorAll<
    HTMLElement & { animations: unknown }
  >(loaderSelector)) {
    if (loader.localName === 'dotquilt-typing-dots') continue;
    loader.animations = {
      ...(idle && animations[idle] && { idle: animations[idle](idleOptions) }),
      ...(handoff &&
        animations[handoff] && {
          handoff: animations[handoff](handoffOptions),
        }),
    };
  }
}

/** Chart geometry, table columns and row targets for the demos in `scope`. */
export function wire(scope: ParentNode) {
  for (const chart of scope.querySelectorAll<ChartLoader>('[data-chart]')) {
    const kind = chart.dataset.chart;
    chart.targetProvider = ({ width, height }) => {
      if (kind === 'bar') {
        const top = Math.max(...revenue) * 1.15;
        const slot = width / revenue.length;
        return {
          kind: 'bar',
          baseline: height,
          bars: revenue.map((value, i) => ({
            x: i * slot + slot * 0.2,
            y: height - (value / top) * height,
            width: slot * 0.6,
            height: (value / top) * height,
          })),
        };
      }
      if (kind === 'scatter')
        return {
          kind: 'scatter',
          points: deals.map(([x = 0, y = 0]) => ({
            x: (x / 320) * width,
            y: height - (y / 180) * height,
          })),
        };
      return {
        kind: 'line',
        points: linePoints(revenue, width, height),
        baseline: height,
      };
    };
  }
  for (const table of scope.querySelectorAll<TableLoader>('[data-columns]'))
    table.columns = columns[table.dataset.columns ?? ''] ?? columns.invoices;
  for (const region of scope.querySelectorAll<LoadingRegion>('[data-rows]'))
    region.revealTargets = [...(region.querySelector('tbody')?.rows ?? [])].map(
      (element, i) => ({ id: `row-${i}`, element }),
    );
}

type Owner = (LoadingRegion | TextLoader) & HTMLElement;
let count = 0;

/**
 * One simulated request for the demo in `scope`: its placeholder, then its
 * content after `ms`, or as soon as the returned `settle` is called.
 */
export function load(scope: ParentNode, ms: number) {
  const owner = scope.querySelector<Owner>('[data-owner]');
  if (!owner) return { settle() {}, done: Promise.resolve() };
  const cycle = `live-${++count}`;
  const refresh = owner.hasAttribute('data-refresh') && owner.state === 'ready';
  owner.update({ state: refresh ? 'refreshing' : 'pending', cycle });
  let settle = () => {};
  const done = new Promise<void>((resolve) => {
    const timer = setTimeout(() => settle(), ms);
    settle = () => {
      clearTimeout(timer);
      if (owner.cycle === cycle) {
        if (owner.dataset.value) owner.textContent = owner.dataset.value;
        owner.update({ state: 'ready' });
      }
      resolve();
    };
  });
  return { settle: () => settle(), done };
}
