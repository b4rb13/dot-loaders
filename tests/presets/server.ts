import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..'),
  output = resolve(root, '.artifacts/m4-presets');
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core');
const { renderStatic } = await import(resolve(core, 'dist/server.js'));
const { presets } = await import(resolve(consumer, 'presets/shared.ts'));
const { PresetFixture } = await import(resolve(consumer, 'presets/react.tsx'));
const { createElement: h } = await import(
  resolve(consumer, 'node_modules/react/index.js')
);
const { renderToString } = await import(
  resolve(consumer, 'node_modules/react-dom/server.bun.js')
);
const assetNames = [
  'skeleton',
  'line',
  'circle',
  'skeleton-text',
  'typing',
  'text',
  'chart',
  'table',
  'region',
];
Bun.serve({
  hostname: '127.0.0.1',
  port: 4198,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/native.js' || url.pathname === '/react.js')
      return new Response(Bun.file(resolve(output, url.pathname.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    const asset = /^\/(core|react)\/styles\/([\w-]+)\.css$/.exec(url.pathname);
    if (asset && assetNames.includes(asset[2] ?? ''))
      return new Response(
        Bun.file(
          resolve(
            consumer,
            `node_modules/@dotquilt-internal/${asset[1]}/dist/${asset[2]}.css`,
          ),
        ),
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname === '/app.css')
      return new Response(
        'body{font:16px system-ui;margin:16px}#stage{display:grid;gap:12px;width:320px}#placeholder{display:grid;gap:8px}dotquilt-region{width:320px}#region{display:block;position:relative;height:220px}#text{display:block;height:32px}dotquilt-skeleton-block,dotquilt-skeleton-line,dotquilt-skeleton-text{width:300px}dotquilt-chart-loader{width:300px;height:160px}dotquilt-text-loader{font:24px monospace}dotquilt-region:not(:defined)[state=pending]>input{visibility:hidden}',
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname !== '/native' && url.pathname !== '/react')
      return new Response('not found', { status: 404 });
    const policy = (asset: string) => ({
      mode: 'external',
      href: `/core/styles/${asset}.css`,
    });
    const decorative = (
      kind: string,
      asset: string,
      family: keyof typeof presets,
    ) =>
      renderStatic({
        kind,
        preset: presets[family],
        stylePolicy: policy(asset),
      })
        .replace('<dotquilt-', `<dotquilt-`)
        .replace(
          /^(<dotquilt-[\w-]+)/,
          `$1 id="${kind === 'typing-dots' ? 'typing' : kind === 'skeleton-text' ? 'multiline' : kind === 'chart-loader' ? 'chart' : kind === 'table-loader' ? 'table' : kind.slice(9)}"`,
        );
    const native = `<div id="stage"><dotquilt-region id="region" state="pending"><div id="placeholder" slot="placeholder">${[
      ['skeleton-block', 'skeleton'],
      ['skeleton-line', 'line'],
      ['skeleton-circle', 'circle'],
      ['skeleton-text', 'skeleton-text'],
    ]
      .map(([kind, asset]) =>
        decorative(kind as string, asset as string, 'skeleton'),
      )
      .join(
        '',
      )}${decorative('typing-dots', 'typing', 'typing')}</div><input id="value" value="original" aria-label="Value"></dotquilt-region>${renderStatic({ kind: 'text-loader', text: '42.50', mask: '00.00', state: 'pending', preset: presets.text, stylePolicy: policy('text') }).replace('<dotquilt-text-loader ', '<dotquilt-text-loader id="text" ')}${decorative('chart-loader', 'chart', 'chart')}${decorative('table-loader', 'table', 'table')}</div>`;
    const framework = url.pathname.slice(1),
      body = framework === 'native' ? native : renderToString(h(PresetFixture));
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private preset contract</title><link rel="stylesheet" href="/app.css"><body><div id="app">${body}</div>${url.searchParams.get('enhance') === '0' ? '' : `<script type="module" src="/${framework}.js"></script>`}</body></html>`,
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy':
            "default-src 'none';script-src 'self';style-src 'self';style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'",
        },
      },
    );
  },
});
