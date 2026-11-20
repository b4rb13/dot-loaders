import { defineAnimation, definePreset } from 'dotquilt/animations';
import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from 'dotquilt/animations/chart';

const recipes = { ridge, scan, terrain, bars, scatter, cycle, morphWipe };

import {
  type ChartInput,
  type ChartLoader,
  registerChartLoader,
} from 'dotquilt/chart';
import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';

const chart = document.getElementById('chart') as ChartLoader,
  region = document.getElementById('chart-region') as LoadingRegion;
const errors: string[] = [],
  events: { type: string; reason?: string; animation?: string }[] = [],
  violations: string[] = [];
region.addEventListener('dotquilt-error', (e) => errors.push(e.detail.code));
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
])
  region.addEventListener(type, (e) =>
    events.push({ type, ...(e as CustomEvent).detail }),
  );
document.addEventListener('securitypolicyviolation', (e) =>
  violations.push(e.violatedDirective),
);
let calls = 0,
  customFrames = 0,
  stale: (() => void) | undefined;
const sample = (kind: ChartLoader['variant']): ChartInput =>
  kind === 'bar'
    ? {
        kind,
        bars: [
          { x: 20, y: 80, width: 55, height: 100 },
          { x: 110, y: 40, width: 55, height: 140 },
          { x: 200, y: 100, width: 55, height: 80 },
        ],
        baseline: 180,
      }
    : kind === 'scatter'
      ? {
          kind,
          points: [
            { x: 50, y: 60 },
            { x: 130, y: 120 },
            { x: 240, y: 40 },
          ],
        }
      : {
          kind,
          points: [
            { x: 0, y: 130 },
            { x: 80, y: 40 },
            { x: 160, y: 90 },
            { x: 240, y: 30 },
            { x: 320, y: 70 },
          ],
          baseline: 180,
        };
const content = document.getElementById('chart-content'),
  node = content?.firstChild;
let providerMode = 'valid';
const provider = () => {
  calls++;
  if (providerMode === 'throw') throw new Error('provider');
  if (providerMode === 'null' || (providerMode === 'retry' && calls % 2 === 1))
    return null;
  if (providerMode === 'oversize')
    return {
      kind: 'points' as const,
      points: Array.from({ length: 2049 }, () => ({ x: 0, y: 0 })),
    };
  if (providerMode === 'nan')
    return { kind: 'points' as const, points: [{ x: NaN, y: 0 }] };
  return sample(chart.variant);
};
const mode = new URL(location.href).searchParams.get('mode');
for (const [host, name] of [
  [chart, 'chart'],
  [region, 'region'],
] as const)
  Reflect.set(
    host,
    'stylePolicy',
    mode?.startsWith('external')
      ? { mode: 'external', href: `/core/styles/${name}.css` }
      : {
          mode: 'inline',
          ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
        },
  );
Reflect.set(chart, 'targetProvider', provider);
registerChartLoader();
registerLoadingRegion();
// Application-owned SSR guards are released after the region installs its current presentation.
queueMicrotask(() => {
  content?.removeAttribute('aria-hidden');
  content?.removeAttribute('inert');
});
const custom = defineAnimation({
  contractVersion: 1,
  id: 'fixture/chart-idle',
  family: 'chart',
  phase: 'idle',
  options: {
    parse: (v: Readonly<{ gain?: number }>) => ({ gain: v.gain ?? 0.5 }),
  },
  still(ctx) {
    ctx.dot({ x: 5, y: 5, size: 2, opacity: 0.2, tone: 'base' });
  },
  frame(ctx, o) {
    customFrames++;
    ctx.dot({
      x: 5 + ctx.frame.timeMs / 50,
      y: 25,
      size: 2,
      opacity: o.gain,
      tone: 'accent',
    });
  },
});
const broken = defineAnimation({
  contractVersion: 1,
  id: 'fixture/chart-broken',
  family: 'chart',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 300,
  prepare() {
    throw new Error('fixture failure');
  },
  frame() {},
});
let captured: unknown;
const handoff = defineAnimation({
  contractVersion: 1,
  id: 'fixture/chart-handoff',
  family: 'chart',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 400,
  prepare(surface) {
    captured = surface;
    return { x: surface.width / 2 };
  },
  frame(ctx) {
    ctx.dot({
      x: ctx.prepared.x,
      y: 25,
      size: 2,
      opacity: 1 - ctx.frame.progress,
      tone: 'accent',
    });
    ctx.reveal({ opacity: ctx.frame.progress });
    stale = () => ctx.reveal({ opacity: 0 });
  },
});
Object.assign(window, {
  m4Chart: {
    errors,
    events,
    violations,
    sample,
    provider: (mode: string) => {
      providerMode = mode;
      calls = 0;
      chart.targetProvider = provider;
    },
    calls: () => calls,
    update: (patch: Parameters<ChartLoader['update']>[0]) =>
      chart.update(patch),
    ready: (duration?: number, easing?: string) =>
      region.update({
        state: 'ready',
        ...(duration !== undefined
          ? { timing: { duration, ...(easing ? { easing } : {}) } }
          : {}),
      }),
    pending: (cycle = 'next') => region.update({ state: 'pending', cycle }),
    recipe: (name: keyof typeof recipes, options?: object) => {
      const binding = Reflect.apply(recipes[name], undefined, [options]);
      chart.animations = { ...chart.animations, [binding.phase]: binding };
    },
    custom: () => (chart.animations = { idle: custom(), handoff: handoff() }),
    preset: () =>
      (chart.preset = definePreset({
        kind: 'chart',
        variant: 'scatter',
        speed: 0.6,
        animations: { idle: recipes.scan() },
      })),
    customFrames: () => customFrames,
    broken: () => (chart.animations = { handoff: broken() }),
    frozen: () => {
      const s = captured as import('dotquilt').AnimationSurface<'chart'>;
      return (
        Object.isFrozen(s) &&
        Object.isFrozen(s.input) &&
        Object.isFrozen(s.source) &&
        s.source.every(Object.isFrozen)
      );
    },
    stale: () => stale?.(),
    identity: () =>
      document.getElementById('chart-content') === content &&
      content?.firstChild === node,
    detach: () => chart.remove(),
  },
});
