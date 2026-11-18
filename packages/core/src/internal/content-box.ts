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
