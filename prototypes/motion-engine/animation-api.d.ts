/** Declaration fragment for the approved motion contract. Planning artifact, not a published SDK. */
export type AnimationFamily = 'skeleton' | 'text' | 'chart' | 'table' | 'typing' | 'region';
export type AnimationPhase = 'idle' | 'handoff';
export type Tone = 'base' | 'accent';
export interface Point { readonly x: number; readonly y: number }
export interface Rect extends Point { readonly width: number; readonly height: number }
export interface Dot extends Point { readonly size: number; readonly opacity: number; readonly tone: Tone }
export interface GlyphCell { readonly bounds: Rect; readonly character: string }
export interface TableCell { readonly bounds: Rect; readonly text: string; readonly baseline: number; readonly tone: Tone; readonly rowId: string; readonly rowIndex: number; readonly columnIndex: number; readonly kind: 'text' | 'number' | 'badge' | 'date'; readonly glyphs: readonly GlyphCell[] }
/** Approved geometry distinction; the browser study still exercises only a line fixture. */
export type ChartInput =
  | { readonly kind: 'line'; readonly points: readonly Point[]; readonly baseline: number }
  | { readonly kind: 'bar'; readonly bars: readonly Rect[]; readonly baseline: number }
  | { readonly kind: 'scatter'; readonly points: readonly Point[] };
export interface Inputs {
  skeleton: { readonly shapes: readonly Rect[] };
  text: { readonly mask: readonly GlyphCell[]; readonly value: readonly GlyphCell[]; readonly precise: boolean };
  chart: ChartInput;
  table: { readonly cells: readonly TableCell[] };
  typing: { readonly count: number };
  region: { readonly shapes: readonly Rect[] };
}
export interface AnimationSurface<F extends AnimationFamily> {
  readonly width: number; readonly height: number;
  readonly input: Readonly<Inputs[F]>;
  /** A bounded frozen snapshot of the outgoing decoration. No raw engine buffer. */
  readonly source: readonly Dot[];
  readonly revealTargetIds: readonly string[];
}
export interface AnimationFrame {
  readonly timeMs: number; readonly deltaMs: number; readonly linearProgress: number; readonly progress: number; readonly static: boolean;
}
export interface RevealFrame { readonly opacity: number; readonly translateY?: number; readonly clipStart?: number }
export interface DrawContext<F extends AnimationFamily> {
  readonly surface: AnimationSurface<F>; readonly frame: AnimationFrame;
  dot(dot: Dot): void;
}
export interface HandoffContext<F extends AnimationFamily, Prepared = undefined> extends DrawContext<F> {
  readonly prepared: Readonly<Prepared>;
  reveal(frame: RevealFrame): void;
  revealTarget(id: string, frame: Omit<RevealFrame, 'clipStart'>): void;
}
export interface OptionIssue { readonly code: string; readonly option: string; readonly message: string }
export interface OptionSchema<O extends object> {
  /** Pure normalization. Mounted errors fall back; authoring/setup errors are diagnosed. */
  parse(value: Readonly<Partial<O>>): Readonly<O>;
}
declare const bindingBrand: unique symbol;
export interface AnimationBinding<F extends AnimationFamily, P extends AnimationPhase, O extends object = object> {
  readonly [bindingBrand]: { readonly family: F; readonly phase: P };
  readonly contractVersion: 1; readonly id: string; readonly family: F; readonly phase: P; readonly options: Readonly<O>;
}
export interface AnimationFactory<F extends AnimationFamily, P extends AnimationPhase, O extends object> {
  (options?: Readonly<Partial<O>>): AnimationBinding<F, P, O>;
}
interface DefinitionBase<F extends AnimationFamily, O extends object> {
  readonly contractVersion: 1; readonly id: string; readonly family: F; readonly options: OptionSchema<O>;
}
export interface IdleDefinition<F extends AnimationFamily, O extends object> extends DefinitionBase<F, O> {
  readonly phase: 'idle';
  frame(context: DrawContext<F>, options: Readonly<O>): undefined;
  /** Required static renderer; the engine never calls the moving callback while restricted. */
  still(context: DrawContext<F>, options: Readonly<O>): undefined;
}
export interface HandoffDefinition<F extends AnimationFamily, O extends object, Prepared> extends DefinitionBase<F, O> {
  readonly phase: 'handoff';
  duration(surface: AnimationSurface<F>, options: Readonly<O>): number;
  prepare(surface: AnimationSurface<F>, options: Readonly<O>): Prepared;
  frame(context: HandoffContext<F, Prepared>, options: Readonly<O>): undefined;
}
export declare function defineAnimation<F extends AnimationFamily, O extends object>(definition: IdleDefinition<F, O>): AnimationFactory<F, 'idle', O>;
export declare function defineAnimation<F extends AnimationFamily, O extends object, Prepared>(definition: HandoffDefinition<F, O, Prepared>): AnimationFactory<F, 'handoff', O>;
export interface Animations<F extends AnimationFamily> {
  readonly idle?: AnimationBinding<F, 'idle'>;
  readonly handoff?: AnimationBinding<F, 'handoff'>;
}
/** Caller supplies actual elements; definitions see only IDs and supplied geometry. */
export interface RevealTarget { readonly id: string; readonly element: HTMLElement }
export interface AnimationProps<F extends AnimationFamily> {
  readonly animations?: Animations<F>;
  readonly revealTargets?: readonly RevealTarget[];
  /** Omit duration to use the definition recommendation; 0 settles immediately. */
  readonly timing?: { readonly duration?: number; readonly easing?: string };
  readonly motion?: 'system' | 'paused';
  readonly pointerResponse?: 'none' | 'lift';
}
export interface RidgeOptions { amplitude: number; highlightWidth: number }
export interface MorphWipeOptions { morphEnd: number; wipeStart: number; edge: number }
export interface ScrambleOptions { changesPerSecond: number }
export interface LockOptions { staggerMs: number; reelMs: number; settleMs: number; pop: number }
export interface TypeOnOptions { cadenceMs: number; cellStyle: 'auto' | 'text' | 'number' | 'badge' | 'date' | 'badge-text' | 'text-badge' }
export interface RowsOptions { staggerMs: number; settlePx: number }
export declare const ridge: AnimationFactory<'chart', 'idle', RidgeOptions>;
export declare const morphWipe: AnimationFactory<'chart', 'handoff', MorphWipeOptions>;
export declare const scramble: AnimationFactory<'text', 'idle', ScrambleOptions>;
export declare const lock: AnimationFactory<'text', 'handoff', LockOptions>;
export declare const typeOn: AnimationFactory<'table', 'idle', TypeOnOptions>;
export declare const rows: AnimationFactory<'table', 'handoff', RowsOptions>;

