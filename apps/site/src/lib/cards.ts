import type { CollectionEntry } from 'astro:content';
import { type Card, cardVersion } from './og';

/**
 * What each page's social card says, and where it is: `/og/<page id>.png`,
 * with `?v=` so a changed card is fetched again by platforms that cache by
 * URL. src/pages/og/[...slug].png.ts renders them; src/routeData.ts points
 * each page's og:image and twitter:image at its own.
 */

const site = 'https://dotquilt.dev';

/** The small label above the title: where the page sits on the site. */
function section(id: string): string | undefined {
  if (id === 'index') return 'React · Vue · Svelte · Angular';
  if (id.startsWith('docs/components/')) return 'Components';
  if (id.startsWith('docs/guides/')) return 'Guides';
  if (id === 'docs' || id.startsWith('docs/')) return 'Docs';
  if (id === 'examples' || id === 'playground' || id === 'pricing')
    return undefined;
  return 'Dotquilt';
}

export function cardFor(entry: CollectionEntry<'docs'>): Card {
  const { data, id } = entry;
  if (id === 'index')
    return {
      title: data.hero?.title ?? data.title,
      section: section(id),
      description: data.hero?.tagline,
      seed: id,
    };
  return {
    title: data.title,
    section: section(id),
    description: data.description,
    seed: id,
  };
}

/** Pages that get a card of their own; any other page uses the home card. */
export const hasCard = (id: string) => id !== '404';

export function cardUrl(entry: CollectionEntry<'docs'>): string {
  return `${site}/og/${entry.id}.png?v=${cardVersion(cardFor(entry))}`;
}

export function cardAlt(entry: CollectionEntry<'docs'>): string {
  const { title, section: label } = cardFor(entry);
  return label && entry.id !== 'index' && label !== 'Dotquilt'
    ? `Dotquilt · ${label}: ${title}`
    : `Dotquilt: ${title}`;
}
