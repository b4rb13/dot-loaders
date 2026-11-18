import type {
  ChartVariant,
  TargetProvider,
} from '@dotquilt-internal/core/chart';
import type {
  TableInput,
  TableTargetProvider,
} from '@dotquilt-internal/core/table';
import { chartGeometry } from './data';
export type ProviderMode =
  | 'valid'
  | 'retry'
  | 'unavailable'
  | 'invalid'
  | 'throw'
  | 'missing-row'
  | 'international';
export const modes: readonly ProviderMode[] = [
  'valid',
  'retry',
  'unavailable',
  'invalid',
  'throw',
  'missing-row',
  'international',
];
export function tableGeometry(root: ParentNode): TableInput | null {
  const source = root.querySelector('#table-source');
  const table = root.querySelector<HTMLTableElement>('#report-table');
  if (!source || !table || document.fonts.status === 'loading') return null;
  const origin = source.getBoundingClientRect();
  if (!origin.width || !origin.height) return null;
  const cells: TableInput['cells'][number][] = [];
  for (const [rowIndex, row] of Array.from(
    table.tBodies[0]?.rows ?? [],
  ).entries()) {
    const rowId = row.dataset.rowId;
    if (!rowId) return null;
    for (const [columnIndex, cell] of Array.from(row.cells).entries()) {
      const span = cell.querySelector('[data-cell-text]');
      const node = span?.firstChild;
      const text = span?.textContent ?? '';
      // This frozen semantic table API accepts printable ASCII; preserve other
      // application text and choose whole-content fallback instead of transliteration.
      if (
        !(node instanceof Text) ||
        !text ||
        text.length > 256 ||
        !/^[\x20-\x7e]+$/.test(text)
      )
        return null;
      const rect = cell.getBoundingClientRect();
      const glyphs = [];
      const range = document.createRange();
      for (let index = 0; index < text.length; index++) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const box = range.getBoundingClientRect();
        glyphs.push({
          character: text[index] ?? '',
          bounds: {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          },
        });
      }
      cells.push({
        rowId,
        rowIndex,
        columnIndex,
        kind:
          columnIndex === 2 ? 'number' : columnIndex === 1 ? 'badge' : 'text',
        tone: columnIndex === 1 ? 'accent' : 'base',
        text,
        bounds: {
          x: rect.x - origin.x,
          y: rect.y - origin.y,
          width: rect.width,
          height: rect.height,
        },
        baseline: rect.y - origin.y + rect.height * 0.72,
        glyphs,
      });
    }
  }
  return { kind: 'table', cells };
}
export function providers(
  root: ParentNode,
  settings: () => { mode: ProviderMode; variant: ChartVariant },
) {
  const calls = { chart: 0, table: 0 };
  function available(kind: 'chart' | 'table') {
    calls[kind]++;
    const mode = settings().mode;
    if (mode === 'throw') throw new Error('Illustrative provider failure');
    return mode !== 'unavailable' && !(mode === 'retry' && calls[kind] === 1);
  }
  const chart: TargetProvider = (bounds) => {
    if (!available('chart')) return null;
    return settings().mode === 'invalid'
      ? { kind: 'line', points: [{ x: Number.NaN, y: 0 }], baseline: 0 }
      : chartGeometry(bounds, settings().variant);
  };
  const table: TableTargetProvider = () => {
    if (!available('table')) return null;
    const result = tableGeometry(root);
    if (settings().mode === 'invalid' && result?.cells[0])
      return {
        kind: 'table',
        cells: [
          {
            ...result.cells[0],
            bounds: { x: 0, y: 0, width: Number.NaN, height: 20 },
          },
        ],
      };
    return result;
  };
  return {
    chart,
    table,
    calls,
    reset() {
      calls.chart = 0;
      calls.table = 0;
    },
  };
}
