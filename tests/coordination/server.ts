import { resolve } from 'node:path';

// Serves the coordination fixture against the workspace build (packages/*/dist).
const root = resolve(import.meta.dir, '../..');
const build = await Bun.build({
  entrypoints: [resolve(root, 'tests/coordination/client.tsx')],
  format: 'esm',
  target: 'browser',
});
if (!build.success || !build.outputs[0])
  throw new Error('Cannot build the coordination client');
const client = await build.outputs[0].text();
Bun.serve({
  hostname: '127.0.0.1',
  port: 4201,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/favicon.svg')
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="#405047"/></svg>',
        { headers: { 'content-type': 'image/svg+xml' } },
      );
    if (path === '/client.js')
      return new Response(client, {
        headers: { 'content-type': 'text/javascript' },
      });
    if (/^\/styles\/[\w-]+\.css$/.test(path))
      return new Response(
        Bun.file(resolve(root, 'packages/core/dist', path.slice(8))),
        { headers: { 'content-type': 'text/css' } },
      );
    if (path === '/app.css')
      return new Response(
        'body{margin:16px;font:16px system-ui}#stage{width:320px;display:grid;gap:20px}dotquilt-region{display:grid;width:320px;position:relative}#parent,#parent-content{height:520px}#parent-ph{display:grid;gap:8px}#chart-region,#chart-content{height:130px}#table-region,#table-content{height:130px}dotquilt-chart-loader{display:block;width:280px;height:80px}dotquilt-table-loader{display:block;width:280px}dotquilt-text-loader{display:block;height:40px;font:24px monospace}dotquilt-skeleton-block,dotquilt-skeleton-line,dotquilt-skeleton-text{width:280px}#peer{height:80px}input{display:block}#row-a,#row-b{height:32px}',
        { headers: { 'content-type': 'text/css' } },
      );
    if (!['/native', '/react'].includes(path))
      return new Response('not found', { status: 404 });
    return new Response(
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>Private mixed and nested coordination</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/app.css"><body><div id="app"></div><script type="module" src="/client.js"></script></body></html>',
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy':
            "default-src 'none';script-src 'self';style-src 'self';style-src-attr 'none';img-src http://127.0.0.1:4201/favicon.svg;object-src 'none';base-uri 'none';require-trusted-types-for 'script'",
        },
      },
    );
  },
});
