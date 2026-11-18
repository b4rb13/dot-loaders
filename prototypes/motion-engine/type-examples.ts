import { defineAnimation, ridge, morphWipe, scramble, lock, rows, typeOn, type AnimationProps, type Animations } from './animation-api.js';
const chart = { animations: { idle: ridge({ amplitude: .24 }), handoff: morphWipe({ wipeStart: .30 }) } } satisfies AnimationProps<'chart'>;
const text = { idle: scramble({ changesPerSecond: 2.8 }), handoff: lock({ pop: .2 }) } satisfies Animations<'text'>;
const table = { idle: typeOn({ cadenceMs: 600 }), handoff: rows({ settlePx: 4 }) } satisfies Animations<'table'>;
interface DriftOptions { amplitude: number; wavelength: number }
const drift = defineAnimation({
  contractVersion: 1, id: 'example/drift', family: 'chart', phase: 'idle',
  options: { parse(value: Readonly<Partial<DriftOptions>>): Readonly<DriftOptions> {
    return { amplitude: Math.min(.4, Math.max(0, value.amplitude ?? .18)), wavelength: Math.max(16, value.wavelength ?? 80) };
  } },
  frame({ surface, frame, dot }, options) {
    for(let x = 0; x < surface.width; x += 8) dot({x, y:surface.height * (.5 + options.amplitude * Math.sin(x/options.wavelength + frame.timeMs/800)), size:2, opacity:.7, tone:'accent'});
  },
  still({surface, dot}) { dot({x:surface.width/2,y:surface.height/2,size:2,opacity:.7,tone:'base'}); }
});
const custom = { idle: drift({ wavelength: 120 }) } satisfies Animations<'chart'>;
// Native element.animations = chart.animations; React <ChartLoader animations={chart.animations}/>.
// @ts-expect-error chart animation cannot be passed to text
const wrongFamily: Animations<'text'> = { idle: ridge() };
// @ts-expect-error idle and handoff bindings are separate
const wrongPhase: Animations<'chart'> = { handoff: ridge() };
// @ts-expect-error option values retain their types
ridge({ amplitude: 'big' });
// @ts-expect-error misspelled extra options are rejected
rows({ stagger: 35 });
// @ts-expect-error a custom chart animation cannot be passed to table
const wrongCustom: Animations<'table'> = { idle: drift() };
void [chart,text,table,custom,wrongFamily,wrongPhase,wrongCustom];

import type { DotquiltAnimationElement } from './animation-api.js';
declare const nativeChart: DotquiltAnimationElement<'chart'>;
nativeChart.animations = chart.animations;
nativeChart.update({ animations: custom, pointerResponse: 'lift' });
const customHandoff = defineAnimation({
 contractVersion: 1, id: 'example/fade', family: 'chart', phase: 'handoff',
 options: { parse(_value: Readonly<Partial<{ edge: number }>>) { return { edge: 4 }; } },
 duration: () => 300,
 prepare(surface) { return { width: surface.width }; },
 frame({ prepared, frame, reveal }, options) {
   const width: number = prepared.width;
   reveal({ opacity: frame.progress, translateY: options.edge * (1 - frame.progress) });
   void width;
 }
});
nativeChart.animations = { idle: drift(), handoff: customHandoff({ edge: 3 }) };
// @ts-expect-error enum options are not untyped strings
typeOn({ cellStyle: 'mystery' });

import type { ChartInput } from './animation-api.js';
const lineInput = { kind: 'line', points: [{ x: 0, y: 10 }], baseline: 20 } satisfies ChartInput;
const barInput = { kind: 'bar', bars: [{ x: 0, y: 5, width: 8, height: 15 }], baseline: 20 } satisfies ChartInput;
const scatterInput = { kind: 'scatter', points: [{ x: 3, y: 4 }] } satisfies ChartInput;
// @ts-expect-error line handoffs need an explicit baseline
const missingLineBaseline: ChartInput = { kind: 'line', points: [] };
// @ts-expect-error bars require rectangle geometry, not point geometry
const pointBars: ChartInput = { kind: 'bar', bars: [{ x: 0, y: 5 }], baseline: 20 };
// @ts-expect-error final chart types are explicit
const unknownChart: ChartInput = { kind: 'pie', points: [] };
void [lineInput, barInput, scatterInput, missingLineBaseline, pointBars, unknownChart];
