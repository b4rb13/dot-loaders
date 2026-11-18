import {
  catalogDefaults,
  catalogQuery,
  findComponent,
  parseCatalogQuery,
} from './catalog';
import { previewVersion } from './example';

export type SearchIntegration = 'all' | 'native' | 'react';
export const searchIndexURL = `/docs/search-index?version=${previewVersion}`;
export const searchQueryLimit = 160;

export function searchIntegration(value: string | null): SearchIntegration {
  return value === 'native' || value === 'react' ? value : 'all';
}
export function searchResultURL(value: string, integration: SearchIntegration) {
  let url: URL;
  try {
    url = new URL(value, 'https://dotquilt.invalid');
  } catch {
    return '/docs';
  }
  if (
    url.origin !== 'https://dotquilt.invalid' ||
    !/^\/docs(?:\/|$)/.test(url.pathname)
  )
    return '/docs';
  const component = /^\/docs\/components\/([^/]+)$/.exec(url.pathname)?.[1];
  const model = component ? findComponent(component) : undefined;
  if (integration !== 'all' && model)
    url.search = catalogQuery({ ...catalogDefaults(model.slug), integration });
  return url.pathname + url.search + url.hash;
}

export function defaultSearchIntegration(
  pathname: string,
  search: string,
): SearchIntegration {
  const slug = /^\/docs\/components\/([^/]+)$/.exec(pathname)?.[1];
  const model = slug ? findComponent(slug) : undefined;
  if (model) return parseCatalogQuery(search, model.slug).settings.integration;
  return pathname.startsWith('/docs/gallery') ||
    /^\/docs\/guides\/(react|nextjs)$/.test(pathname)
    ? 'react'
    : 'all';
}
