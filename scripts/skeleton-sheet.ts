/** One real external resource for mixed skeletons; shape rules stay host-scoped. */
export function skeletonSheet(
  base: readonly string[],
  variants: readonly (readonly [string, readonly string[]])[],
  fallbacks: readonly (readonly string[])[],
): string {
  return [
    ...base,
    ...variants.flatMap(([tag, styles]) =>
      styles
        .slice(base.length)
        .map((css) => css.replaceAll(':host', `:host(${tag})`)),
    ),
    ...fallbacks.flat(),
  ].join('\n');
}
