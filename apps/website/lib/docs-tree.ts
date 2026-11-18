import type { Root } from 'fumadocs-core/page-tree';
import { catalog } from './catalog';
import { integrationGuides } from './integration-guides';

export const docsTree: Root = {
  name: 'Documentation',
  children: [
    { type: 'separator', name: 'Getting started' },
    { type: 'page', name: 'Quickstart', url: '/docs' },
    { type: 'page', name: 'Loading and readiness', url: '/docs#readiness' },
    { type: 'page', name: 'Your first example', url: '/docs#example' },
    {
      type: 'page',
      name: 'Support and current limits',
      url: '/docs#boundaries',
    },
    { type: 'separator', name: 'Integration guides' },
    ...integrationGuides.map((guide) => ({
      type: 'page' as const,
      name: guide.label,
      url: `/docs/guides/${guide.slug}`,
    })),
    { type: 'separator', name: 'Components' },
    { type: 'page', name: 'Catalog overview', url: '/docs/components' },
    ...catalog.map((item) => ({
      type: 'page' as const,
      name: item.name,
      url: `/docs/components/${item.slug}`,
    })),
    { type: 'separator', name: 'Explore' },
    { type: 'page', name: 'Animation gallery', url: '/docs/gallery' },
    { type: 'page', name: 'Search and browse', url: '/docs/search' },
  ],
};
