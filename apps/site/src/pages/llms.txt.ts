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
  // Generated from the element descriptions (lib/api-reference.ts) and the
  // packages' changelogs (lib/changelog.ts).
  const reference = ['docs/api', 'docs/changelog'];
  return new Response(
    [
      '# Dotquilt',
      '',
      '> Skeleton loaders for the web, made of dots. They hold the shape of your content while it loads, then hand over to it: native Web Components with no runtime dependencies, and components for React, Vue, Svelte and Angular with server rendering.',
      '',
      `Install with \`npm install dotquilt\`, plus \`@dotquilt/react\`, \`@dotquilt/vue\`, \`@dotquilt/svelte\` or \`@dotquilt/angular\` for those frameworks. Each link below is the page as Markdown.`,
      '',
      '**When to use Dotquilt.** Reach for it when a web page waits for data and should show the shape of what is coming instead of a spinner:',
      '',
      '- a list, feed, card, profile or paragraph that loads (Skeleton inside a LoadingRegion);',
      '- a number or short label, such as a KPI (TextLoader);',
      '- a line, bar or scatter chart (ChartLoader, whose marks glide onto the real data);',
      '- a table whose rows load or page (TableLoader);',
      '- a chat reply being written (TypingDots);',
      '- content that refreshes in the background and must stay readable (LoadingRegion with state="refreshing");',
      '- pages rendered on the server (placeholders are in the first HTML), sites with a strict Content Security Policy, and any framework (native Web Components; React, Vue, Svelte and Angular have typed components).',
      '',
      'It is not for actions: keep spinners on buttons and form submissions, and progress bars for uploads.',
      '',
      '**How an agent should use it:**',
      '',
      '1. To add Dotquilt to a project, follow the setup prompt (the first link below): analyse the project, ask the user, then convert one place at a time.',
      '2. Install with `npm install dotquilt`, plus the package for the framework: `@dotquilt/react` (React 19), `@dotquilt/vue` (Vue 3.5), `@dotquilt/svelte` (Svelte 5) or `@dotquilt/angular` (Angular 22).',
      "3. Wrap only the part that loads in a LoadingRegion with an `aria-label`, pass the existing loading state as `state` (`pending`, `refreshing` or `ready`), and give it a placeholder in the content's shape and size. Don't change how the data is fetched.",
      '4. Check the details on the pages below before writing code: the API is new and may not be in your training data. The API reference lists every element, attribute, property, event, slot, CSS part and custom property, with the React, Vue, Svelte and Angular names.',
      '',
      '## Start here',
      '',
      `- [Setup prompt](${url('/setup-prompt.md')}): a prompt for coding assistants that analyses a project and adds Dotquilt one place at a time`,
      `- [Every page in one file](${url('/llms-full.txt')}): all the docs pages below, as one Markdown file`,
      `- [Custom Elements Manifest](${url('/custom-elements.json')}): every element's attributes, properties, events, slots, CSS parts and custom properties, as JSON`,
      `- [OpenAPI description](${url('/openapi.json')}): these endpoints, for tools that read OpenAPI; also linked from ${url('/.well-known/api-catalog')}`,
      '',
      ...section(
        'Getting started',
        (id) =>
          id === 'docs' ||
          (/^docs\/[^/]+$/.test(id) && !reference.includes(id)),
      ),
      ...section('Components', prefix('docs/components/')),
      ...section('Guides', prefix('docs/guides/')),
      ...section('Reference', (id) => reference.includes(id)),
      '## Optional',
      '',
      `- [Examples](${url('/examples/')}): every loader in the place it lives, with its code`,
      `- [Playground](${url('/playground/')}): try every option and copy the code`,
      `- [About](${url('/about.md')}): what Dotquilt is and how it is made and released`,
      `- [Contact](${url('/contact.md')}): bugs, questions and security reports`,
      `- [Privacy](${url('/privacy.md')}): what the website collects`,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};
