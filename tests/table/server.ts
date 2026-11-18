import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..'),
  output = resolve(root, '.artifacts/m4'),
  consumer = (await readFile(resolve(output, 'consumer-path'), 'utf8')).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core'),
  react = resolve(consumer, 'node_modules/@dotquilt-internal/react');
const server = await import(resolve(core, 'dist/server.js')),
  reactServer = await import(resolve(react, 'dist/server.js'));
const { renderToString } = await import(
    resolve(consumer, 'node_modules/react-dom/server.bun.js')
  ),
  { createElement: h } = await import(
    resolve(consumer, 'node_modules/react/index.js')
  );
const { TableFixture } = await import(resolve(consumer, 'table-react.tsx'));
const css = [...Object.values(server), ...Object.values(reactServer)]
  .filter(Array.isArray)
  .flat() as string[];
const hashes = [
  ...new Set([
    ...css,
    ...Object.values(reactServer)
      .filter(Array.isArray)
      .map((v) => v.join('\n')),
  ]),
]
  .map(
    (s) =>
      `'sha256-${new Bun.CryptoHasher('sha256').update(s).digest('base64')}'`,
  )
  .join(' ');
const appCSS =
  'body{font:16px ui-monospace,monospace;color:#435348;margin:24px}#table-region,#table,#table-content{width:400px}#table-content{border-collapse:collapse;table-layout:fixed;height:160px}td{padding:0 8px;width:25%;height:32px}#table-region:not(:defined)>#table-content{visibility:hidden}#table-region:not(:defined){position:relative;display:block}#table-region:not(:defined)>[slot=placeholder]{position:absolute;inset:0}#table.relative{--dotquilt-dot-size:.25rem;--dotquilt-dot-gap:calc(.125rem + 1px)}#table.pixels{--dotquilt-dot-size:4px;--dotquilt-dot-gap:3px}';
Bun.serve({
  hostname: '127.0.0.1',
  port: 4197,
  async fetch(req) {
    const url = new URL(req.url),
      path = url.pathname;
    if (['/table.js', '/table-react.js'].includes(path))
      return new Response(Bun.file(resolve(output, path.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    const asset = /^\/(core|react)\/(table|region)\.css$/.exec(path);
    if (asset)
      return new Response(
        Bun.file(
          resolve(asset[1] === 'core' ? core : react, `dist/${asset[2]}.css`),
        ),
        { headers: { 'content-type': 'text/css' } },
      );
    if (path === '/app.css')
      return new Response(appCSS, { headers: { 'content-type': 'text/css' } });
    if (
      /^\/table-options-(firstParty|custom)-(root|family)-(native|react)-production\.js$/.test(
        path,
      )
    )
      return new Response(Bun.file(resolve(output, path.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    if (/^\/table-(root|family)-(native|react)-production\.js$/.test(path))
      return new Response(Bun.file(resolve(output, path.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    if (path === '/production') {
      const entry =
          url.searchParams.get('entry') === 'family' ? 'family' : 'root',
        framework =
          url.searchParams.get('framework') === 'react' ? 'react' : 'native';
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private default TableLoader closure</title><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/core/table.css"><link rel="stylesheet" href="/core/region.css"><body><script type="module" src="/table-${entry}-${framework}-production.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy': `default-src 'none';script-src 'self';style-src 'self' ${hashes};style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
          },
        },
      );
    }
    if (path === '/options') {
      const fixture =
          url.searchParams.get('fixture') === 'custom'
            ? 'custom'
            : 'firstParty',
        entry = url.searchParams.get('entry') === 'family' ? 'family' : 'root',
        framework =
          url.searchParams.get('framework') === 'react' ? 'react' : 'native';
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private complete table closure</title><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/core/table.css"><link rel="stylesheet" href="/core/region.css"><body><script type="module" src="/table-options-${fixture}-${entry}-${framework}-production.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy': `default-src 'none';script-src 'self';style-src 'self' ${hashes};style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
          },
        },
      );
    }
    if (path === '/recovery')
      return new Response(
        '<!doctype html><html lang="en"><h1>Current table</h1><p>Ada: 0, New, 2026</p></html>',
        { headers: { 'content-type': 'text/html' } },
      );
    if (path !== '/table' && path !== '/react')
      return new Response('not found', { status: 404 });
    const mode = url.searchParams.get('mode') ?? 'inline',
      policy = (name: string) =>
        mode === 'external'
          ? { mode: 'external', href: `/core/${name}.css` }
          : {
              mode: 'inline',
              ...(mode === 'nonce' ? { nonce: 'table-fixture' } : {}),
            };
    const rows = [
      ['Ada', '0', 'New', '2026'],
      ['Lin', '42', 'Paid', '2027'],
      ['Sam', '7', 'Open', '2028'],
      ['Max', '16', 'Due', '2029'],
      ['Eli', '3', 'Done', '2030'],
    ];
    const placeholder = server
      .renderStatic({ kind: 'table-loader', stylePolicy: policy('table') })
      .replace(
        '<dotquilt-table-loader',
        '<dotquilt-table-loader id="table" slot="placeholder"',
      );
    const native = `<dotquilt-region id="table-region" state="pending">${placeholder}<table id="table-content"><tbody>${rows.map((row, i) => `<tr id="row-${i}">${row.map((t) => `<td>${t}</td>`).join('')}</tr>`).join('')}</tbody></table></dotquilt-region>`;
    const content =
      path === '/react'
        ? `<div id="app">${renderToString(h(TableFixture, { mode }))}</div>`
        : native;
    const style =
      mode === 'external'
        ? "'self'"
        : mode === 'nonce'
          ? "'self' 'nonce-table-fixture'"
          : mode === 'hash'
            ? `'self' ${hashes}`
            : "'self' 'unsafe-inline'";
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private TableLoader fixture</title><link rel="stylesheet" href="/app.css"><body><div id="before">Before</div>${content}<a id="table-recovery" href="/recovery">Open the current table without enhancement</a><div id="after">After</div><section id="table-controls" aria-label="Private motion review"><p>Private implementation fixture · simulated request: 700 ms. System motion preferences apply.</p><label>Idle <select id="table-idle" disabled><option value="typeOn">Type on</option><option value="tableShimmer">Shimmer</option></select></label> <label>Cells <select id="table-style" disabled>${['auto', 'text', 'number', 'badge', 'date', 'badge-text', 'text-badge'].map((style) => `<option value="${style}">${style}</option>`).join('')}</select></label> <button id="table-replay" type="button" disabled>Play loading → content</button> <button id="table-pause" type="button" aria-pressed="false" disabled>Pause motion</button></section>${url.searchParams.get('enhance') === '0' ? '' : `<script type="module" src="/${path === '/react' ? 'table-react' : 'table'}.js"></script>`}</body></html>`,
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy': `default-src 'none';script-src 'self';style-src ${style};style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
        },
      },
    );
  },
});
