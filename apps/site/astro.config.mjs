// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { codeTheme } from './src/code-theme.mjs';

// Google Fonts are the site's only external dependency (design/SPEC.md).
const fonts =
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400..700&display=swap';

export default defineConfig({
  // The production address: canonical links and the sitemap use it.
  site: 'https://dotquilt.dev',
  vite: {
    // Starlight's Tabs load satteri's native binary at render time. Bundled,
    // it can't find the binary under Bun's isolated installs, so keep it
    // external; the site depends on the same version Starlight resolves.
    ssr: { external: ['satteri'] },
  },
  integrations: [
    starlight({
      title: 'Dotquilt',
      description:
        'Dot-based loading placeholders that hand off gently to your real content.',
      customCss: [
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
      head: [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
        { tag: 'link', attrs: { rel: 'stylesheet', href: fonts } },
      ],
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
          label: 'Guides',
          items: [
            { label: 'React and Next.js', slug: 'docs/guides/react' },
            { label: 'Server rendering', slug: 'docs/guides/server-rendering' },
            { label: 'Content Security Policy', slug: 'docs/guides/csp' },
            {
              label: 'Custom animations',
              slug: 'docs/guides/custom-animations',
            },
            { label: 'Motion and accessibility', slug: 'docs/guides/motion' },
          ],
        },
      ],
    }),
  ],
});
