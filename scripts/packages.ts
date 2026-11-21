/**
 * The published packages, in the order they are released: a package comes
 * after the ones it depends on. The release workflow, `release:check` and
 * the changesets `fixed` group follow this list;
 * `scripts/packages.test.ts` keeps them in agreement.
 *
 * Adding a package: add it here and to the `fixed` group in
 * `.changeset/config.json`, then see "Adding a package" in CONTRIBUTING.md
 * for its first release.
 */
export const releaseOrder = [
  'packages/core',
  'packages/react',
  'packages/vue',
  'packages/svelte',
] as const;
