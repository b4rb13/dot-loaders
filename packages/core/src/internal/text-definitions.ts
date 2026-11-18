import type { AnimationSurface, Dot, RevealFrame } from '../animations.js';
import type {
  LabelPulseOptions,
  ScrambleOptions,
  TextHandoffOptions,
} from '../text-animations.js';
import { brand } from './binding.js';
import { clamp } from './math.js';
import { glyph } from './text-glyphs.js';
import { createTextHandoff, createTextRunner } from './text-playback.js';

export interface TextDraw {
  readonly surface: AnimationSurface<'text'>;
  readonly timeMs: number;
  dot(value: Dot): void;
}
export interface TextReveal<P = unknown> extends TextDraw {
  readonly progress: number;
  readonly prepared: Readonly<P>;
  reveal(frame: RevealFrame): void;
}
function definition<P extends 'idle' | 'handoff', I extends object>(
  name: string,
  phase: P,
  implementation: I,
) {
  return Object.freeze({
    family: 'text' as const,
    phase,
    id: `dotquilt/${name}`,
    runner: createTextRunner,
    handoff: createTextHandoff,
    ...implementation,
  });
}
export function textBinding<P extends 'idle' | 'handoff', O extends object>(
  definition: { family: 'text'; phase: P; id: string },
  options: O,
): import('../animations.js').AnimationBinding<'text', P, O> {
  return Object.freeze({
    contractVersion: 1,
    family: 'text',
    phase: definition.phase,
    id: definition.id,
    options: Object.freeze(options),
    [brand]: definition,
  }) as unknown as import('../animations.js').AnimationBinding<'text', P, O>;
}
export const noise = (seed: number) =>
  Math.abs(Math.sin(seed * 127.1) * 43758.5453) % 1;
