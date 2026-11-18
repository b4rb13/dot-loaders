import 'server-only';
import {
  type AdvancedIndex,
  createSearchAPI,
} from 'fumadocs-core/search/server';
import { catalog } from './catalog';
import { optionSpecs } from './catalog-options';
import { componentControls } from './component-controls';
import { docsSource } from './docs-source';
import { previewVersion } from './example';
import { galleryRecipes } from './gallery';

export function documentationIndexes(): AdvancedIndex[] {
  const indexes: AdvancedIndex[] = docsSource.getPages().map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    breadcrumbs: [previewVersion, ...page.slugs.slice(0, -1)],
    tag:
      page.slugs[0] === 'guides' &&
      ['react', 'nextjs'].includes(page.slugs[1] ?? '')
        ? ['all', 'react']
        : ['all', 'native', 'react'],
    structuredData: page.data.structuredData,
  }));
  for (const item of catalog) {
    const index = indexes.find(
      (entry) => entry.url === `/docs/components/${item.slug}`,
    );
    if (!index) throw new Error(`Missing documentation for ${item.slug}`);
    index.structuredData = {
      headings: [...index.structuredData.headings],
      contents: [
        ...index.structuredData.contents,
        {
          heading: 'overview',
          content: `${item.name} ${item.tag} ${item.summary} ${item.use} ${item.limits}`,
        },
        ...componentControls(item).map((control) => ({
          heading: 'api',
          content: control.join(' · '),
        })),
        ...[...item.idles, ...item.reveals]
          .filter((recipe) => recipe !== 'default')
          .map((recipe) => ({
            heading: 'animation-options',
            content: `${recipe} ${Object.entries(
              optionSpecs[recipe as keyof typeof optionSpecs] ?? {},
            )
              .map(([key, value]) => `${key} ${JSON.stringify(value)}`)
              .join(' ')}`,
          })),
      ],
    };
  }
  indexes.push({
    id: '/docs/components',
    url: '/docs/components',
    title: 'Component catalog',
    description: 'Nine composable loaders and readiness ownership.',
    tag: ['all', 'native', 'react'],
    breadcrumbs: [previewVersion],
    structuredData: {
      headings: [],
      contents: catalog.map((item) => ({
        heading: undefined,
        content: `${item.name}: ${item.summary}`,
      })),
    },
  });
  indexes.push({
    id: '/docs/gallery',
    url: '/docs/gallery',
    title: 'Animation gallery',
    description:
      'Complete React examples for every first-party animation family.',
    tag: ['all', 'react'],
    breadcrumbs: [previewVersion, 'React'],
    structuredData: {
      headings: [],
      contents: [
        {
          heading: undefined,
          content:
            'Independent characters, word by word, chart morph, table rows, skeletons and coordinated reveals.',
        },
      ],
    },
  });
  for (const recipe of galleryRecipes)
    indexes.push({
      id: `/docs/gallery/${recipe.id}`,
      url: `/docs/gallery/${recipe.id}`,
      title: recipe.title,
      description: recipe.description,
      tag: ['all', 'react'],
      breadcrumbs: [previewVersion, 'React', 'Animation gallery'],
      structuredData: {
        headings: [{ id: 'code', content: 'Complete React component' }],
        contents: [
          {
            heading: undefined,
            content: `${recipe.component} ${recipe.idle} ${recipe.reveal} ${recipe.description}`,
          },
          {
            heading: 'code',
            content:
              'Copy the actual imports, state, cycle, handlers, content, sizing, geometry and row targets.',
          },
        ],
      },
    });
  if (new Set(indexes.map((index) => index.id)).size !== indexes.length)
    throw new Error('Duplicate documentation search identities');
  return indexes;
}

export const documentationSearch = createSearchAPI('advanced', {
  indexes: documentationIndexes,
  language: 'english',
});
