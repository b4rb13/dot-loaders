// Every page of the site, for checks that run on all of them.
export const components = [
  'skeleton',
  'text-loader',
  'chart-loader',
  'table-loader',
  'typing-dots',
  'loading-region',
];
const guides = [
  'react',
  'vue',
  'svelte',
  'angular',
  'server-rendering',
  'csp',
  'custom-animations',
  'motion',
];
export const pages = [
  '/',
  '/docs/',
  '/docs/installation/',
  '/docs/ai-setup/',
  '/docs/theming/',
  '/docs/stability/',
  '/docs/api/',
  '/docs/changelog/',
  '/license/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/pricing/',
  '/examples/',
  '/playground/',
  ...components.map((name) => `/docs/components/${name}/`),
  ...guides.map((name) => `/docs/guides/${name}/`),
];
