import { createHandoff } from './internal/handoff.js';
import type { HandoffPaint, IdlePaint } from './internal/paint.js';
import { createReveal } from './internal/reveal.js';
import { createRunner } from './internal/runner.js';
import { surface } from './internal/surface.js';
import { createTargets } from './internal/targets.js';
import { LoaderConfigurationError } from './types.js';
export type AnimationFamily =
  | 'skeleton'
  | 'region'
  | 'text'
  | 'chart'
  | 'table';
export type AnimationPhase = 'idle' | 'handoff';
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface Dot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly opacity: number;
  readonly tone: 'base' | 'accent';
}
export interface AnimationSurface<F extends AnimationFamily> {
  readonly width: number;
  readonly height: number;
  readonly input: F extends 'chart'
    ? import('./chart.js').ChartInput
    : F extends 'table'
      ? import('./table.js').TableInput
      : Readonly<{ shapes: readonly Rect[] }> &
          (F extends 'text'
            ? Readonly<{
                mask: readonly GlyphCell[];
                value: readonly GlyphCell[];
                precise: boolean;
              }>
            : object);
  readonly source: readonly Dot[];
  readonly revealTargetIds: readonly string[];
  readonly family: F;
}
export interface GlyphCell {
  readonly character: string;
  readonly bounds: Rect;
}
export interface AnimationFrame {
  readonly timeMs: number;
  readonly deltaMs: number;
  readonly linearProgress: number;
  readonly progress: number;
  readonly static: boolean;
}
export interface RevealFrame {
  readonly opacity: number;
  readonly translateY?: number;
  readonly clipStart?: number;
}
export interface DrawContext<F extends AnimationFamily> {
  readonly surface: AnimationSurface<F>;
  readonly frame: AnimationFrame;
  dot(value: Dot): void;
}
export interface HandoffContext<F extends AnimationFamily, P = undefined>
  extends DrawContext<F> {
  readonly prepared: Readonly<P>;
  reveal(value: RevealFrame): void;
  revealTarget(id: string, value: Omit<RevealFrame, 'clipStart'>): void;
}
interface Base<F extends AnimationFamily, O extends object> {
  readonly contractVersion: 1;
  readonly id: string;
  readonly family: F;
  readonly options: { parse(value: Readonly<Partial<O>>): Readonly<O> };
}
export interface IdleDefinition<F extends AnimationFamily, O extends object>
  extends Base<F, O> {
  readonly phase: 'idle';
  frame(context: DrawContext<F>, options: Readonly<O>): undefined;
  still(context: DrawContext<F>, options: Readonly<O>): undefined;
}
export interface HandoffDefinition<
  F extends AnimationFamily,
  O extends object,
  P,
> extends Base<F, O> {
  readonly phase: 'handoff';
  duration(surface: AnimationSurface<F>, options: Readonly<O>): number;
  prepare(surface: AnimationSurface<F>, options: Readonly<O>): P;
  frame(context: HandoffContext<F, P>, options: Readonly<O>): undefined;
}

import { brand } from './internal/binding.js';
export interface AnimationBinding<
  F extends AnimationFamily,
  P extends AnimationPhase,
  O extends object = object,
> {
  readonly [brand]: { readonly family: F; readonly phase: P };
  readonly contractVersion: 1;
  readonly id: string;
  readonly family: F;
  readonly phase: P;
  readonly options: Readonly<O>;
}
export type AnimationFactory<
  F extends AnimationFamily,
  P extends AnimationPhase,
  O extends object,
> = (options?: Readonly<Partial<O>>) => AnimationBinding<F, P, O>;
export interface Animations<F extends AnimationFamily> {
  readonly idle?: AnimationBinding<F, 'idle'>;
  readonly handoff?: AnimationBinding<F, 'handoff'>;
}
export interface RevealTarget {
  readonly id: string;
  readonly element: HTMLElement;
}
type Definition =
  | IdleDefinition<AnimationFamily, object>
  | HandoffDefinition<AnimationFamily, object, unknown>;
