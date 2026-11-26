import { getCollection } from 'astro:content';
import {
  defineRouteMiddleware,
  type StarlightRouteData,
} from '@astrojs/starlight/route-data';
import core from '../../../packages/core/package.json';
import { cardAlt, cardUrl, hasCard } from './lib/cards';
import { repository } from './lib/github';
import { markdownPath, pagePath } from './lib/markdown';
import { card } from './lib/og';

/**
 * Head tags Starlight doesn't add on its own:
 * - every page: its own social card (`og:image` and `twitter:image`, with
 *   type, size and alt; see lib/cards.ts), a complete Twitter card ahead of
 *   the Open Graph tags, and a link to its Markdown copy;
 * - the home page: `og:type` website (Starlight says article), and JSON-LD
 *   describing the site and Dotquilt, with the version that is on npm;
 * - docs pages: JSON-LD breadcrumbs and a TechArticle;
 * - the 404 page: noindex, and no canonical (there's no page to point to).
 */
const site = 'https://dotquilt.dev';

const ids = {
  website: `${site}/#website`,
  software: `${site}/#software`,
  source: `${site}/#source`,
};

const website = {
  '@type': 'WebSite',
  '@id': ids.website,
  url: `${site}/`,
  name: 'Dotquilt',
  description:
    'Documentation and examples for Dotquilt, skeleton loaders made of dots for React, Vue, Svelte, Angular and plain HTML.',
  inLanguage: 'en',
};

const software = {
  '@type': 'SoftwareApplication',
  '@id': ids.software,
  name: 'Dotquilt',
  alternateName: 'dotquilt',
  description:
    'Skeleton loaders for the web that hold the shape of your content while it loads, then hand over to it. Native Web Components with no runtime dependencies, and components for React, Vue, Svelte and Angular with server rendering.',
  url: `${site}/`,
  image: `${site}/og.png`,
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'UI component library',
  operatingSystem: 'Any',
  softwareVersion: core.version,
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  keywords:
    'skeleton loader, skeleton screen, loading placeholders, loading states, web components, React, Vue, Svelte, Angular',
  featureList: [
    'Skeleton placeholders for text, images and avatars',
    'TextLoader for numbers and short labels',
    'ChartLoader for line, bar and scatter charts',
    'TableLoader for table rows',
    'TypingDots, a typing indicator for replies being written',
    'LoadingRegion with pending, refreshing and ready states',
    'Server rendering, strict CSP and reduced motion support',
  ],
  downloadUrl: 'https://www.npmjs.com/package/dotquilt',
  softwareHelp: `${site}/docs/`,
  sameAs: [
    repository,
    'https://www.npmjs.com/package/dotquilt',
    'https://www.npmjs.com/package/@dotquilt/react',
    'https://www.npmjs.com/package/@dotquilt/vue',
    'https://www.npmjs.com/package/@dotquilt/svelte',
    'https://www.npmjs.com/package/@dotquilt/angular',
  ],
};

const source = {
  '@type': 'SoftwareSourceCode',
  '@id': ids.source,
  name: 'Dotquilt',
  codeRepository: repository,
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'Web browsers',
  license: 'https://opensource.org/licenses/MIT',
  targetProduct: { '@id': ids.software },
};

type Head = StarlightRouteData['head'];

const metaName = (tag: Head[number], key: 'property' | 'name') =>
  tag.tag === 'meta' && typeof tag.attrs?.[key] === 'string'
    ? tag.attrs[key]
    : undefined;

/**
 * Makes the Twitter card complete and puts it before the Open Graph tags.
 *
 * Slack's guide to unfurling says it uses whichever of the two sets comes
 * first in the page, and that a `summary_large_image` card gets the largest
 * image. Starlight writes the Open Graph tags first and only `twitter:card`
 * of the Twitter set, and Slack showed the card as a cropped thumbnail. This
 * is the order GitHub's pages use, whose cards Slack shows large.
 */
