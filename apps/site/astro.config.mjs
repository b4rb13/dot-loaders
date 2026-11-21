// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { codeTheme } from './src/code-theme.mjs';

export default defineConfig({
  // The production address: canonical links and the sitemap use it.
  site: 'https://dotquilt.dev',
  vite: {
    // Starlight's Tabs load satteri's native binary at render time. Bundled,
    // it can't find the binary under Bun's isolated installs, so keep it
    // external; the site depends on the same version Starlight resolves.
    // The same goes for resvg, which renders the social cards (src/lib/og.ts).
    ssr: { external: ['satteri', '@resvg/resvg-js'] },
  },
  integrations: [
    starlight({
      title: 'Dotquilt',
      description:
        'Skeleton loaders made of dots, for React, Vue, Svelte, Angular and plain HTML: they hold the shape of your content, then hand over to it.',
      // Head tags Starlight doesn't add: each page's social card, a link to
      // its Markdown copy, and JSON-LD.
      routeMiddleware: './src/routeData.ts',
      customCss: [
        // The fonts are served from the site itself (design/SPEC.md), so a
        // page makes no request to another origin and doesn't wait for one.
        '@fontsource/manrope/400.css',
        '@fontsource/manrope/500.css',
        '@fontsource/manrope/600.css',
        '@fontsource/manrope/700.css',
        '@fontsource/dm-mono/400.css',
        '@fontsource/dm-mono/500.css',
        './src/styles/theme.css',
        './src/styles/demos.css',
        './src/styles/home.css',
      ],
      components: {
        // The homepage's first screen, and the centred headline of other heroes.
        Hero: './src/components/home/Hero.astro',
        // The brand, main links and a seam of marks; and the site footer.
        Header: './src/components/site/Header.astro',
        Footer: './src/components/site/Footer.astro',
        // On docs pages, a "Copy page" button beside the title (Markdown).
        PageTitle: './src/components/site/PageTitle.astro',
      },
      expressiveCode: {
        themes: [codeTheme],
        styleOverrides: {
          // The spec's code blocks are dark in both themes, a shade apart.
          codeBackground: 'var(--dq-code-bg)',
          codeFontFamily: 'var(--dq-font-mono)',
          uiFontFamily: 'var(--dq-font)',
          borderColor: 'var(--dq-line)',
          borderRadius: 'var(--dq-radius-md)',
          frames: {
            editorTabBarBackground: 'var(--dq-code-bg)',
            editorActiveTabBackground: 'var(--dq-code-bg)',
            terminalTitlebarBackground: 'var(--dq-code-bg)',
            terminalBackground: 'var(--dq-code-bg)',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', slug: 'docs' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'AI assistant setup', slug: 'docs/ai-setup' },
            { label: 'Theming', slug: 'docs/theming' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Skeleton', slug: 'docs/components/skeleton' },
            { label: 'TextLoader', slug: 'docs/components/text-loader' },
            { label: 'ChartLoader', slug: 'docs/components/chart-loader' },
            { label: 'TableLoader', slug: 'docs/components/table-loader' },
            { label: 'TypingDots', slug: 'docs/components/typing-dots' },
            { label: 'LoadingRegion', slug: 'docs/components/loading-region' },
          ],
        },
        {
          label: 'Frameworks',
          items: [
            { label: 'React and Next.js', slug: 'docs/guides/react' },
            { label: 'Vue and Nuxt', slug: 'docs/guides/vue' },
            { label: 'Svelte and SvelteKit', slug: 'docs/guides/svelte' },
            { label: 'Angular', slug: 'docs/guides/angular' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Server rendering', slug: 'docs/guides/server-rendering' },
            { label: 'Content Security Policy', slug: 'docs/guides/csp' },
            {
              label: 'Custom animations',
              slug: 'docs/guides/custom-animations',
            },
            { label: 'Motion and accessibility', slug: 'docs/guides/motion' },
            {
              label: 'Skeleton loader or spinner?',
              slug: 'docs/guides/skeleton-or-spinner',
            },
          ],
        },
      ],
    }),
  ],
});
