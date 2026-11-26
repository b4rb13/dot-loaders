import type { CollectionEntry } from 'astro:content';

/** The sidebar's order: getting started, then components, then guides. */
const first = [
  'docs',
  'docs/installation',
  'docs/ai-setup',
  'docs/theming',
  'docs/stability',
];
export function docsInOrder(
  entries: readonly CollectionEntry<'docs'>[],
): CollectionEntry<'docs'>[] {
  const rank = (id: string) => {
    const start = first.indexOf(id);
    if (start >= 0) return start;
    return id.startsWith('docs/components/') ? 10 : 20;
  };
  return entries
    .filter((entry) => entry.id === 'docs' || entry.id.startsWith('docs/'))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}
