import { expect, test } from 'bun:test';
import { catalog, parseCatalogQuery } from './catalog';
import {
  defaultSearchIntegration,
  searchIntegration,
  searchResultURL,
} from './docs-search';

test('search component links use the complete supported schema for each selected integration and preserve anchors', () => {
  for (const item of catalog)
    for (const integration of ['native', 'react'] as const) {
      const url = new URL(
        searchResultURL(`/docs/components/${item.slug}#api`, integration),
        'https://dotquilt.invalid',
      );
      expect(url.hash).toBe('#api');
      const parsed = parseCatalogQuery(url.search, item.slug);
      expect(parsed.notice).toBe('');
      expect(parsed.settings.integration).toBe(integration);
    }
  expect(searchResultURL('/docs/guides/react#hydrate', 'react')).toBe(
    '/docs/guides/react#hydrate',
  );
  expect(searchResultURL('/docs/components/text-loader#api', 'all')).toBe(
    '/docs/components/text-loader#api',
  );
});
test('search scope is bounded and result links stay within documentation', () => {
  for (const value of [null, 'unknown', 'React', 'native,react'])
    expect(searchIntegration(value)).toBe('all');
  expect(searchIntegration('native')).toBe('native');
  expect(searchIntegration('react')).toBe('react');
  for (const value of [
    'https://example.com/docs',
    '//example.com/docs',
    'javascript:alert(1)',
    '/playground',
    '/docsevil',
    'http://[',
  ])
    expect(searchResultURL(value, 'react')).toBe('/docs');
});

test('search defaults to the actual current component integration, including safe defaults for invalid links', () => {
  for (const item of catalog) {
    expect(defaultSearchIntegration(`/docs/components/${item.slug}`, '')).toBe(
      'react',
    );
    expect(
      defaultSearchIntegration(`/docs/components/${item.slug}`, 'bad=link'),
    ).toBe('react');
  }
  expect(defaultSearchIntegration('/docs/gallery/chart-scan', '')).toBe(
    'react',
  );
  expect(defaultSearchIntegration('/docs/guides/nextjs', '')).toBe('react');
  expect(defaultSearchIntegration('/docs/guides/server-rendering', '')).toBe(
    'all',
  );
  expect(defaultSearchIntegration('/docs/search', '')).toBe('all');
});
