import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { markdownPath } from '../lib/markdown';
import { docsInOrder } from '../lib/order';

/** An index for AI assistants and agents (https://llmstxt.org). */
export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const docs = docsInOrder(await getCollection('docs'));
  const section = (title: string, match: (id: string) => boolean) => [
    `## ${title}`,
    '',
    ...docs
      .filter((entry) => match(entry.id))
      .map(
        (entry) =>
          `- [${entry.data.title}](${url(markdownPath(entry.id))})${entry.data.description ? `: ${entry.data.description}` : ''}`,
      ),
    '',
  ];
  const prefix = (start: string) => (id: string) => id.startsWith(start);
  return new Response(
    [
      '# Dotquilt',
      '',
      '> Dot-based loading placeholders for the web. They hold the shape of your content while it loads, then hand over to it: native Web Components with no runtime dependencies, and React 19 components with server rendering.',
      '',
      `Install with \`npm install dotquilt\` (and \`@dotquilt/react\` for React 19). Each link below is the page as Markdown; ${url('/llms-full.txt')} has every page in one file. To add Dotquilt to a project, follow ${url('/setup-prompt.md')}.`,
      '',
      ...section(
        'Getting started',
        (id) => id === 'docs' || /^docs\/[^/]+$/.test(id),
      ),
      ...section('Components', prefix('docs/components/')),
      ...section('Guides', prefix('docs/guides/')),
      '## Optional',
      '',
      `- [Examples](${url('/examples/')}): every loader in the place it lives, with its code`,
      `- [Playground](${url('/playground/')}): try every option and copy the code`,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};
