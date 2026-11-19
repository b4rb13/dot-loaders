import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { pageMarkdown, pagePath } from '../lib/markdown';
import { docsInOrder } from '../lib/order';

/** Every docs page as Markdown, in reading order, in one file. */
export const GET: APIRoute = async ({ site }) =>
  new Response(
    docsInOrder(await getCollection('docs'))
      .map(
        (entry) =>
          `${pageMarkdown(entry)}\nSource: ${new URL(pagePath(entry.id), site).href}\n`,
      )
      .join('\n---\n\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
