import {
  type DrawContext,
  defineAnimation,
} from '@dotquilt-internal/core/animations';
import points from './gallery-dots.json';

// Homepage-only definitions use the same public bounded engine as user recipes.
// The font-derived lattice is static data; callbacks receive no DOM/canvas access.
function draw(context: DrawContext<'text'>, moving: boolean): undefined {
  const { width, height } = context.surface;
  const time = moving ? context.frame.timeMs / 950 : 0;
  points.forEach(([x = 0, y = 0], index) => {
    const scatter = (1 - x) ** 2;
    context.dot({
      x: x * width + Math.sin(index * 5.3 + time) * scatter * width * 0.014,
      y:
        y * height +
        Math.cos(index * 3.1 + time * 0.8) * scatter * height * 0.035,
      size: Math.max(1, (width / 1280) * 5.4),
      opacity: 0.14 + x * 0.86,
      tone: 'base',
    });
  });
}

const idle = defineAnimation({
  contractVersion: 1,
  id: 'dotquilt-site/gallery-idle',
  family: 'text',
  phase: 'idle',
  options: { parse: () => ({}) },
  frame(context) {
    return draw(context, true);
  },
  still(context) {
    return draw(context, false);
  },
});
const reveal = defineAnimation({
  contractVersion: 1,
  id: 'dotquilt-site/gallery-reveal',
  family: 'text',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 1100,
  prepare: (surface) => surface.source,
  frame(context) {
    const progress = context.frame.progress;
    context.prepared.forEach((dot, index) => {
      const [x = 0, y = 0] = points[index] ?? [];
      const local = Math.min(1, Math.max(0, (progress - x * 0.12) / 0.6));
      const settle = 1 - (1 - local) ** 3;
      context.dot({
        ...dot,
        x: dot.x + (x * context.surface.width - dot.x) * settle,
        y: dot.y + (y * context.surface.height - dot.y) * settle,
        opacity: dot.opacity * (1 - Math.max(0, (progress - 0.55) / 0.45)),
        size: dot.size * (1 - progress * 0.12),
      });
    });
    context.reveal({ opacity: Math.max(0, (progress - 0.52) / 0.48) });
  },
});

export const galleryAnimations = { idle: idle(), handoff: reveal() };
