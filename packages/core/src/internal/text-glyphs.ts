import type { Dot, GlyphCell } from '../animations.js';
import { clamp } from './math.js';

// Project-owned 5x7 prototype bitmap data, extended with authored lowercase/punctuation.
// Rows are packed base32; all printable Basic Latin code points are represented.
const rows =
  '00000004444404aaa0000avaava04fke5u4pq448m6cik8lid4480000248884284222480level0044v4400000448000v0000000066122488gehjlphe4c4444eeh1248vu11e11u26aiv22vggu11uegguhhev124888ehhehheehhf11e04404400440448248g84200v0v008421248eh12404ehnlngfehhvhhhuhhuhhufgggggfuhhhhhuvgguggvvggugggfggnhhfhhhvhhhv44444v7222iichikokihggggggvhrllhhhhpljhhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gve88888eg884221e22222e4ah0000000000v842000000e1fhfggmphhu00fgggf11djhhf00ehvgf698s8880fhhf1eggmphhh40c444e20622icggikokic44444e00qllll00mphhh00ehhhe00uhugg00fhf1100noggg00fge1u88s889600hhhjd00hhha400hhlla00ha4ah00hhf1e00v248v344o4434444444o44344o009m000';
/** A glyph mark's radius as a share of the matrix pitch. */
export const glyphMark = 0.36;
export function glyph(
  cell: GlyphCell,
  character: string,
  emit: (dot: Dot) => void,
  alpha = 1,
  lift = 0,
  scale = 1,
  matrix = false,
): void {
  const index = character.charCodeAt(0) - 32;
  if (index < 0 || index >= 95) return;
  const b = cell.bounds;
  // A square pitch, centred in the character's box, with marks about 70% of
  // it across: distinct LED-like marks that never run into each other. It
  // follows the line's height, so a narrow comma or 1 keeps the size of the
  // characters around it (its marks sit in the middle columns).
  const tall = b.height / 7;
  const pitch = Math.min(tall, Math.max(b.width / 5, 0.75 * tall));
  const left = b.x + (b.width - 5 * pitch) / 2,
    top = b.y + (b.height - 7 * pitch) / 2;
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 5; x++) {
      const on = !!(
        Number.parseInt(rows[index * 7 + y] ?? '0', 32) &
        (16 >> x)
      );
      if (on || matrix)
        emit({
          x: left + (x + 0.5) * pitch,
          y: top + (y + 0.5) * pitch + lift,
          size: clamp(pitch * glyphMark, 0.45, 3) * scale,
          opacity: (on ? 0.8 : 0.06) * alpha,
          tone: 'base',
        });
    }
}
