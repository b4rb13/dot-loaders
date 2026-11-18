import 'server-only';
import { loader } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
  docs: { schema: pageSchema.required({ description: true }) },
});

export const docsSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
