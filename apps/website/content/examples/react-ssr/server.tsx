import { createHash, randomBytes } from 'node:crypto';
import { regionStyles, skeletonStyles } from '@dotquilt-internal/core/server';
import {
  reactRegionStyles,
  reactSkeletonStyles,
} from '@dotquilt-internal/react/server';
import { renderToReadableStream } from 'react-dom/server';
import { Document, type Mode } from './src/Document';

const hashes = [
  ...new Set(
    [regionStyles, skeletonStyles, reactRegionStyles, reactSkeletonStyles]
      .flatMap((parts) => [...parts, parts.join('\n')])
      .map(
        (css) =>
          `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
      ),
  ),
].join(' ');
const assets = new Set([
  '/client.js',
  '/app.css',
  '/dotquilt/region.css',
  '/dotquilt/skeleton.css',
]);
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 4233),
  async fetch(request) {
    const url = new URL(request.url);
    if (assets.has(url.pathname)) {
      const file = Bun.file(
        new URL(`./public${url.pathname}`, import.meta.url),
      );
      return (await file.exists())
        ? new Response(file)
        : new Response('Not found', { status: 404 });
    }
    if (url.pathname !== '/') return new Response('Not found', { status: 404 });
    const state =
      url.searchParams.get('state') === 'pending' ? 'pending' : 'ready';
    const requested = url.searchParams.get('mode');
    const mode: Mode =
      requested === 'nonce' || requested === 'hash' ? requested : 'external';
    const nonce = randomBytes(24).toString('base64');
    const styleSources =
      mode === 'nonce' ? `'nonce-${nonce}'` : mode === 'hash' ? hashes : '';
    const csp = `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' ${styleSources}; style-src-attr 'none'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
    const stream = await renderToReadableStream(
      <Document state={state} mode={mode} nonce={nonce} />,
    );
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': csp,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
});