export const randomCharacter = (character: string, seed: number) => {
  const pool = /[0-9]/.test(character)
    ? '0123456789'
    : /[a-z]/i.test(character)
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      : character;
  return pool[Math.floor(noise(seed) * pool.length)] ?? character;
};
function still(context: TextDraw): undefined {
  if (context.surface.input.precise)
    for (const cell of context.surface.input.mask)
      glyph(cell, cell.character, context.dot, 0.4);
}
export const scrambleDefinition = /* @__PURE__ */ Object.freeze({
  family: 'text' as const,
  phase: 'idle' as const,
  id: 'dotquilt/scramble',
  runner: createTextRunner,
  still,
  /**
   * design/SPEC.md: each character changes every ~280 ms (with a small
   * per-character offset, so they don't flip together) and cross-fades to
   * the next over 260 ms. A teal glow drifts across every 2.8 s.
   */
  frame(context: TextDraw, options: ScrambleOptions): undefined {
    const { surface } = context;
    if (!surface.input.precise) return;
    const time = context.timeMs,
      period = 1000 / options.changesPerSecond,
      glowAt = -0.5 + 2 * sineInOut((time / 2800) % 1),
      width = Math.max(1, surface.width);
    surface.input.mask.forEach((cell, i) => {
      const own = period * (0.75 + ((i * 7) % 5) / 10),
        step = Math.floor(time / own),
        k = sineInOut(clamp((time - step * own) / 260));
      // Merge the outgoing and incoming glyphs pixel by pixel.
      const pixels = new Map<string, Dot>();
      const add = (dot: Dot, weight: number) => {
        const key = `${dot.x},${dot.y}`,
          prior = pixels.get(key);
        pixels.set(key, {
          ...dot,
          opacity: (prior?.opacity ?? 0) + dot.opacity * weight,
        });
      };
      glyph(
        cell,
        randomCharacter(cell.character, (step - 1) * 83 + i + 1),
        (dot) => add(dot, 1 - k),
        1,
        0,
        1,
        true,
      );
      glyph(
        cell,
        randomCharacter(cell.character, step * 83 + i + 1),
        (dot) => add(dot, k),
        1,
        0,
        1,
        true,
      );
      for (const dot of pixels.values()) {
        context.dot(dot);
        const d = ((dot.x / width) * 0.8 + 0.1 - glowAt) / 0.2,
          glow = d < -3.2 || d > 3.2 ? 0 : Math.exp(-d * d);
        if (glow * dot.opacity >= 0.02)
          context.dot({
            ...dot,
            opacity: glow * dot.opacity,
            tone: 'accent',
          });
      }
    });
  },
});
export const labelPulseDefinition = /* @__PURE__ */ definition(
  'label-pulse',
  'idle',
  {
    still,
    frame(context: TextDraw, options: LabelPulseOptions): undefined {
      if (!context.surface.input.precise) return;
      const band =
        (((context.timeMs * options.travelPxPerSecond) / 1000) %
          (context.surface.width + 80)) -
        40;
      for (const cell of context.surface.input.mask)
        glyph(cell, cell.character, (dot) => {
          const light = Math.max(0, 1 - Math.abs(dot.x - band) / 32);
          context.dot({
            ...dot,
            opacity: dot.opacity * (0.25 + light * 0.75),
            tone: light > 0.3 ? 'accent' : 'base',
          });
        });
    },
  },
);
function span(surface: AnimationSurface<'text'>, options: TextHandoffOptions) {
  // Characters lock left to right across at most 460 ms (the spec's 42%).
  return Math.min(
    460,
    Math.max(0, surface.input.value.length - 1) * options.staggerMs,
  );
}
function length(
  surface: AnimationSurface<'text'>,
  options: TextHandoffOptions,
) {
  return span(surface, options) + options.reelMs + options.settleMs + 100;
}
export const lockDefinition = /* @__PURE__ */ Object.freeze({
  family: 'text' as const,
  phase: 'handoff' as const,
  id: 'dotquilt/lock',
  handoff: createTextHandoff,
  duration(surface: AnimationSurface<'text'>, options: TextHandoffOptions) {
    return surface.input.precise ? length(surface, options) : 150;
  },
  prepare(surface: AnimationSurface<'text'>, options: TextHandoffOptions) {
    return {
      span: span(surface, options),
      length: length(surface, options),
    };
  },
  frame(
    context: TextReveal<{ span: number; length: number }>,
    options: TextHandoffOptions,
  ): undefined {
    const { surface, progress: p, prepared } = context;
    if (!surface.input.precise) {
      context.reveal({ opacity: p });
      return;
    }
    // Recipe time is normalized to the captured total, including explicit duration overrides.
    const time = p * prepared.length;
    for (const dot of surface.source)
      context.dot({
        ...dot,
        opacity: dot.opacity * (1 - clamp(time / 100)),
      });
    surface.input.value.forEach((cell, i) => {
      const delay =
        surface.input.value.length > 1
          ? (prepared.span * i) / (surface.input.value.length - 1)
          : 0;
      const local = time - delay;
      if (local < 0) return;
      const settle = clamp((local - options.reelMs) / options.settleMs);
      const alpha = clamp((prepared.length - time) / 100);
      const lift = -Math.sin(settle * Math.PI) * 2 * options.pop * 5,
        size = 1 + Math.sin(settle * Math.PI) * options.pop;
      if (local < options.reelMs) {
        glyph(
          cell,
          randomCharacter(cell.character, Math.floor(local / 18) + i * 7),
          context.dot,
          alpha,
        );
        return;
      }
      // Lock: the last reel character eases into the real one (sine).
      const k = sineInOut(settle);
      if (k < 1)
        glyph(
          cell,
          randomCharacter(
            cell.character,
            Math.floor(options.reelMs / 18) + i * 7,
          ),
          context.dot,
          alpha * (1 - k),
          lift,
          size,
        );
      glyph(cell, cell.character, context.dot, alpha * k, lift, size);
    });
    // The real text fades in while the last characters lock, from when the
    // last one starts locking to the end, so glyphs and text overlap.
    const from = prepared.span + options.reelMs;
    context.reveal({
      opacity: clamp((time - from) / Math.max(1, prepared.length - from)),
      translateY: 2 * (1 - p),
    });
  },
});
export const fadeDefinition = /* @__PURE__ */ definition(
  'text-fade',
  'handoff',
  {
    duration(
      _surface: AnimationSurface<'text'>,
      options: { duration: number },
    ) {
      return options.duration;
    },
    prepare() {
      return undefined;
    },
    frame(context: TextReveal<undefined>): undefined {
      const p = context.progress;
      for (const dot of context.surface.source)
        context.dot({ ...dot, opacity: dot.opacity * (1 - p) });
      context.reveal({ opacity: p });
    },
  },
);
export const defaultTextIdle = /* @__PURE__ */ Object.freeze({
  contractVersion: 1 as const,
  family: 'text' as const,
  phase: 'idle' as const,
  id: 'dotquilt/scramble',
  options: /* @__PURE__ */ Object.freeze({ changesPerSecond: 1000 / 280 }),
  [brand]: scrambleDefinition,
});
export const defaultTextHandoff = /* @__PURE__ */ Object.freeze({
  contractVersion: 1 as const,
  family: 'text' as const,
  phase: 'handoff' as const,
  id: 'dotquilt/lock',
  options: /* @__PURE__ */ Object.freeze({
    staggerMs: 40,
    reelMs: 55,
    settleMs: 300,
    pop: 0,
  }),
  [brand]: lockDefinition,
});

/** Sine in-out, the curve the spec gives marks and text locks. */
function sineInOut(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * p);
}
