import type { TableCell, TableColumn, TableInput } from '../table.js';
export const cellKinds = /* @__PURE__ */ Object.freeze([
  'text',
  'number',
  'badge',
  'date',
]);
const defaults: readonly TableColumn[] = /* @__PURE__ */ Object.freeze([
  Object.freeze({ kind: 'text' as const, width: 1 }),
  Object.freeze({ kind: 'text' as const, width: 1 }),
  Object.freeze({ kind: 'text' as const, width: 1 }),
]);
export function tableColumns(
  value: readonly TableColumn[] | undefined,
  report: (code: string) => void = () => {},
): readonly TableColumn[] {
  if (value === undefined) return defaults;
  try {
    if (!Array.isArray(value) || !value.length) throw new TypeError();
    if (value.length > 20) report('table-limit');
    return Object.freeze(
      Array.from(value.slice(0, 20), (c) => {
        const kind = c?.kind,
          width = c?.width ?? 1;
        if (!cellKinds.includes(kind) || !Number.isFinite(width) || width <= 0)
          throw new TypeError();
        return Object.freeze({ kind, width });
      }),
    );
  } catch {
    report('invalid-columns');
    return defaults;
  }
}
export const tableRows = (value: number, columns: number): number =>
  Math.min(
    Number.isInteger(value) && value > 0 ? value : 5,
    100,
    Math.floor(1000 / columns),
  );
export const tableHeight = (value: number): number =>
  Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER / 100
    ? value
    : 32;
/** Normalize weighted columns once per geometry snapshot, not once per row. */
function columnLayout(width: number, columns: readonly TableColumn[]) {
  const max = Math.max(...columns.map((c) => c.width ?? 1));
  const total = columns.reduce((n, c) => n + (c.width ?? 1) / max, 0);
  let x = 0;
  return columns.map((c) => {
    const w = width * ((c.width ?? 1) / max / total);
    const out = { x, width: w, kind: c.kind };
    x += w;
    return out;
  });
}
const noGlyphs = /* @__PURE__ */ Object.freeze([]);
export function tableCells(
  width: number,
  rows: number,
  height: number,
  columns: readonly TableColumn[],
): TableInput {
  const layout = columnLayout(width, columns),
    cells: TableCell[] = [];
  for (let r = 0; r < rows; r++)
    for (const [c, col] of layout.entries())
      cells.push(
        Object.freeze({
          bounds: Object.freeze({
            x: col.x,
            y: r * height,
            width: col.width,
            height,
          }),
          text: '',
          baseline: (r + 0.7) * height,
          tone: 'base',
          rowId: `row-${r}`,
          rowIndex: r,
          columnIndex: c,
          kind: col.kind,
          glyphs: noGlyphs,
        }),
      );
  return Object.freeze({ kind: 'table', cells: Object.freeze(cells) });
}
/** Compact inert vector bands reserve intrinsic height, even without JavaScript. */
export function tableStaticParts(
  rows: number,
  height: number,
  columns: readonly TableColumn[],
): readonly Readonly<Record<string, string>>[] {
  return columnLayout(100, columns).map(({ x, width }) =>
    Object.freeze({
      d: `M ${x + width / 2} ${height / 2} V ${rows * height}`,
      'stroke-width': String(width * 0.7),
      'stroke-dasharray': `${Math.min(8, height * 0.4)} ${height - Math.min(8, height * 0.4)}`,
    }),
  );
}
export function staticTableSVG(
  doc: Document,
  rows: number,
  height: number,
  columns: readonly TableColumn[],
): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    'data-table-static': '',
    class: 'surface',
    'aria-hidden': 'true',
    part: 'surface',
    width: '100%',
    height: String(rows * height),
    viewBox: `0 0 100 ${rows * height}`,
    preserveAspectRatio: 'none',
    fill: 'none',
    stroke: 'currentColor',
    opacity: '.25',
  }))
    svg.setAttribute(k, v);
  for (const attrs of tableStaticParts(rows, height, columns)) {
    const path = doc.createElementNS(svg.namespaceURI, 'path');
    for (const [k, v] of Object.entries(attrs)) path.setAttribute(k, v);
    svg.append(path);
  }
  return svg;
}

/** Private SSR-safe native/adapter seam; no DOM, renderer or registration work. */
export const tableStatic: unique symbol = Symbol.for(
  'dotquilt.table.static.v1',
);
export function tableStaticData(
  rows = 5,
  rowHeight = 32,
  columns?: readonly TableColumn[],
) {
  const normalized = tableColumns(columns);
  const count = tableRows(rows, normalized.length);
  const height = tableHeight(rowHeight);
  return {
    rows: count,
    rowHeight: height,
    parts: tableStaticParts(count, height, normalized),
  };
}
