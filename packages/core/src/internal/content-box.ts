/** Fresh content-box bounds without constructing a rich animation surface. */
export function contentBox(host: HTMLElement) {
  const css = host.ownerDocument.defaultView?.getComputedStyle(host);
  const dimension = (axis: 'width' | 'height', edges: readonly string[]) =>
    Math.max(
      0,
      (parseFloat(css?.[axis] ?? '') || 0) -
        (css?.boxSizing === 'border-box'
          ? edges.reduce(
              (sum, side) =>
                sum +
                (parseFloat(css.getPropertyValue(`padding-${side}`)) || 0) +
                (parseFloat(css.getPropertyValue(`border-${side}-width`)) || 0),
              0,
            )
          : 0),
    );
  return {
    width: dimension('width', ['left', 'right']),
    height: dimension('height', ['top', 'bottom']),
  };
}

/**
 * Cheap summary of what a rich surface depends on: its size, dot pitch and
 * colours. Environment notifications rebuild the surface only when this
 * changes; otherwise they just re-check eligibility.
 */
export function surfaceEnvironment(host: HTMLElement): string {
  const win = host.ownerDocument.defaultView;
  const css = win?.getComputedStyle(host);
  const field = host.shadowRoot?.querySelector('.surface');
  const fieldCss = field && win?.getComputedStyle(field);
  return [
    css?.width,
    css?.height,
    css?.color,
    css?.direction,
    css?.getPropertyValue('--dotquilt-color'),
    css?.getPropertyValue('--dotquilt-accent-color'),
    fieldCss?.backgroundSize,
    fieldCss?.gap,
    fieldCss?.color,
  ].join('|');
}
