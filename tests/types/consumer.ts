import { defineAnimation, definePreset } from 'dotquilt/animations';
import { dissolve, pulse } from 'dotquilt/animations/skeleton';

dissolve({ fallPx: 8 });
// @ts-expect-error Fall displacement is a typed finite numeric option.
dissolve({ fallPx: '5px' });

import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { renderStatic } from 'dotquilt/server';
import { registerSkeletonBlock, type SkeletonBlock } from 'dotquilt/skeleton';

registerSkeletonBlock();
registerLoadingRegion();
declare const block: SkeletonBlock;
declare const region: LoadingRegion;
block.animations = { idle: pulse({ periodMs: 1200 }), handoff: dissolve() };
region.update({ state: 'pending', cycle: 'one' });
region.update({ state: 'ready', timing: { duration: 0 } });
region.update({ cycle: undefined });
renderStatic({ kind: 'skeleton-block' });
const custom = defineAnimation({
  contractVersion: 1,
  id: 'example/custom',
  family: 'skeleton',
  phase: 'idle',
  options: {
    parse(value: Readonly<Partial<{ opacity: number }>>) {
      return { opacity: value.opacity ?? 0.5 };
    },
  },
  frame({ dot }, options) {
    dot({ x: 0, y: 0, size: 2, opacity: options.opacity, tone: 'base' });
  },
  still() {},
});
block.animations = { idle: custom({ opacity: 0.3 }) };
// @ts-expect-error wrong readiness value
region.state = 'error';
// @ts-expect-error wrong option name
pulse({ unknown: 1 });
// @ts-expect-error wrong option type
custom({ opacity: 'opaque' });
// @ts-expect-error wrong family
region.animations = { handoff: dissolve() };
// @ts-expect-error wrong phase
block.animations = { handoff: pulse() };
// @ts-expect-error options retain the factory-specific value type
custom({ opacity: false });
const handoff = defineAnimation({
  contractVersion: 1,
  id: 'example/prepared',
  family: 'region',
  phase: 'handoff',
  options: { parse: () => ({ distance: 4 }) },
  duration: (_surface, options) => options.distance * 100,
  prepare: () => ({ count: 1 }),
  frame(context, options) {
    const count: number = context.prepared.count;
    context.reveal({
      opacity: count,
      translateY: options.distance,
      clipStart: 0.5,
    });
    // @ts-expect-error inferred prepared state has no unrelated property
    context.prepared.missing;
    // @ts-expect-error snapshots are readonly
    context.surface.width = 20;
    // @ts-expect-error callbacks have no DOM or scheduling capability
    context.requestAnimationFrame(() => {});
  },
});
region.animations = { handoff: handoff() };
// @ts-expect-error every idle author must supply its static renderer
const missingStill: import('dotquilt/animations').IdleDefinition<
  'skeleton',
  object
> = {
  contractVersion: 1,
  id: 'example/missing',
  family: 'skeleton',
  phase: 'idle',
  options: { parse: () => ({}) },
  frame() {},
};
void missingStill;

import {
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
  type SkeletonText,
} from 'dotquilt/skeleton';
import { registerTypingDots, type TypingDots } from 'dotquilt/typing';

registerSkeletonLine();
registerSkeletonCircle();
registerSkeletonText();
registerTypingDots();
declare const paragraph: SkeletonText;
declare const typing: TypingDots;
paragraph.update({
  lines: 4,
  widths: [1, 0.7],
  motion: 'paused',
  animations: { idle: pulse() },
});
typing.update({ count: 4, speed: 1.2 });
renderStatic({ kind: 'skeleton-text', lines: 4, widths: [1, 0.7] });
renderStatic({ kind: 'typing-dots', count: 4 });
// @ts-expect-error width arrays contain numbers, not CSS strings
paragraph.widths = ['50%'];
// @ts-expect-error typing is decorative, and has no readiness state
typing.state = 'ready';
// @ts-expect-error typing has no separate pointer response
typing.pointerResponse = 'lift';

