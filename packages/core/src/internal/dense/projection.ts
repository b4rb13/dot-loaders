// Private M2 projection proof. Component-facing providers are finalized with their families.
export interface Point {
  readonly x: number;
  readonly y: number;
}
export interface Rect extends Point {
  readonly width: number;
  readonly height: number;
}
export interface GlyphCell {
  readonly bounds: Rect;
  readonly character: string;
}
export type ChartInput =
  | Readonly<{ kind: 'line'; points: readonly Point[]; baseline: number }>
  | Readonly<{ kind: 'bar'; bars: readonly Rect[]; baseline: number }>
  | Readonly<{ kind: 'scatter'; points: readonly Point[] }>;
export type Projection =
  | Readonly<{ family: 'chart'; input: ChartInput }>
  | Readonly<{
      family: 'text';
      mask: readonly GlyphCell[];
      value: readonly GlyphCell[];
      precise: boolean;
    }>
  | Readonly<{ family: 'table'; cells: readonly TableCell[] }>;
export interface TableCell {
  readonly bounds: Rect;
  readonly text: string;
  readonly baseline: number;
  readonly tone: 'base' | 'accent';
  readonly rowId: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly kind: 'text' | 'number' | 'badge' | 'date';
  readonly glyphs: readonly GlyphCell[];
}
export interface ProjectionResult {
  readonly value: Projection | null;
  readonly attempts: number;
  readonly consumed: number;
  readonly issue?: string;
}
/** Acquire at most twice synchronously, with no timer, retries or DOM discovery. */
export function acquireProjection(provider: () => unknown): ProjectionResult {
  let consumed = 0;
  const item = () => {
    if (++consumed > 2048) throw new TypeError('geometry-limit');
  };
  const number = (v: unknown): number => {
    if (typeof v !== 'number' || !Number.isFinite(v))
      throw new TypeError('invalid-geometry');
    return v;
  };
  const record = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object') throw new TypeError('invalid-geometry');
    return v as Record<string, unknown>;
  };
  const list = (v: unknown): readonly unknown[] => {
    if (!Array.isArray(v) || v.length > 2048)
      throw new TypeError('geometry-limit');
    return v;
  };
  const point = (v: unknown): Point => {
    item();
    const r = record(v);
    return Object.freeze({ x: number(r.x), y: number(r.y) });
  };
  const rect = (v: unknown): Rect => {
    item();
    const r = record(v);
    const width = number(r.width),
      height = number(r.height);
    if (width < 0 || height < 0) throw new TypeError('invalid-geometry');
    return Object.freeze({ x: number(r.x), y: number(r.y), width, height });
  };
  const glyph = (v: unknown): GlyphCell => {
    const r = record(v);
    if (
      typeof r.character !== 'string' ||
      r.character.length > 2 ||
      [...r.character].length !== 1
    )
      throw new TypeError('invalid-geometry');
    return Object.freeze({ bounds: rect(r.bounds), character: r.character });
  };
  for (let attempts = 1; attempts <= 2; attempts++) {
    try {
      const value = provider();
      if (value === null) {
        if (attempts === 1) continue;
        return { value: null, attempts, consumed };
      }
      const r = record(value);
      if (r.family === 'chart') {
        const input = record(r.input);
        if (input.kind === 'bar')
          return {
            value: Object.freeze({
              family: 'chart',
              input: Object.freeze({
                kind: 'bar',
                bars: Object.freeze(list(input.bars).map(rect)),
                baseline: number(input.baseline),
              }),
            }),
            attempts,
            consumed,
          };
        if (input.kind !== 'line' && input.kind !== 'scatter')
          throw new TypeError('invalid-geometry');
        const points = Object.freeze(list(input.points).map(point));
        return {
          value: Object.freeze({
            family: 'chart',
            input:
              input.kind === 'line'
                ? Object.freeze({
                    kind: 'line',
                    points,
                    baseline: number(input.baseline),
                  })
                : Object.freeze({ kind: 'scatter', points }),
          }),
          attempts,
          consumed,
        };
      }
      if (r.family === 'text') {
        const mask = Object.freeze(list(r.mask).map(glyph)),
          value = Object.freeze(list(r.value).map(glyph));
        const precise =
          r.precise === true &&
          value.length <= 256 &&
          mask.length <= 256 &&
          [...mask, ...value].every((g) => /^[\x20-\x7e]$/.test(g.character));
        return {
          value: Object.freeze({ family: 'text', mask, value, precise }),
          attempts,
          consumed,
        };
      }
      if (r.family === 'table') {
        const raw = list(r.cells);
        if (raw.length > 1000) throw new TypeError('geometry-limit');
        const cells = Object.freeze(
          raw.map((v): TableCell => {
            const cell = record(v);
            const bounds = rect(cell.bounds);
            const rowIndex = number(cell.rowIndex),
              columnIndex = number(cell.columnIndex);
            if (
              !Number.isInteger(rowIndex) ||
              rowIndex < 0 ||
              rowIndex >= 100 ||
              !Number.isInteger(columnIndex) ||
              columnIndex < 0 ||
              columnIndex >= 20 ||
              typeof cell.text !== 'string' ||
              cell.text.length > 256 ||
              typeof cell.rowId !== 'string' ||
              !cell.rowId ||
              cell.rowId.length > 128 ||
              !['text', 'number', 'badge', 'date'].includes(
                String(cell.kind),
              ) ||
              !['base', 'accent'].includes(String(cell.tone))
            )
              throw new TypeError('invalid-geometry');
            return Object.freeze({
              bounds,
              text: cell.text,
              baseline: number(cell.baseline),
              tone: cell.tone as TableCell['tone'],
              rowId: cell.rowId,
              rowIndex,
              columnIndex,
              kind: cell.kind as TableCell['kind'],
              glyphs: Object.freeze(list(cell.glyphs).map(glyph)),
            });
          }),
        );
        return {
          value: Object.freeze({ family: 'table', cells }),
          attempts,
          consumed,
        };
      }
      throw new TypeError('invalid-geometry');
    } catch (error) {
      return {
        value: null,
        attempts,
        consumed: Math.min(consumed, 2048),
        issue:
          error instanceof Error &&
          ['geometry-limit', 'invalid-geometry'].includes(error.message)
            ? error.message
            : 'provider-failed',
      };
    }
  }
  return { value: null, attempts: 2, consumed };
}
