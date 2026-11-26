import { defineCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import type { Loader } from 'astro/loaders';
import { apiReference } from './lib/api-reference';
import { changelogPage } from './lib/changelog';

/**
 * The pages in src/content/docs, plus two generated ones: the API reference,
 * from the element descriptions (lib/api-reference.ts), and the changelog,
 * from the packages' changelogs (lib/changelog.ts). They render, have a
 * Markdown copy and are listed like any other page.
 */
function docsPages(): Loader {
  const pages = docsLoader();
  return {
    name: 'dotquilt-docs-loader',
    async load(context) {
      await pages.load(context);
      const repository = new URL('../../', context.config.root);
      const generated = [
        apiReference((page) => {
          const title = context.store.get(page)?.data.title;
          return typeof title === 'string' ? title : undefined;
        }),
        changelogPage((path) =>
          readFileSync(new URL(path, repository), 'utf8'),
        ),
      ];
      for (const { id, data, body } of generated)
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
