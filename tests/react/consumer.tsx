import {
  type DotquiltStyle,
  type HandoffDetail,
  LoadingRegion,
  SkeletonBlock,
} from '@dotquilt/react';
import { LoadingRegion as FamilyRegion } from '@dotquilt/react/region';
import { reactRegionStyles, reactSkeletonStyles } from '@dotquilt/react/server';
import { SkeletonBlock as FamilySkeleton } from '@dotquilt/react/skeleton';
import type {
  LoadingRegion as NativeRegion,
  SkeletonBlock as NativeSkeleton,
} from 'dotquilt';
import { createRef } from 'react';

const region = createRef<NativeRegion>();
const skeleton = createRef<NativeSkeleton>();
const style: DotquiltStyle = {
  '--dotquilt-color': '#123456',
  '--dotquilt-dot-gap': '4px',
  // The region's refresh cue: how far above the top edge its row of marks sits.
  '--dotquilt-refresh-gap': '10px',
  borderRadius: 4,
};
const example = (
  <LoadingRegion
    ref={region}
    state="pending"
    cycle="request"
    style={style}
    placeholder={<SkeletonBlock ref={skeleton} motion="paused" />}
    onHandoffEnd={(event) => {
      const detail: HandoffDetail = event.detail;
      console.log(detail.handoffId);
    }}
  >
    Application content
  </LoadingRegion>
);
const family = (
  <FamilyRegion>
    <FamilySkeleton />
  </FamilyRegion>
);
// @ts-expect-error readiness is application-owned and has exactly three states
const invalid = <LoadingRegion state="success" />;
// @ts-expect-error a library primitive does not own application content
const invalidChild = <SkeletonBlock>Content</SkeletonBlock>;
// @ts-expect-error typed CSS variables do not accept arbitrary objects
const invalidStyle: DotquiltStyle = { '--dotquilt-color': {} };
void [
  example,
  family,
  invalid,
  invalidChild,
  invalidStyle,
  reactRegionStyles,
  reactSkeletonStyles,
];

// Animation bindings and explicit DOM targets use the same native public types.
import { defineAnimation, definePreset } from 'dotquilt/animations';
import { dissolve, pulse } from 'dotquilt/animations/skeleton';

declare const target: HTMLDivElement;
const handoff = defineAnimation({
  contractVersion: 1,
  id: 'example/react/types',
  family: 'region',
  phase: 'handoff',
  options: { parse: () => ({ duration: 200 }) },
  duration: (_surface, options) => options.duration,
  prepare: () => ({ opacity: 1 }),
  frame({ prepared, reveal }) {
    reveal({ opacity: prepared.opacity });
  },
});
const preset = definePreset({
  kind: 'skeleton',
  animations: { idle: pulse() },
});
const customized = (
  <LoadingRegion
    timing={{ duration: 0 }}
    animations={{ handoff: handoff() }}
    revealTargets={[{ id: 'row', element: target }]}
    stylePolicy={{ mode: 'inline', nonce: 'request' }}
  >
    <SkeletonBlock
      preset={preset}
      animations={{ handoff: dissolve() }}
      pointerResponse="lift"
      speed={2}
    />
  </LoadingRegion>
);
// @ts-expect-error a skeleton handoff cannot be installed as a region definition
const wrongFamily = <LoadingRegion animations={{ handoff: dissolve() }} />;
// @ts-expect-error idle bindings cannot be passed to the handoff phase
const wrongPhase = <SkeletonBlock animations={{ handoff: pulse() }} />;
const wrongTarget = (
  <LoadingRegion
    revealTargets={[
      // @ts-expect-error reveal targets require actual DOM elements
      { id: 'row', element: 'row' },
    ]}
  />
);
void [customized, wrongFamily, wrongPhase, wrongTarget];