export interface ScanOptions { amplitude: number; bandWidth: number; trail: number }
export interface TerrainOptions { amplitude: number; relief: number }
export interface BarsOptions { sway: number }
export interface ScatterOptions { radius: number; spread: number; sway: number }
export interface CycleOptions { holdMs: number; blendMs: number }
export declare const scan: AnimationFactory<'chart', 'idle', ScanOptions>;
export declare const terrain: AnimationFactory<'chart', 'idle', TerrainOptions>;
export declare const bars: AnimationFactory<'chart', 'idle', BarsOptions>;
export declare const scatter: AnimationFactory<'chart', 'idle', ScatterOptions>;
export declare const cycle: AnimationFactory<'chart', 'idle', CycleOptions>;
export interface LabelPulseOptions { travelPxPerSecond: number }
export declare const labelPulse: AnimationFactory<'text', 'idle', LabelPulseOptions>;
export declare const printText: AnimationFactory<'text', 'handoff', LockOptions>;
export declare const tableShimmer: AnimationFactory<'table', 'idle', TypeOnOptions>;

export interface DotquiltAnimationElement<F extends AnimationFamily> extends HTMLElement {
  animations?: Animations<F>;
  revealTargets?: readonly RevealTarget[];
  timing?: AnimationProps<F>['timing'];
  motion?: AnimationProps<F>['motion'];
  pointerResponse?: AnimationProps<F>['pointerResponse'];
  update(patch: Partial<AnimationProps<F>>): void;
}
