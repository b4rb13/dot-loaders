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
        // `:host` becomes `:host(tag)`; `:host([mark=dash])` becomes
        // `:host(tag[mark=dash])`, one compound selector.
        .map((css) =>
          css.replace(/:host(\()?/g, (_, open) =>
            open ? `:host(${tag}` : `:host(${tag})`,
          ),
        ),
    ),
    ...fallbacks.flat(),
  ].join('\n');
}