function twitterCardFirst(head: Head) {
  const og = (name: string) =>
    head.find((tag) => metaName(tag, 'property') === name)?.attrs?.content;
  const twitter = (name: string) =>
    head.find((tag) => metaName(tag, 'name') === name)?.attrs?.content;
  const card: Record<string, string | boolean | undefined> = {
    'twitter:card': 'summary_large_image',
    'twitter:title': og('og:title'),
    'twitter:description': og('og:description'),
    'twitter:image': twitter('twitter:image'),
    'twitter:image:alt': twitter('twitter:image:alt'),
  };
  const tags: Head = Object.entries(card)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, content]) => ({ tag: 'meta', attrs: { name, content } }));
  const rest = head.filter(
    (tag) => !metaName(tag, 'name')?.startsWith('twitter:'),
  );
  const first = rest.findIndex((tag) =>
    metaName(tag, 'property')?.startsWith('og:'),
  );
  rest.splice(first < 0 ? rest.length : first, 0, ...tags);
  head.splice(0, head.length, ...rest);
}

/** A page's id in the docs collection, from its address: `/` is `index`. */
const pageId = (pathname: string) =>
  pathname.replace(/^\/|\/$/g, '').replace(/\.html$/, '') || 'index';

export const onRequest = defineRouteMiddleware(async (context) => {
  const { head } = context.locals.starlightRoute;
  const id = pageId(context.url.pathname);
  const entry = (await getCollection('docs', (page) => page.id === id))[0];
  const meta = (key: 'property' | 'name', name: string, content: string) =>
    head.push({ tag: 'meta', attrs: { [key]: name, content } });
  const json = (data: object) =>
    head.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      content: JSON.stringify({ '@context': 'https://schema.org', ...data }),
    });

  // Pages outside the collection (the license page) and the 404 show the
  // home page's card.
  const own = entry && hasCard(id) ? entry : undefined;
  const shown =
    own ?? (await getCollection('docs', (page) => page.id === 'index'))[0];
  if (shown) {
    const image = cardUrl(shown);
    const alt = cardAlt(shown);
    meta('property', 'og:image', image);
    meta('property', 'og:image:secure_url', image);
    meta('property', 'og:image:type', card.type);
    meta('property', 'og:image:width', String(card.width));
    meta('property', 'og:image:height', String(card.height));
    meta('property', 'og:image:alt', alt);
    meta('name', 'twitter:image', image);
    meta('name', 'twitter:image:alt', alt);
  }
  twitterCardFirst(head);

  if (id === '404') {
    // A 404 has no address of its own to be canonical for.
    const canonical = head.findIndex(
      (tag) => tag.tag === 'link' && tag.attrs?.rel === 'canonical',
    );
    if (canonical >= 0) head.splice(canonical, 1);
    meta('name', 'robots', 'noindex');
    return;
  }
  if (!own) return;

  // The same page as Markdown, for agents (see middleware.ts).
  head.push({
    tag: 'link',
    attrs: {
      rel: 'alternate',
      type: 'text/markdown',
      href: `${site}${markdownPath(id)}`,
    },
  });

  if (id === 'index') {
    const type = head.find(
      (tag) => tag.tag === 'meta' && tag.attrs?.property === 'og:type',
    );
    if (type?.attrs) type.attrs.content = 'website';
    json({ '@graph': [website, software, source] });
    return;
  }

  if (id === 'docs' || id.startsWith('docs/')) {
    const { data } = own;
    const url = `${site}${pagePath(id)}`;
    const crumbs = [
      { name: 'Home', item: `${site}/` },
      ...(id === 'docs'
        ? [{ name: 'Docs' }]
        : [{ name: 'Docs', item: `${site}/docs/` }, { name: data.title }]),
    ];
    json({
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            ...crumb,
          })),
        },
        {
          '@type': 'TechArticle',
          headline: data.title,
          ...(data.description ? { description: data.description } : {}),
          url,
          inLanguage: 'en',
          isPartOf: {
            '@id': ids.website,
            '@type': 'WebSite',
            name: 'Dotquilt',
          },
          about: {
            '@id': ids.software,
            '@type': 'SoftwareApplication',
            name: 'Dotquilt',
          },
        },
      ],
    });
  }
});
