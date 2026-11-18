import type { TargetProvider } from '@dotquilt-internal/core/chart';
import type { TableTargetProvider } from '@dotquilt-internal/core/table';

// Coordinates are content-box CSS pixels; callers provide their actual chart geometry.
export const sampleChart: TargetProvider = ({ width, height }) => ({
  kind: 'line',
  points: [
    { x: 0, y: height },
    { x: width / 2, y: height / 4 },
    { x: width, y: height / 2 },
  ],
  baseline: height,
});

// The app measures only its explicitly supplied elements. No grid-library dependency.
export function tableTargets(
  placeholder: HTMLElement,
  rows: readonly HTMLElement[],
): TableTargetProvider {
  return () => {
    const box = placeholder.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const style = getComputedStyle(placeholder);
    const left =
      box.left + placeholder.clientLeft + parseFloat(style.paddingLeft);
    const top = box.top + placeholder.clientTop + parseFloat(style.paddingTop);
    return {
      kind: 'rects',
      rects: rows.slice(0, 100).map((row) => {
        const bounds = row.getBoundingClientRect();
        return {
          x: bounds.left - left,
          y: bounds.top - top,
          width: bounds.width,
          height: bounds.height,
        };
      }),
    };
  };
}
