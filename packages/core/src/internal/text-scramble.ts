import type { ScrambleOptions } from '../text-animations.js';
import {
  noise,
  randomCharacter,
  scrambleDefinition,
  type TextDraw,
} from './text-definitions.js';
import { glyph } from './text-glyphs.js';

// Optional recipes share the existing glyph renderer, runner and still frame.
// Only their glyph-selection cadence differs; no additional clocks or state.
function scramble(sequentialWords: boolean) {
  return Object.freeze({
    family: 'text' as const,
    phase: 'idle' as const,
    id: sequentialWords
      ? 'dotquilt/scramble-words'
      : 'dotquilt/scramble-characters',
    runner: scrambleDefinition.runner,
    still: scrambleDefinition.still,
    frame(context: TextDraw, options: ScrambleOptions): undefined {
      if (!context.surface.input.precise) return;
      const cells = context.surface.input.mask;
      let words = 0,
        boundary = true;
      if (sequentialWords)
        for (const cell of cells) {
          if (cell.character === ' ') boundary = true;
          else if (boundary) {
            words++;
            boundary = false;
          }
        }
      const time = (context.timeMs * options.changesPerSecond) / 1000;
      let word = -1;
      boundary = true;
      cells.forEach((cell, i) => {
        if (cell.character === ' ') boundary = true;
        else if (boundary) {
          word++;
          boundary = false;
        }
        const tick = sequentialWords
          ? Math.floor((Math.floor(time) + words - 1 - word) / (words || 1))
          : Math.floor(time + noise(i + 19));
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
}

export const scrambleCharactersDefinition = /* @__PURE__ */ scramble(false);
export const scrambleWordsDefinition = /* @__PURE__ */ scramble(true);
