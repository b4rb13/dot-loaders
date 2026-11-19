import { type CollectionEntry, getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { pageMarkdown } from '../lib/markdown';

/** Every docs page as plain Markdown: /docs/components/skeleton/ → /docs/components/skeleton.md */
export const getStaticPaths = (async () =>
  (await getCollection('docs'))
    .filter((entry) => entry.id === 'docs' || entry.id.startsWith('docs/'))
    .map((entry) => ({
      params: { slug: entry.id },
      props: { entry },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({ props }) =>
  new Response(pageMarkdown(props.entry), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
