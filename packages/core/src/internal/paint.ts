import type {
  AnimationFamily,
  AnimationSurface,
  Dot,
  RevealFrame,
} from '../animations.js';

// Engine-private execution ports. Only the authoring adapter constructs the
// public frozen contexts; first-party recipes receive trusted bounded commands.
export type IdlePaint = (
  surface: AnimationSurface<AnimationFamily>,
  options: object,
  timeMs: number,
  still: boolean,
  dot: (value: Dot) => void,
  deltaMs: number,
) => void;
export type HandoffPaint = (
  surface: AnimationSurface<AnimationFamily>,
  options: object,
  prepared: unknown,
  linear: number,
  progress: number,
  duration: number,
  deltaMs: number,
  dot: (value: Dot) => void,
  reveal: (frame: RevealFrame) => void,
  revealTarget: (id: string, frame: RevealFrame) => void,
) => void;
