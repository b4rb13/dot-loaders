import type * as Core from '@dotquilt-internal/core';
import { createElement as h } from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { css, type Family, initial, type Model, Scene } from './scene';

type Library = typeof Core;
type Host = Core.LoadingRegion | Core.TextLoader;
type Source =
  | Core.SkeletonBlock
  | Core.ChartLoader
  | Core.TableLoader
  | Core.TextLoader;
type Recipe = 'custom' | 'first-party';
const query = new URL(location.href).searchParams;
const family = (query.get('family') ?? 'chart') as Family;
const framework = location.pathname.slice(1);
const one = (await import(String('/copy-one/index.js'))) as Library;
const two = (await import(String('/copy-two/index.js'))) as Library;
const order = query.get('order') === 'two' ? [two, one] : [one, two];
const names = [
  'SkeletonBlock',
  'SkeletonLine',
  'SkeletonCircle',
  'SkeletonText',
  'TypingDots',
  'TextLoader',
  'ChartLoader',
  'TableLoader',
  'LoadingRegion',
] as const;
const libraries = [order[0] as Library, order[1] as Library];
for (const path of query.get('order') === 'two'
  ? ['two', 'one']
  : ['one', 'two']) {
  const module = await import(`/copy-${path}/register-all.js`);
  module.registerAll();
}
const models = [initial(family), initial(family)];
const behaviors: Record<string, unknown>[] = [{}, {}];
const roots: (Root | undefined)[] = [];
const committedRoots = new Set<number>();
let markHydrated: () => void;
const hydrated = new Promise<void>((resolve) => {
  markHydrated = resolve;
});
const onCommit = [0, 1].map((i) => () => {
  committedRoots.add(i);
  if (committedRoots.size === 2) markHydrated();
});
const refs: HTMLElement[] = [];
const targets: (readonly Core.RevealTarget[])[] = [];
const events: {
  index: number;
  type: string;
  cycle?: string;
  reason?: string;
}[] = [];
const errors: { index: number; code: string }[] = [];
const plans: {
  index: number;
  family: string;
  kind: string;
  count: number;
  frozen: boolean;
  lift: number;
  ids: readonly string[];
}[] = [];
const frames: {
  index: number;
  phase: string;
  lift: number;
  progress: number;
  delta: number;
}[] = [];
const calls = [0, 0];
const providerBounds = [false, false];
const rawInputs: object[] = [];
const projections: unknown[] = [];
const retained: (() => void)[] = [];
let mode = 'valid';
let failure = '';
let lift = 5;
let density = 1;
let claimTargets = true;
let recipe: Recipe = 'custom';
let preset = false;
let variantName = 'ridge';
const owner = (i: number) => document.getElementById(`owner-${i}`) as Host;
const source = (i: number) =>
  document.getElementById(
    family === 'text' ? `owner-${i}` : `source-${i}`,
  ) as Source;
