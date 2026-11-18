export const integrationGuides = [
  { slug: 'react', label: 'React', examples: ['react-ssr'] },
  { slug: 'nextjs', label: 'Next.js App Router', examples: ['next-app'] },
  {
    slug: 'server-rendering',
    label: 'Server rendering',
    examples: ['react-ssr', 'next-app'],
  },
  {
    slug: 'csp',
    label: 'Content Security Policy',
    examples: ['react-ssr', 'next-app'],
  },
  {
    slug: 'semantic-projections',
    label: 'Semantic projections',
    examples: ['semantic-mixed'],
  },
  {
    slug: 'mixed-components',
    label: 'Mixed components',
    examples: ['semantic-mixed'],
  },
  {
    slug: 'providers',
    label: 'Geometry providers',
    examples: ['semantic-mixed'],
  },
] as const;
export type GuideSlug = (typeof integrationGuides)[number]['slug'];
export const integrationExamples = {
  'react-ssr': { label: 'React SSR + three CSP modes', port: 4233 },
  'next-app': { label: 'Next.js App Router + document CSP', port: 4234 },
  'semantic-mixed': { label: 'Semantic report · native and React', port: 4236 },
} as const;
export type IntegrationExample = keyof typeof integrationExamples;
