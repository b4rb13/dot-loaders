import { type CollectionEntry, getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { cardFor, hasCard } from '../../lib/cards';
import { renderCard } from '../../lib/og';

/**
 * Every page's social card, rendered at build time: /og/index.png for the
 * home page, /og/docs/components/skeleton.png and so on (see lib/og.ts).
 */
export const getStaticPaths = (async () =>
  (await getCollection('docs'))
    .filter((entry) => hasCard(entry.id))
    .map((entry) => ({
      params: { slug: entry.id },
      props: { entry },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = async ({
  props,
}) =>
  new Response(await renderCard(cardFor(props.entry)), {
    headers: { 'content-type': 'image/png' },
  });
