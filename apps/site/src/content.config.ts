import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import type { Loader } from 'astro/loaders';
import { apiReference } from './lib/api-reference';

/**
 * The pages in src/content/docs, plus the API reference: generated from the
 * element descriptions (lib/api-reference.ts), it renders, has a Markdown
 * copy and is listed like any other page.
 */
function docsPages(): Loader {
  const pages = docsLoader();
  return {
    name: 'dotquilt-docs-loader',
    async load(context) {
      await pages.load(context);
      const { id, data, body } = apiReference((page) => {
        const title = context.store.get(page)?.data.title;
        return typeof title === 'string' ? title : undefined;
      });
      context.store.set({
        id,
        data: await context.parseData({ id, data }),
        body,
        // Rendered as if it were a file among the others (none is written),
        // so Starlight's Markdown plugins, such as heading links, apply.
        rendered: await context.renderMarkdown(body, {
          fileURL: new URL(`src/content/docs/${id}.md`, context.config.root),
        }),
      });
    },
  };
}

export const collections = {
  docs: defineCollection({ loader: docsPages(), schema: docsSchema() }),
};