import {
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from 'dotquilt/animations/text';
import { registerTextLoader, type TextLoader } from 'dotquilt/text';

registerTextLoader();
declare const label: TextLoader;
label.update({
  state: 'pending',
  cycle: 'invoice',
  mask: '$000',
  speed: 1.2,
  pointerResponse: 'lift',
  animations: {
    idle: scramble({ changesPerSecond: 3 }),
    handoff: lock({ pop: 0.15 }),
  },
});
label.animations = { handoff: printText({ staggerMs: 20 }) };
label.animations = { idle: scrambleCharacters({ changesPerSecond: 2 }) };
label.animations = { idle: scrambleWords({ changesPerSecond: 1 }) };
// @ts-expect-error independent scramble cadence is numeric
scrambleCharacters({ changesPerSecond: 'fast' });
// @ts-expect-error word scramble has no per-element timer option
scrambleWords({ intervalMs: 500 });
renderStatic({ kind: 'text-loader', text: 0, mask: '000', state: 'pending' });
// @ts-expect-error text and skeleton binding families are distinct
label.animations = { idle: pulse() };
// @ts-expect-error text animation numbers are typed
lock({ reelMs: 'fast' });

import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from 'dotquilt/animations/chart';
import {
  type ChartInput,
  type ChartLoader,
  registerChartLoader,
  type TargetProvider,
} from 'dotquilt/chart';

const chart = document.createElement('dotquilt-chart-loader');
const chartClass: ChartLoader = chart;
registerChartLoader();
const chartProvider: TargetProvider = ({ width, height }) => ({
  kind: 'line',
  points: [
    { x: 0, y: 0 },
    { x: width, y: height },
  ],
  baseline: height,
});
chartClass.update({
  variant: 'bar',
  targetProvider: chartProvider,
  animations: {
    idle: ridge({ amplitude: 0.3 }),
    handoff: morphWipe({ edge: 20 }),
  },
});
chartClass.update({ variant: undefined, targetProvider: undefined });
const chartIdleVariants = [
  scan({ bandWidth: 50 }),
  terrain({ relief: 1 }),
  bars({ sway: 0.1 }),
  scatter({ radius: 20 }),
  cycle({ holdMs: 900 }),
];
void chartIdleVariants;
const wrongChartText: import('dotquilt').Animations<'text'> = {
  // @ts-expect-error chart family cannot be used on text
  idle: ridge(),
};
void wrongChartText;
// @ts-expect-error wrong chart phase
chart.animations = { handoff: scan() };
// @ts-expect-error invalid variant
chart.variant = 'pie';
// @ts-expect-error invalid provider cannot return a Promise
chart.targetProvider = async () => null;
// @ts-expect-error bar geometry requires rectangles and baseline
const invalidChartInput: ChartInput = { kind: 'bar', points: [] };
void invalidChartInput;
// @ts-expect-error unknown options remain rejected
ridge({ height: 20 });

definePreset({ kind: 'skeleton', speed: 0.5 });
definePreset({
  kind: 'text',
  pointerResponse: 'lift',
  timing: { duration: 500 },
});
definePreset({
  kind: 'region',
  motion: 'paused',
  timing: { easing: 'linear' },
});
definePreset({ kind: 'typing', count: 5, speed: 0.7 });
// @ts-expect-error variant remains a chart-only control
definePreset({ kind: 'skeleton', variant: 'scatter' });
// @ts-expect-error a region has no independent idle speed
definePreset({ kind: 'region', speed: 1 });
// @ts-expect-error typing has no pointer animation
definePreset({ kind: 'typing', pointerResponse: 'lift' });
// @ts-expect-error readiness cannot be supplied by a preset
definePreset({ kind: 'chart', state: 'ready' });
definePreset({
  kind: 'text',
  // @ts-expect-error style credentials cannot be supplied by a preset
  stylePolicy: { mode: 'inline', nonce: 'request' },
});

import { rows, tableShimmer, typeOn } from 'dotquilt/animations/table';
import {
  registerTableLoader,
  type TableInput,
  type TableLoader,
  type TableTargetProvider,
} from 'dotquilt/table';

registerTableLoader();
const table: TableLoader = document.createElement('dotquilt-table-loader');
const tableProvider: TableTargetProvider = () => ({ kind: 'table', cells: [] });
table.update({
  rows: 5,
  rowHeight: 32,
  columns: [{ kind: 'number', width: 2 }, { kind: 'badge' }],
  targetProvider: tableProvider,
  animations: {
    idle: typeOn({ cadenceMs: 600, cellStyle: 'badge-text' }),
    handoff: rows({ staggerMs: 35, settlePx: 4 }),
  },
});
table.preset = definePreset({
  kind: 'table',
  speed: 0.6,
  pointerResponse: 'lift',
  animations: { idle: tableShimmer() },
});
renderStatic({ kind: 'table-loader', rows: 100, columns: [{ kind: 'date' }] });
// @ts-expect-error wrong family
table.animations = { idle: ridge() };
// @ts-expect-error wrong phase
table.animations = { handoff: typeOn() };
// @ts-expect-error bounded built-in enum
typeOn({ cellStyle: 'currency' });
// @ts-expect-error unknown option
rows({ delay: 40 });
// @ts-expect-error synchronous geometry only
table.targetProvider = async () => null;
const tableInput: TableInput = { kind: 'table', cells: [] };
void tableInput;
declare const multiline: import('dotquilt/skeleton').SkeletonText;
multiline.update({ lines: undefined, widths: undefined });
multiline.lines = undefined;

import { registerAll } from 'dotquilt/register-all';
import { drift, fanReveal, rise } from './examples/api/custom.js';
import { sampleChart, tableTargets } from './examples/api/geometry.js';
import { summary } from './examples/api/native.js';
import { recipes } from './examples/api/recipes.js';

void [registerAll, summary, sampleChart, tableTargets];

import { refreshStyles } from 'dotquilt';

declare const themedPanel: HTMLElement;
refreshStyles(themedPanel);
refreshStyles(document);
// @ts-expect-error style refresh uses an actual scope, not a selector or global setting
refreshStyles('.theme');
region.update({ animations: { handoff: rise({ distance: 4 }) } });
block.animations = { idle: recipes.skeleton.idle[0] };
chartClass.animations = { idle: drift({ amplitude: 0.18, wavelength: 100 }) };
region.animations = { handoff: fanReveal({ spread: 30 }) };
// @ts-expect-error custom options retain their inferred type
rise({ distance: '4px' });
// @ts-expect-error explicit registration does not accept a tag prefix/options bag
registerAll({ prefix: 'other' });
declare const regionIdle: import('dotquilt').AnimationBinding<'region', 'idle'>;
// @ts-expect-error a region owns a handoff, never a second idle renderer
region.animations = { idle: regionIdle };
// @ts-expect-error atomic patches have the same phase boundary
region.update({ animations: { idle: regionIdle } });
// @ts-expect-error chart readiness belongs to a surrounding LoadingRegion
chartClass.update({ state: 'pending' });
// @ts-expect-error table readiness belongs to a surrounding LoadingRegion
table.update({ state: 'ready' });

// @ts-expect-error Private implementation paths are not package entry points.
import { tableRows as privateTableRows } from 'dotquilt/internal/table-static';

void privateTableRows;
