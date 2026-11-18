// Serves the preset fixture against the workspace build (packages/*/dist).
import { resolve } from 'node:path';
import { renderStatic } from '@dotquilt-internal/core/server';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { PresetFixture } from './react.js';
import { presets } from './shared.js';

const root = resolve(import.meta.dir, '../..');
const clients = new Map<string, string>();
for (const name of ['native.ts', 'react.tsx']) {
  const build = await Bun.build({
    entrypoints: [resolve(import.meta.dir, name)],
    format: 'esm',
    target: 'browser',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot build the preset client ${name}`);
  clients.set(
    `/${name.replace(/\.tsx?$/, '')}.js`,
    await build.outputs[0].text(),
  );
}
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
    const client = clients.get(url.pathname);
    if (client)
      return new Response(client, {
        headers: { 'content-type': 'text/javascript' },
      });
    const asset = /^\/(core|react)\/styles\/([\w-]+)\.css$/.exec(url.pathname);
    if (asset && assetNames.includes(asset[2] ?? ''))
      return new Response(
        Bun.file(resolve(root, `packages/${asset[1]}/dist/${asset[2]}.css`)),
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
      mode: 'external' as const,
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
      } as Parameters<typeof renderStatic>[0])
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
