import type { GlyphCell, Rect } from '../animations.js';
import type { TableCell, TableInput, TableTargetProvider } from '../table.js';
import { cellKinds } from './table-model.js';
export const emptyTableInput: TableInput = /* @__PURE__ */ Object.freeze({
  kind: 'table',
  cells: Object.freeze([]),
});
const finite = (n: unknown): number => {
  if (!Number.isFinite(n)) throw new TypeError();
  return n as number;
};
const rect = (raw: Rect): Rect => {
  const x = finite(raw.x),
    y = finite(raw.y),
    width = finite(raw.width),
    height = finite(raw.height);
  if (width < 0 || height < 0) throw new TypeError();
  return Object.freeze({ x, y, width, height });
};
/** Synchronous copied data only. Nested glyphs count against the same 2,048-item cap. */
export function tableProjection(
  provider: TableTargetProvider | undefined,
  bounds: Readonly<{ width: number; height: number }>,
  report: (code: string) => void,
): TableInput {
  if (!provider) return emptyTableInput;
  try {
    let raw = provider(bounds);
    if (raw === null) raw = provider(bounds);
    if (raw === null) return emptyTableInput;
    if (!raw || typeof raw !== 'object') throw new TypeError();
    let used = 0;
    if (raw.kind === 'points' || raw.kind === 'rects') {
      const items = raw.kind === 'points' ? raw.points : raw.rects;
      if (!Array.isArray(items) || items.length > 2048) throw new TypeError();
      // The original finite point/rectangle bridge remains accepted. It does not
      // invent text or row ownership; without semantic cells the simple reveal wins.
      for (const item of items) {
        if (raw.kind === 'rects') rect(item as Rect);
        else {
          finite(item.x);
          finite(item.y);
        }
      }
      return emptyTableInput;
    }
    if (
      raw.kind !== 'table' ||
      !Array.isArray(raw.cells) ||
      raw.cells.length > 1000
    )
      throw new TypeError();
    const occupied = new Set<string>();
    const rows = new Map<string | number, string | number>();
    const cells = Array.from(raw.cells, (c): TableCell => {
      if (++used > 2048) throw new TypeError();
      const b = rect(c.bounds),
        text = c.text,
        baseline = finite(c.baseline),
        rowId = c.rowId,
        rowIndex = c.rowIndex,
        columnIndex = c.columnIndex,
        kind = c.kind,
        tone = c.tone,
        glyphs = c.glyphs;
      if (
        typeof text !== 'string' ||
        text.length > 256 ||
        !/^[\x20-\x7e]*$/.test(text) ||
        typeof rowId !== 'string' ||
        !rowId ||
        rowId.length > 256 ||
        !Number.isInteger(rowIndex) ||
        rowIndex < 0 ||
        rowIndex >= 100 ||
        !Number.isInteger(columnIndex) ||
        columnIndex < 0 ||
        columnIndex >= 20 ||
        !cellKinds.includes(kind) ||
        !['base', 'accent'].includes(tone) ||
        !Array.isArray(glyphs) ||
        glyphs.length > 256 ||
        used + glyphs.length > 2048
      )
        throw new TypeError();
      const key = `${rowIndex}:${columnIndex}`;
      if (occupied.has(key)) throw new TypeError();
      occupied.add(key);
      if (
        (rows.has(rowIndex) && rows.get(rowIndex) !== rowId) ||
        (rows.has(rowId) && rows.get(rowId) !== rowIndex)
      )
        throw new TypeError();
      rows.set(rowIndex, rowId);
      rows.set(rowId, rowIndex);
      used += glyphs.length;
      const copied = Object.freeze(
        Array.from(glyphs, (g): GlyphCell => {
          const character = g.character;
          if (
            typeof character !== 'string' ||
            character.length !== 1 ||
            !/^[\x20-\x7e]$/.test(character)
          )
            throw new TypeError();
          return Object.freeze({ character, bounds: rect(g.bounds) });
        }),
      );
      return Object.freeze({
        bounds: b,
        text,
        baseline,
        rowId,
        rowIndex,
        columnIndex,
        kind,
        tone,
        glyphs: copied,
      });
    });
    return Object.freeze({ kind: 'table', cells: Object.freeze(cells) });
  } catch {
    report('invalid-geometry');
    return emptyTableInput;
  }
}
