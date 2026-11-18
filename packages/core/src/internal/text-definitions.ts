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
  frame(context: TextDraw, options: ScrambleOptions): undefined {
    if (!context.surface.input.precise) return;
    const tick = Math.floor((context.timeMs * options.changesPerSecond) / 1000);
    context.surface.input.mask.forEach((cell, i) => {
      glyph(
        cell,
        randomCharacter(cell.character, tick * 83 + i + 1),
        context.dot,
        0.65,
        0,
        1,
        true,
      );
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
  return Math.min(
    220,
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
      const character =
        local < options.reelMs
          ? randomCharacter(cell.character, Math.floor(local / 18) + i * 7)
          : cell.character;
      glyph(
        cell,
        character,
        context.dot,
        alpha,
        -Math.sin(settle * Math.PI) * 2,
        1 + Math.sin(settle * Math.PI) * options.pop,
      );
    });
    context.reveal({
      opacity: clamp((time - prepared.length + 140) / 140),
      translateY: 2 * (1 - p),
    });
  },
});
function printHandoff() {
  return definition('print-text', 'handoff', {
    prepare: lockDefinition.prepare,
    duration(surface: AnimationSurface<'text'>, options: TextHandoffOptions) {
      return surface.input.precise ? 180 + length(surface, options) / 1.5 : 150;
    },
    frame(
      context: TextReveal<{ span: number; length: number }>,
      options: TextHandoffOptions,
    ): undefined {
      if (!context.surface.input.precise)
        return lockDefinition.frame(context, options);
      const p = context.progress;
      const time = (p * (180 + context.prepared.length / 1.5) - 180) * 1.5;
      lockDefinition.frame(
        {
          ...context,
          progress: time / context.prepared.length,
          reveal(frame) {
            context.reveal({
              ...frame,
              translateY: 2 * (1 - p),
              clipStart: clamp(time / context.prepared.length),
            });
          },
        },
        options,
      );
    },
  });
}
export const printDefinition = /* @__PURE__ */ printHandoff();
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
  options: /* @__PURE__ */ Object.freeze({ changesPerSecond: 2.8 }),
  [brand]: scrambleDefinition,
});
export const defaultTextHandoff = /* @__PURE__ */ Object.freeze({
  contractVersion: 1 as const,
  family: 'text' as const,
  phase: 'handoff' as const,
  id: 'dotquilt/lock',
  options: /* @__PURE__ */ Object.freeze({
    staggerMs: 24,
    reelMs: 55,
    settleMs: 90,
    pop: 0.2,
  }),
  [brand]: lockDefinition,
});
