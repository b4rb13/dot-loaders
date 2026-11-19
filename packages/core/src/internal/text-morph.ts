import type { AnimationSurface, Dot } from '../animations.js';
import { handoff, morphTiming } from './marks.js';
import { clamp } from './math.js';
import type { TextReveal } from './text-definitions.js';
import { glyph } from './text-glyphs.js';
import { createTextHandoff } from './text-playback.js';

export interface TextMorphOptions {
  /** Each mark's own journey, as a share of the handoff. */
  readonly travel: number;
  /** When the real text starts to wipe in. */
  readonly wipeStart: number;
  /** Width of the soft front, in px. */
  readonly edge: number;
}
export interface Travel {
  readonly from: Dot;
  readonly to: Dot;
  readonly born: boolean;
  readonly dies: boolean;
  readonly order: number;
}
const sine = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const nearest = (dots: readonly Dot[], x: number, y: number) => {
  let best: Dot | undefined,
    d = Number.POSITIVE_INFINITY;
  for (const dot of dots) {
    const e = (dot.x - x) ** 2 + (dot.y - y) ** 2;
    if (e < d) {
      d = e;
      best = dot;
    }
  }
  return best;
};

/**
 * TextLoader's handoff (design/SPEC.md, "take shape, then hand over"): the
 * scrambling marks slide into the real characters' shapes, lit while they
 * travel, then the real text wipes in left to right (right to left in RTL)
 * along a soft front, and the marks leave where it passes them.
 */
export const textMorphDefinition = /* @__PURE__ */ Object.freeze({
  family: 'text' as const,
  phase: 'handoff' as const,
  id: 'dotquilt/text/morph-wipe',
  handoff: createTextHandoff,
  duration(surface: AnimationSurface<'text'>) {
    return surface.input.precise ? handoff.duration : 150;
  },
  prepare(surface: AnimationSurface<'text'>): readonly Travel[] {
    const cells = surface.input.value;
    if (!surface.input.precise || !cells.length) return [];
    // The idle's last frame, without its glow copies.
    const source = surface.source.filter((dot) => dot.tone !== 'accent');
    const width = Math.max(1, surface.width);
    const centres = cells.map((cell) => cell.bounds.x + cell.bounds.width / 2);
    const owned = cells.map((): Dot[] => []);
    for (const dot of source) {
      let index = 0;
      for (let i = 1; i < centres.length; i++)
        if (
          Math.abs((centres[i] ?? 0) - dot.x) <
          Math.abs((centres[index] ?? 0) - dot.x)
        )
          index = i;
      owned[index]?.push(dot);
    }
    const travels: Travel[] = [];
    cells.forEach((cell, index) => {
      const targets: Dot[] = [];
      glyph(cell, cell.character, (dot) => targets.push(dot));
      const mine = owned[index] ?? [];
      const free = new Set(mine);
      const order = clamp((centres[index] ?? 0) / width);
      for (const target of targets) {
        const own = nearest([...free], target.x, target.y);
        const from = own ?? nearest(mine, target.x, target.y);
        if (own) free.delete(own);
        travels.push({
          from: from ?? { ...target, opacity: 0 },
          to: target,
          born: !own,
          dies: false,
          order,
        });
      }
      // Marks the real character doesn't need fold into it and fade.
      for (const dot of free)
        travels.push({
          from: dot,
          to: nearest(targets, dot.x, dot.y) ?? dot,
          born: false,
          dies: true,
          order,
        });
    });
    return travels;
  },
  frame(
    context: TextReveal<readonly Travel[]>,
    options: TextMorphOptions,
  ): undefined {
    const { surface, progress: p, prepared } = context;
    if (!surface.input.precise) {
      for (const dot of surface.source)
        context.dot({ ...dot, opacity: dot.opacity * (1 - p) });
      context.reveal({ opacity: p });
      return;
    }
    const width = Math.max(1, surface.width);
    const rtl = context.rtl === true;
    const { stagger } = morphTiming;
    const { travel, wipeStart, edge } = options;
    const at =
      -edge + (width + 2 * edge) * sine((p - wipeStart) / (1 - wipeStart));
    for (const item of prepared) {
      const order = rtl ? 1 - item.order : item.order;
      const q = sine((p - stagger * order) / travel);
      const x = mix(item.from.x, item.to.x, q),
        y = mix(item.from.y, item.to.y, q);
      const start = item.born ? 0 : item.from.opacity;
      const opacity = item.dies
        ? mix(start, 0, clamp(q * 1.4))
        : mix(start, item.to.opacity, q);
      const ahead = rtl ? width - x : x;
      context.dot({
        x,
        y,
        size: mix(item.from.size, item.to.size, q),
        opacity: opacity * clamp((ahead - at + edge) / edge),
        tone: !item.dies && q > 0.08 && q < 0.82 ? 'accent' : 'base',
      });
    }
    context.reveal({ opacity: 1, front: at, edge, rtl });
  },
});
