import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import core from '../../../packages/core/package.json';
import { repository } from './lib/github';

/**
 * Head tags Starlight doesn't add on its own:
 * - every page: a social card image (`og:image`, `twitter:image`);
 * - the home page: `og:type` website (Starlight says article), and JSON-LD
 *   describing Dotquilt as a SoftwareApplication, with the version that is
 *   on npm, so agents and search engines can read what it is.
 */
const site = 'https://dotquilt.dev';
const image = {
  url: `${site}/og.png`,
  width: '1200',
  height: '630',
  alt: 'Dotquilt: a revenue screen whose figures, chart line and table rows hand over from placeholder marks.',
};

const application = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dotquilt',
  alternateName: 'dotquilt',
  description:
    'Loading placeholders for the web that hold the shape of your content while it loads, then hand over to it. Native Web Components with no runtime dependencies, and React 19 components with server rendering.',
  url: `${site}/`,
  image: image.url,
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'UI component library',
  operatingSystem: 'Any (runs in web browsers)',
  softwareVersion: core.version,
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  keywords:
    'loading placeholders, skeleton loader, loading states, web components, React components',
  featureList: [
    'Skeleton placeholders for text, images and avatars',
    'TextLoader for numbers and short labels',
    'ChartLoader that glides onto the real chart',
    'TableLoader for table rows',
    'TypingDots for replies being written',
    'LoadingRegion with pending, refreshing and ready states',
    'Server rendering, strict CSP and reduced motion support',
  ],
  downloadUrl: 'https://www.npmjs.com/package/dotquilt',
  softwareHelp: `${site}/docs/`,
  sameAs: [
    repository,
    'https://www.npmjs.com/package/dotquilt',
    'https://www.npmjs.com/package/@dotquilt/react',
  ],
};

export const onRequest = defineRouteMiddleware((context) => {
  const { head } = context.locals.starlightRoute;
  const meta = (key: 'property' | 'name', name: string, content: string) =>
    head.push({ tag: 'meta', attrs: { [key]: name, content } });
  meta('property', 'og:image', image.url);
  meta('property', 'og:image:width', image.width);
  meta('property', 'og:image:height', image.height);
  meta('property', 'og:image:alt', image.alt);
  meta('name', 'twitter:image', image.url);
  if (context.url.pathname !== '/') return;
  const type = head.find(
    (entry) => entry.tag === 'meta' && entry.attrs?.property === 'og:type',
  );
  if (type?.attrs) type.attrs.content = 'website';
  head.push({
    tag: 'script',
    attrs: { type: 'application/ld+json' },
    content: JSON.stringify(application),
  });
});
