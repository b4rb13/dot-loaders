import { createHash } from 'node:crypto';
import { cp, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import * as nativeCss from '../../packages/core/dist/server.js';
import * as reactCss from '../../packages/react/dist/server.js';
import type { FixtureOptions } from './fixture';

const root = resolve(import.meta.dir, '../..');
const packed = await Bun.file(
  resolve(root, '.artifacts/m3/packed-react-report.json'),
).json();
const renderers = new Map<
  string,
  {
    render(options: FixtureOptions): string;
    stream(options: FixtureOptions): Promise<ReadableStream<Uint8Array>>;
  }
>();
const bundles = new Map<string, Uint8Array>();
for (const line of ['current', 'floor', 'minor1', 'minor2']) {
  const consumer = packed.consumers[line];
  for (const file of [
    'fixture.tsx',
    'catalog.tsx',
    'client.tsx',
    'ssr.tsx',
    'early.ts',
  ])
    await cp(resolve(import.meta.dir, file), resolve(consumer, file));
  renderers.set(line, await import(String(resolve(consumer, 'ssr.tsx'))));
  for (const entry of ['client', 'early']) {
    const build = await Bun.build({
      entrypoints: [
        resolve(consumer, `${entry}.${entry === 'early' ? 'ts' : 'tsx'}`),
      ],
      format: 'iife',
      target: 'browser',
      define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    });
    if (!build.success || !build.outputs[0])
      throw new Error('React fixture build failed');
    bundles.set(
      `${line}/${entry}`,
      new Uint8Array(await build.outputs[0].arrayBuffer()),
    );
  }
}
const hash = (css: string) =>
  `'sha256-${createHash('sha256').update(css).digest('base64')}'`;
const cssHashes = Object.values({ ...nativeCss, ...reactCss })
  .flatMap((value) =>
    Array.isArray(value) ? [...value, value.join('\n')] : [],
  )
  .map(hash)
  .join(' ');
const appCss =
  '#catalog-text.geometry-step{width:280.015625px}#catalog-text.typography-step{letter-spacing:.125px}#catalog{display:grid;grid-template-columns:repeat(3,280px);gap:16px}.catalog-owner{width:280px;height:180px}.catalog-surface{width:280px;height:160px}#catalog-circle{width:64px;height:64px}body{font:16px system-ui;margin:24px;color:#28352d}.fixture-region{width:420px;height:240px}.fixture-skeleton{width:420px;height:240px}#stateful-content{display:block;height:110px}input,button,a{font:inherit}#before,#after{height:24px;margin:12px 0}';
function csp(mode: string, nonce: string) {
  return `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' ${mode === 'nonce' ? `'nonce-${nonce}'` : mode === 'external' ? '' : cssHashes}; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-src 'self'`;
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4191,
  async fetch(request) {
    const url = new URL(request.url),
      line = ['floor', 'minor1', 'minor2'].includes(
        url.searchParams.get('line') ?? '',
      )
        ? (url.searchParams.get('line') as string)
        : 'current';
    if (url.pathname === '/app.css')
      return new Response(appCss, { headers: { 'Content-Type': 'text/css' } });
    if (url.pathname === '/snapshot.js')
      return new Response(
        await readFile(resolve(import.meta.dir, 'snapshot.js')),
        { headers: { 'Content-Type': 'text/javascript' } },
      );
    if (url.pathname === '/capture.js')
      return new Response(
        await readFile(resolve(import.meta.dir, 'capture.js')),
        { headers: { 'Content-Type': 'text/javascript' } },
      );
    if (url.pathname === '/client.js' || url.pathname === '/early.js')
      return new Response(
        bundles.get(`${line}/${url.pathname.slice(1, -3)}`)?.slice().buffer,
        { headers: { 'Content-Type': 'text/javascript' } },
      );
    if (url.pathname.startsWith('/pkg/')) {
      const [kind, ...segments] = url.pathname.slice(5).split('/');
      const directory = resolve(
          packed.consumers[line],
          `node_modules/@dotquilt-internal/${kind}`,
        ),
        file = resolve(directory, ...segments);
      if (!file.startsWith(directory + sep))
        return new Response('Not found', { status: 404 });
      return new Response(Bun.file(file), {
        headers: {
          'Content-Type': file.endsWith('.css')
            ? 'text/css'
            : 'text/javascript',
        },
      });
    }
    if (url.pathname === '/recovery')
      return new Response(
        '<!doctype html><h1>Account recovery</h1><p>Available without enhancement.</p>',
        { headers: { 'Content-Type': 'text/html' } },
      );
    const requestedMode = url.searchParams.get('mode');
    const requestedNonce = url.searchParams.get('nonce') ?? '';
    const options: FixtureOptions = {
      catalog: url.searchParams.has('catalog'),
      state:
        url.searchParams.get('state') === 'pending'
          ? 'pending'
          : url.searchParams.get('state') === 'refreshing'
            ? 'refreshing'
            : 'ready',
      mode:
        requestedMode === 'nonce' || requestedMode === 'external'
          ? requestedMode
          : 'hash',
      nonce: /^[A-Za-z0-9_-]{1,64}$/.test(requestedNonce)
        ? requestedNonce
        : 'react-fixture',
      skeletonOnly: url.searchParams.has('skeleton'),
      empty: url.searchParams.has('empty'),
    };
    const renderer = renderers.get(line);
    if (!renderer) return new Response('Missing renderer', { status: 500 });
    const early = url.searchParams.has('early')
      ? `<script src="/early.js?line=${line}"></script>`
      : '';
    const start = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Packed React integration</title><link rel="stylesheet" href="/app.css"><script src="/capture.js"></script>${early}</head><body><div id="root" data-catalog="${options.catalog ? 'yes' : 'no'}" data-state="${options.state}" data-mode="${options.mode}" nonce="${options.nonce}" data-skeleton="${options.skeletonOnly ? 'yes' : 'no'}" data-empty="${options.empty ? 'yes' : 'no'}">`;
    const end = `</div><script src="/snapshot.js"></script>${url.searchParams.has('fail') ? '<script src="/missing.js"></script>' : `<script src="/client.js?line=${line}" defer></script>`}</body></html>`;
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': csp(options.mode, options.nonce),
    };
    if (url.searchParams.has('nocsp'))
      delete headers['Content-Security-Policy'];
    if (url.pathname === '/missing.js')
      return new Response('Missing enhancement', { status: 404 });
    if (url.pathname === '/stream') {
      const body = await renderer.stream(options);
      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(start));
            for await (const chunk of body) controller.enqueue(chunk);
            controller.enqueue(encoder.encode(end));
            controller.close();
          },
        }),
        { headers },
      );
    }
    return new Response(start + renderer.render(options) + end, { headers });
  },
});
console.log(`Packed React fixtures listening on ${server.url}`);