const authored = (i: number) => libraries[i] as Library;
function provider(i: number) {
  return (bounds: Readonly<{ width: number; height: number }>) => {
    calls[i] = (calls[i] ?? 0) + 1;
    providerBounds[i] = Object.isFrozen(bounds);
    if (mode === 'throw') throw new Error('fixture projection');
    if (mode === 'null' || (mode === 'retry' && calls[i] === 1)) return null;
    if (mode === 'promise') return Promise.resolve(null);
    if (mode === 'reentrant')
      update(i, { state: 'pending', cycle: 'new-from-provider' });
    if (family === 'chart') {
      const variant = models[i]?.variant;
      const points = [
        { x: 0, y: 40 },
        { x: bounds.width / 2, y: 15 },
        { x: bounds.width, y: 60 },
      ];
      if (mode === 'invalid')
        return {
          kind: 'line',
          points: [{ x: Number.NaN, y: 0 }],
          baseline: 80,
        };
      const result =
        variant === 'bar'
          ? {
              kind: 'bar',
              bars: [{ x: 15, y: 20, width: 30, height: 60 }],
              baseline: 80,
            }
          : {
              kind: mode === 'legacy' ? 'points' : variant,
              points,
              ...(variant === 'scatter' ? {} : { baseline: 80 }),
            };
      rawInputs[i] = result;
      return result;
    }
    const result = {
      kind: 'table',
      cells: [0, 1].map((rowIndex) => ({
        rowId: `row-${i}-${rowIndex}`,
        rowIndex,
        columnIndex: 0,
        kind: mode === 'invalid' ? 'unknown' : 'text',
        text: 'A',
        bounds: { x: 0, y: rowIndex * 32, width: bounds.width, height: 32 },
        baseline: rowIndex * 32 + 24,
        tone: 'base',
        glyphs: [
          {
            character: 'A',
            bounds: { x: 5, y: rowIndex * 32 + 5, width: 8, height: 16 },
          },
        ],
      })),
    };
    rawInputs[i] = result;
    return result;
  };
}
function custom(i: number, phase: 'idle' | 'handoff') {
  const library = authored(i);
  const options = {
    parse: (
      value: Readonly<
        Partial<{ lift: number; count: number; claimTargets: boolean }>
      >,
    ) => ({
      lift: value.lift ?? lift,
      count: value.count ?? density,
      claimTargets: value.claimTargets ?? claimTargets,
    }),
  };
  const dotFrame = (
    { surface, dot }: Core.DrawContext<Family>,
    count: number,
  ) => {
    for (let n = 0; n < count; n++)
      dot({
        x: (n % 100) + 1,
        y: Math.floor(n / 100) + 1,
        size: 1,
        opacity: 0.5,
        tone: 'accent',
      });
    if (surface.family !== family) throw new Error('Wrong family');
  };
  if (phase === 'idle') {
    const draw = (
      context: Core.DrawContext<Family>,
      options: Readonly<{ lift: number; count: number }>,
    ) => {
      if (failure === 'idle') throw new Error('fixture idle');
      frames.push({
        index: i,
        phase: context.frame.static ? 'still' : 'idle',
        lift: options.lift,
        progress: 0,
        delta: context.frame.deltaMs,
      });
      dotFrame(context, options.count);
      return undefined;
    };
    return library.defineAnimation({
      contractVersion: 1,
      id: 'fixture/copy-shared-id',
      family,
      phase: 'idle',
      options,
      frame: draw,
      still: draw,
    })();
  }
  return library.defineAnimation({
    contractVersion: 1,
    id: 'fixture/copy-shared-id',
    family,
    phase: 'handoff',
    options,
    duration: () => {
      if (failure === 'duration') throw new Error('fixture duration');
      return 600;
    },
    prepare(surface, options) {
      if (failure === 'prepare') throw new Error('fixture prepare');
      const input = surface.input;
      projections[i] = input;
      plans.push({
        index: i,
        family: surface.family,
        kind: 'kind' in input ? input.kind : 'shapes',
        count:
          'cells' in input
            ? input.cells.length
            : 'bars' in input
              ? input.bars.length
              : 'points' in input
                ? input.points.length
                : 0,
        frozen:
          Object.isFrozen(surface) &&
          Object.isFrozen(surface.input) &&
          Object.isFrozen(surface.source) &&
          Object.isFrozen(options),
        lift: options.lift,
        ids: surface.revealTargetIds,
      });
      return Object.freeze({ lift: options.lift });
    },
    frame(context, options) {
      if (failure === 'frame') throw new Error('fixture frame');
      frames.push({
        index: i,
        phase: 'handoff',
        lift: context.prepared.lift,
        progress: context.frame.linearProgress,
        delta: context.frame.deltaMs,
      });
      dotFrame(context, options.count);
      context.reveal({ opacity: 0.5, translateY: context.prepared.lift });
      for (const id of options.claimTargets
        ? context.surface.revealTargetIds
        : [])
        context.revealTarget(id, {
          opacity: 0.5,
          translateY: context.prepared.lift,
        });
      retained.push(() => {
        dotFrame(context, 3);
        context.reveal({ opacity: 0 });
        for (const id of context.surface.revealTargetIds)
          context.revealTarget(id, { opacity: 0 });
      });
      return undefined;
    },
  })();
}
async function behavior(i: number) {
  let animations: object;
  if (recipe === 'custom')
    animations = {
      ...(family === 'region' ? {} : { idle: custom(i, 'idle') }),
      handoff: custom(i, 'handoff'),
    };
  else {
    const name = family === 'region' ? 'skeleton' : family;
    const module = await import(
      `/copy-${authored(i) === one ? 'one' : 'two'}/${name}-animations.js`
    );
    animations =
      family === 'chart'
        ? { idle: module[variantName](), handoff: module.morphWipe() }
        : family === 'table'
          ? {
              idle: module[variantName === 'ridge' ? 'typeOn' : variantName](),
              handoff: module.rows(),
            }
          : family === 'text'
            ? {
                idle: module[
                  variantName === 'ridge' ? 'scramble' : variantName
                ](),
                handoff: module.lock(),
              }
            : { idle: module.pulse(), handoff: module.dissolve() };
  }
  const config = {
    animations,
    ...(family === 'chart' || family === 'table'
      ? { targetProvider: provider(i) }
      : {}),
  };
  if (preset) {
    const { animations, ...other } = config;
    return {
      ...other,
      preset: authored(i).definePreset<Family>({
        kind: family,
        animations: animations as NonNullable<
          Core.Preset<Family>['animations']
        >,
      }),
    };
  }
  return config;
}
function commit(i: number) {
  const model = models[i] as Model;
  if (family !== 'text')
    targets[i] ??= [0, 1].map((n) => ({
      id: `row-${i}-${n}`,
      element: document.getElementById(`row-${i}-${n}`) as HTMLElement,
    }));
  if (framework === 'react') {
    const element = h(Scene, {
      model,
      index: i,
      behavior: behaviors[i] ?? {},
      targets: targets[i],
      onCommit: onCommit[i],
    });
    if (!roots[i])
      roots[i] = hydrateRoot(
        document.getElementById(`root-${i}`) as HTMLElement,
        element,
        {
          identifierPrefix: `copy-${i}-`,
          onRecoverableError: (error) => {
            throw error;
          },
        },
      );
    else flushSync(() => roots[i]?.render(element));
  } else {
    const host = owner(i);
    host.update({
      state: model.state,
      cycle: model.cycle,
      motion: model.motion,
    });
    if (family !== 'text') source(i).motion = model.motion;
    const target = family === 'region' ? host : source(i);
    for (const key of ['animations', 'preset', 'targetProvider'])
      if (!(key in (behaviors[i] ?? {}))) Reflect.set(target, key, undefined);
    for (const [key, value] of Object.entries(behaviors[i] ?? {}))
      Reflect.set(target, key, value);
    if (family === 'chart')
      (target as Core.ChartLoader).variant = model.variant;
  }
  if (family !== 'text' && framework !== 'react')
    (owner(i) as Core.LoadingRegion).revealTargets = targets[i] ?? [];
}
function update(i: number, patch: Partial<Model>) {
  models[i] = { ...(models[i] as Model), ...patch };
  commit(i);
}
for (const i of [0, 1]) {
  if (framework !== 'react') {
    const host = document.createElement(
      family === 'text' ? 'dotquilt-text-loader' : 'dotquilt-region',
    ) as Host;
    host.id = `owner-${i}`;
    host.stylePolicy = css(family === 'text' ? 'text' : 'region');
    host.motion = 'paused';
    host.state = 'pending';
    if (family === 'text') {
      host.textContent = 'Outcome';
      (host as Core.TextLoader).mask = 'Loading';
    } else {
      const child = document.createElement(
        family === 'chart'
          ? 'dotquilt-chart-loader'
          : family === 'table'
            ? 'dotquilt-table-loader'
            : 'dotquilt-skeleton-block',
      ) as Source;
      child.id = `source-${i}`;
      child.slot = 'placeholder';
      child.stylePolicy = css(family === 'region' ? 'skeleton' : family);
      child.motion = 'paused';
      if (family === 'table')
        (child as Core.TableLoader).update({
          rows: 2,
          columns: [{ kind: 'text', width: 1 }],
        });
      const input = document.createElement('input');
      input.id = `input-${i}`;
      input.value = 'retained';
      input.setAttribute('aria-label', `Input ${i}`);
      host.append(
        child,
        input,
        ...[0, 1].map((n) => {
          const row = document.createElement('p');
          row.id = `row-${i}-${n}`;
          row.textContent = `Row ${n}`;
          return row;
        }),
      );
    }
    document.getElementById(`root-${i}`)?.append(host);
  }
  behaviors[i] = await behavior(i);
  commit(i);
}
// Wait for actual React layout commits, rather than assuming a number of frames.
if (framework === 'react') await hydrated;
for (const i of [0, 1]) {
  const host = owner(i);
  refs[i] = host;
  for (const type of ['start', 'end', 'cancel'])
    host.addEventListener(`dotquilt-handoff-${type}`, (event) => {
      const detail = (event as CustomEvent<Core.HandoffDetail>).detail;
      events.push({
        index: i,
        type,
        ...(detail.cycle ? { cycle: detail.cycle } : {}),
        ...(detail.reason ? { reason: detail.reason } : {}),
      });
    });
  host.addEventListener('dotquilt-error', (event) =>
    errors.push({
      index: i,
      code: (event as CustomEvent<Core.LoaderErrorDetail>).detail.code,
    }),
  );
  if (family !== 'text')
    source(i).addEventListener('dotquilt-error', (event) =>
      errors.push({
        index: i,
        code: (event as CustomEvent<Core.LoaderErrorDetail>).detail.code,
      }),
    );
  commit(i);
}
const api = {
  family,
  framework,
  events,
  errors,
  plans,
  frames,
  calls,
  providerBounds,
  projections,
  mutateProjection() {
    for (const input of rawInputs) {
      for (const key of ['points', 'bars', 'cells']) {
        const items = Reflect.get(input, key);
        if (Array.isArray(items)) items.length = 0;
      }
    }
  },
  separate:
    one.defineAnimation !== two.defineAnimation &&
    names.every((name) => one[name] !== two[name]),
  identity: () => [0, 1].every((i) => refs[i] === owner(i)),
  update,
  mode(value: string) {
    mode = value;
    calls.fill(0);
  },
  failure(value: string) {
    failure = value;
  },
  async configure(value: {
    recipe?: Recipe;
    preset?: boolean;
    lift?: number;
    variantName?: string;
    density?: number;
    claimTargets?: boolean;
  }) {
    recipe = value.recipe ?? recipe;
    preset = value.preset ?? preset;
    lift = value.lift ?? lift;
    variantName = value.variantName ?? variantName;
    density = value.density ?? density;
    claimTargets = value.claimTargets ?? claimTargets;
    for (const i of [0, 1]) {
      behaviors[i] = await behavior(i);
      commit(i);
    }
  },
  stale() {
    for (const callback of retained) callback();
  },
  remove(i?: number) {
    for (const n of i === undefined ? [0, 1] : [i]) {
      if (framework === 'react') flushSync(() => roots[n]?.unmount());
      else owner(n)?.remove();
    }
  },
  snapshot(i: number) {
    const capture = Reflect.get(
      source(i),
      Symbol.for('dotquilt.painter.v1'),
    )?.capture;
    const committed = capture?.();
    if (committed?.length)
      return committed.map(
        (dot: {
          x: number;
          y: number;
          size: number;
          opacity: number;
          tone: string;
        }) => [
          String(dot.x),
          String(dot.y),
          String(dot.size),
          String(dot.opacity),
          dot.tone === 'accent'
            ? 'var(--dotquilt-accent-color,currentColor)'
            : 'var(--dotquilt-color,currentColor)',
        ],
      );
    return Array.from(
      source(i).shadowRoot?.querySelectorAll('svg circle') ?? [],
      (element) =>
        ['cx', 'cy', 'r', 'opacity', 'fill'].map((name) =>
          element.getAttribute(name),
        ),
    );
  },
};
declare global {
  interface Window {
    copies: typeof api;
  }
}
window.copies = api;
