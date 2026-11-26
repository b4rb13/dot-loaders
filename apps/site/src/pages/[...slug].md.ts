import { type CollectionEntry, getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { pageMarkdown, pagePath } from '../lib/markdown';
import home from '../markdown/home.md?raw';

/**
 * Every page as plain Markdown, for people and agents that read it without
 * a browser: /docs/components/skeleton/ → /docs/components/skeleton.md, and
 * the home page → /index.md (written by hand: its source is all components).
 * The API reference (/docs/api.md) is the Markdown content.config.ts
 * generates for it, as it is for the page itself.
 * Interactive pages (examples, playground, pricing) say what they are and
 * where to open them. middleware.ts serves these to requests that ask for
 * text/markdown.
 */
export const getStaticPaths = (async () =>
  (await getCollection('docs'))
    // The 404 page is the site's, not a page to read.
    .filter((entry) => entry.id !== '404')
    .map((entry) => ({
      params: { slug: entry.id },
      props: { entry },
    }))) satisfies GetStaticPaths;

function markdown(entry: CollectionEntry<'docs'>, site: URL | undefined) {
  if (entry.id === 'index') return home;
  const text = pageMarkdown(entry);
  if (entry.data.template !== 'splash') return text;
  const tagline = entry.data.hero?.tagline;
  return [
    text.trimEnd(),
    ...(tagline ? ['', tagline] : []),
    '',
    `This page is interactive. Open it in a browser: ${new URL(pagePath(entry.id), site).href}`,
    '',
  ].join('\n');
}

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({
  props,
  site,
}) =>
  new Response(markdown(props.entry, site), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