function copy(
  value: unknown,
  depth = 0,
  budget = { remaining: 4096 },
): unknown {
  if (--budget.remaining < 0)
    throw new LoaderConfigurationError(
      'options-limit',
      'Options exceed 4096 values',
    );
  if (depth > 8)
    throw new LoaderConfigurationError(
      'options-depth',
      'Options exceed eight levels',
    );
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === undefined
  )
    return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || Object.keys(value).length > 256)
    throw new LoaderConfigurationError(
      'invalid-options',
      'Options must be bounded plain data',
    );
  if (Array.isArray(value))
    return Object.freeze(value.map((v) => copy(v, depth + 1, budget)));
  if (Object.getPrototypeOf(value) !== Object.prototype)
    throw new LoaderConfigurationError(
      'invalid-options',
      'Options must be plain data',
    );
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, copy(v, depth + 1, budget)]),
    ),
  );
}
export function defineAnimation<F extends AnimationFamily, O extends object>(
  definition: IdleDefinition<F, O>,
): AnimationFactory<F, 'idle', O>;
export function defineAnimation<F extends AnimationFamily, O extends object, P>(
  definition: HandoffDefinition<F, O, P>,
): AnimationFactory<F, 'handoff', O>;
export function defineAnimation(
  definition: Definition,
): AnimationFactory<AnimationFamily, AnimationPhase, object> {
  if (
    definition?.contractVersion !== 1 ||
    !/^[\w.-]+\/[\w./-]+$/.test(definition.id) ||
    !['skeleton', 'region', 'text', 'chart', 'table'].includes(
      definition.family,
    ) ||
    typeof definition.options?.parse !== 'function' ||
    typeof definition.frame !== 'function' ||
    (definition.phase === 'idle'
      ? typeof definition.still !== 'function'
      : definition.phase !== 'handoff' ||
        typeof definition.prepare !== 'function' ||
        typeof definition.duration !== 'function')
  )
    throw new LoaderConfigurationError(
      'invalid-definition',
      'Invalid version-1 animation definition',
    );
  const draw: IdlePaint | HandoffPaint =
    definition.phase === 'idle'
      ? (((surface, options, timeMs, still, dot, deltaMs) => {
          const context = Object.freeze({
            surface,
            frame: Object.freeze({
              timeMs,
              deltaMs,
              linearProgress: 0,
              progress: 0,
              static: still,
            }),
            dot,
          });
          (still
            ? (captured as IdleDefinition<AnimationFamily, object>).still
            : captured.frame)(context, options);
        }) satisfies IdlePaint)
      : (
          surface,
          options,
          prepared,
          linearProgress,
          progress,
          duration,
          deltaMs,
          dot,
          reveal,
          revealTarget,
        ) => {
          let active = true;
          try {
            (
              captured as HandoffDefinition<AnimationFamily, object, unknown>
            ).frame(
              Object.freeze({
                surface,
                prepared: prepared as Readonly<unknown>,
                frame: Object.freeze({
                  timeMs: duration * linearProgress,
                  deltaMs,
                  linearProgress,
                  progress,
                  static: false,
                }),
                dot,
                reveal: (frame: RevealFrame) => {
                  if (active) reveal(frame);
                },
                revealTarget: (id: string, frame: RevealFrame) => {
                  if (active) revealTarget(id, frame);
                },
              }),
              options,
            );
          } finally {
            active = false;
          }
        };
  const captured: Definition & { draw: IdlePaint | HandoffPaint } =
    Object.freeze({
      ...definition,
      draw,
      snapshot: surface,
      handoff: createHandoff,
      targets: createTargets,
      reveal: createReveal,
      runner: createRunner,
      options: Object.freeze({ ...definition.options }),
    });
  return (options = {}) =>
    Object.freeze({
      contractVersion: 1 as const,
      id: captured.id,
      family: captured.family,
      phase: captured.phase,
      options: copy(captured.options.parse(copy(options) as object)) as object,
      [brand]: captured,
    });
}

export type { Preset, PresetKind } from './internal/preset.js';

import {
  capturePreset,
  type Preset,
  type PresetKind,
} from './internal/preset.js';
export function definePreset<K extends PresetKind>(
  value: Preset<K>,
): Readonly<Preset<K>> {
  return capturePreset(value);
}
