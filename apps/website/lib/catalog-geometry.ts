import type { ChartInput, ChartVariant } from '@dotquilt-internal/core/chart';
import type { TableInput } from '@dotquilt-internal/core/table';
export const chartValues = [
  0.16, 0.35, 0.28, 0.52, 0.48, 0.8, 0.77, 0.96,
] as const;
export function projectChart(
  { width, height }: { width: number; height: number },
  variant: ChartVariant,
): ChartInput {
  const points = chartValues.map((value, i) => ({
    x: (width * (10 + i * 40)) / 320,
    y: (height * (170 - value * 150)) / 180,
  }));
  if (variant === 'bar')
    return {
      kind: 'bar',
      baseline: (height * 170) / 180,
      bars: points.map((p) => ({
        x: p.x - (width * 8) / 320,
        y: p.y,
        width: (width * 16) / 320,
        height: (height * 170) / 180 - p.y,
      })),
    };
  return variant === 'line'
    ? { kind: 'line', points, baseline: (height * 170) / 180 }
    : { kind: 'scatter', points };
}
export const projects = ['Canvas', 'Grid', 'Chart', 'Table', 'Text'] as const;
export function projectTable(
  table: HTMLTableElement | null,
  placeholder: HTMLElement | null,
): TableInput | null {
  if (!table || !placeholder) return null;
  const origin = placeholder.getBoundingClientRect();
  const range = table.ownerDocument.createRange();
  return {
    kind: 'table',
    cells: Array.from(
      table.tBodies[0]?.querySelectorAll('td') ?? [],
      (cell, i) => {
        const box = cell.getBoundingClientRect();
        const text = cell.textContent ?? '';
        const node = cell.firstChild;
        return {
          bounds: {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          },
          text,
          baseline: box.y - origin.y + box.height * 0.7,
          rowId: `row-${Math.floor(i / 2)}`,
          rowIndex: Math.floor(i / 2),
          columnIndex: i % 2,
          kind: i % 2 ? 'number' : 'text',
          tone: 'base',
          glyphs: Array.from(text, (character, j) => {
            if (!node)
              return { character, bounds: { x: 0, y: 0, width: 0, height: 0 } };
            range.setStart(node, j);
            range.setEnd(node, j + 1);
            const b = range.getBoundingClientRect();
            return {
              character,
              bounds: {
                x: b.x - origin.x,
                y: b.y - origin.y + b.height * 0.13,
                width: b.width,
                height: b.height * 0.74,
              },
            };
          }),
        };
      },
    ),
  };
}