import {
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from '@dotquilt/react/skeleton';
import { TypingDots } from '@dotquilt/react/typing';
import type {
  SkeletonText as NativeSkeletonText,
  TypingDots as NativeTypingDots,
} from 'dotquilt';

const paragraphRef = createRef<NativeSkeletonText>();
const typingRef = createRef<NativeTypingDots>();
const catalog = (
  <>
    <SkeletonLine pointerResponse="lift" />
    <SkeletonCircle motion="paused" />
    <SkeletonText ref={paragraphRef} lines={4} widths={[0.8, 0.5]} />
    <TypingDots ref={typingRef} count={4} speed={1.5} />
  </>
);
// @ts-expect-error line has no multiline structure controls
const wrongLine = <SkeletonLine lines={4} />;
// @ts-expect-error typing has no separate hover effect
const wrongTyping = <TypingDots pointerResponse="lift" />;
// @ts-expect-error multiline widths use fractions
const wrongWidths = <SkeletonText widths={['50%']} />;
void [catalog, wrongLine, wrongTyping, wrongWidths];

import { TextLoader } from '@dotquilt/react/text';
import { lock, scramble } from 'dotquilt/animations/text';
import type { TextLoader as NativeTextLoader } from 'dotquilt/text';

const inlineRef = createRef<NativeTextLoader>();
const inline = (
  <TextLoader
    ref={inlineRef}
    state="pending"
    mask="000"
    animations={{
      idle: scramble({ changesPerSecond: 3 }),
      handoff: lock({ pop: 0.1 }),
    }}
    onHandoffEnd={(event) => {
      const detail: HandoffDetail = event.detail;
      void detail;
    }}
  >
    {0}
  </TextLoader>
);
const richInline: import('@dotquilt/react/text').TextLoaderProps = {
  // @ts-expect-error TextLoader children are plain text; rich composition uses LoadingRegion
  children: <button type="button">Action</button>,
};
// @ts-expect-error text handoff options are numbers
lock({ reelMs: 'fast' });
void [inline, richInline];

import { ChartLoader as ChartComponent } from '@dotquilt/react/chart';
import {
  ridge as chartRidge,
  morphWipe as chartWipe,
} from 'dotquilt/animations/chart';
import type { ChartLoader as NativeChart } from 'dotquilt/chart';

const chartRef = createRef<NativeChart>();
const chartExample = (
  <ChartComponent
    ref={chartRef}
    variant="scatter"
    targetProvider={({ width, height }) => ({
      kind: 'scatter',
      points: [{ x: width / 2, y: height / 2 }],
    })}
    animations={{ idle: chartRidge(), handoff: chartWipe() }}
  />
);
void chartExample;
// @ts-expect-error decorative chart does not own real chart children
const chartChildren = <ChartComponent>app chart</ChartComponent>;
void chartChildren;
// @ts-expect-error invalid variant
const chartWrongVariant = <ChartComponent variant="pie" />;
void chartWrongVariant;

import { TableLoader as Table } from '@dotquilt/react/table';
import { rows as tableRows, typeOn } from 'dotquilt/animations/table';

const tableExample = (
  <Table
    rows={5}
    rowHeight={32}
    columns={[{ kind: 'number', width: 2 }, { kind: 'badge' }]}
    targetProvider={() => ({ kind: 'table', cells: [] })}
    animations={{
      idle: typeOn({ cellStyle: 'text-badge' }),
      handoff: tableRows({ settlePx: 4 }),
    }}
  />
);
void tableExample;
const invalidTable = (
  // @ts-expect-error decorative table does not own application children
  <Table>
    <table />
  </Table>
);
void invalidTable;
// @ts-expect-error number data columns are typed geometry, not data keys
const invalidColumns = <Table columns={[{ kind: 'currency' }]} />;
void invalidColumns;

import { Summary } from '../../examples/api/react';

const summaryExample = (
  <Summary state="ready" cycle="outcome" immediate>
    {0}
  </Summary>
);
void summaryExample;
declare const regionIdle: import('dotquilt').AnimationBinding<'region', 'idle'>;
// @ts-expect-error region idle is not a supported component prop
const invalidRegionIdle = <LoadingRegion animations={{ idle: regionIdle }} />;
void invalidRegionIdle;
// @ts-expect-error charts are decorative; state goes on LoadingRegion
const invalidChartState = <ChartComponent state="pending" />;
// @ts-expect-error tables have no application readiness cycle
const invalidTableCycle = <Table cycle="request" />;
void [invalidChartState, invalidTableCycle];
