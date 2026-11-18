import type {
  AnimationFamily,
  AnimationSurface,
  Dot,
  RevealFrame,
} from '../animations.js';

// Engine-private execution ports. Only the authoring adapter constructs the
// public frozen contexts; first-party recipes receive trusted bounded commands.

/** One idle frame: draw the placeholder's dots at `timeMs`. */
export interface IdleFrame<
  F extends AnimationFamily = AnimationFamily,
  O extends object = object,
> {
  readonly surface: AnimationSurface<F>;
  readonly options: Readonly<O>;
  /** Speed-scaled time since the idle motion started. */
  readonly timeMs: number;
  readonly deltaMs: number;
  /** Draw a still frame (motion paused, reduced or restricted). */
  readonly still: boolean;
  readonly dot: (value: Dot) => void;
}
export type IdlePaint = (frame: IdleFrame) => void;

/** One handoff frame: draw outgoing dots and reveal the content. */
export interface HandoffFrame<
  F extends AnimationFamily = AnimationFamily,
  O extends object = object,
  P = unknown,
> {
  readonly surface: AnimationSurface<F>;
  readonly options: Readonly<O>;
  /** What the definition's `prepare` returned for this handoff. */
  readonly prepared: P;
  readonly linear: number;
  /** `linear` after the handoff's easing. */
  readonly progress: number;
  readonly duration: number;
  readonly deltaMs: number;
  readonly dot: (value: Dot) => void;
  readonly reveal: (frame: RevealFrame) => void;
  readonly revealTarget: (id: string, frame: RevealFrame) => void;
}
export type HandoffPaint = (frame: HandoffFrame) => void;
