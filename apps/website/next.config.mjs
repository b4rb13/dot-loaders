import { createMDX } from 'fumadocs-mdx/next';

// Match the same source under app-relative and monorepo-root bundler paths.
const withMDX = createMDX({ macro: { include: ['docs-source.ts'] } });

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};
export default withMDX(config);
