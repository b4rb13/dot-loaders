import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const output = resolve(root, '.artifacts/m4');
const consumer = (
  await readFile(resolve(output, 'consumer-path'), 'utf8')
).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core');
const react = resolve(consumer, 'node_modules/@dotquilt-internal/react');
const server = await import(resolve(core, 'dist/server.js'));
const reactServer = await import(resolve(react, 'dist/server.js'));
const { renderToString } = await import(
  resolve(consumer, 'node_modules/react-dom/server.bun.js')
);
const { createElement: h } = await import(
  resolve(consumer, 'node_modules/react/index.js')
);
const { ChartFixture } = await import(resolve(consumer, 'chart-react.tsx'));
const { TextFixture } = await import(resolve(consumer, 'text-react.tsx'));
const { Fixture } = await import(resolve(consumer, 'react.tsx'));
const css = Object.values(server)
  .filter(
    (value) =>
      Array.isArray(value) && value.every((item) => typeof item === 'string'),
  )
  .flat() as string[];
const reactCss = Object.values(reactServer)
  .filter((value) => Array.isArray(value))
  .flat() as string[];
const joinedReactCss = Object.values(reactServer)
  .filter((value): value is string[] => Array.isArray(value))
  .map((value) => value.join('\n'));
const hashes = [...new Set([...css, ...reactCss, ...joinedReactCss])]
  .map(
    (text) =>
      `'sha256-${new Bun.CryptoHasher('sha256').update(text).digest('base64')}'`,
  )
  .join(' ');
Bun.serve({
  hostname: '127.0.0.1',
  port: 4194,
  async fetch(request) {
    const url = new URL(request.url);
    if (
      url.pathname.endsWith('.js') &&
      [
        '/native.js',
        '/react.js',
        '/text.js',
        '/text-react.js',
        '/chart.js',
        '/chart-react.js',
      ].includes(url.pathname)
    )
      return new Response(Bun.file(resolve(output, url.pathname.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    const optional =
      /^\/chart-options-(firstParty|custom)-(root|family)-(native|react)-production\.js$/.exec(
        url.pathname,
      );
    if (optional)
      return new Response(Bun.file(resolve(output, url.pathname.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/chart-options-production') {
      const fixture =
          url.searchParams.get('fixture') === 'custom'
            ? 'custom'
            : 'firstParty',
        entry = url.searchParams.get('entry') === 'family' ? 'family' : 'root',
        framework =
          url.searchParams.get('framework') === 'react' ? 'react' : 'native';
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private complete ChartLoader closure</title><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/core/styles/chart.css"><link rel="stylesheet" href="/core/styles/region.css"><body><script type="module" src="/chart-options-${fixture}-${entry}-${framework}-production.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy': `default-src 'none';script-src 'self';style-src 'self' ${hashes};style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
          },
        },
      );
    }
    const production =
      /^\/chart-(root|family)-(native|react)-production\.js$/.exec(
        url.pathname,
      );
    if (production)
      return new Response(Bun.file(resolve(output, url.pathname.slice(1))), {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/chart-production') {
      const entry =
          url.searchParams.get('entry') === 'family' ? 'family' : 'root',
        framework =
          url.searchParams.get('framework') === 'react' ? 'react' : 'native';
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private optimized ChartLoader consumer</title><link rel="stylesheet" href="/app.css"><body><script type="module" src="/chart-${entry}-${framework}-production.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy':
              "default-src 'none';script-src 'self';style-src 'self' 'unsafe-inline';style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'",
          },
        },
      );
    }
    const asset =
      /^\/(core|react)\/styles\/(skeleton|skeleton-family|line|circle|skeleton-text|typing|region|text|chart)\.css$/.exec(
        url.pathname,
      );
    if (asset)
      return new Response(
        Bun.file(
          resolve(asset[1] === 'core' ? core : react, `dist/${asset[2]}.css`),
        ),
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname === '/recovery')
      return new Response(
        '<!doctype html><html lang="en"><h1>Current account</h1><p>Available through the application without enhancement.</p></html>',
        { headers: { 'content-type': 'text/html' } },
      );
    if (url.pathname === '/app.css')
      return new Response(
        'html{font-size:16px}#chart.relative-dots{--dotquilt-dot-size:.25rem;--dotquilt-dot-gap:calc(.125rem + 1px)}#chart.pixel-dots{--dotquilt-dot-size:4px;--dotquilt-dot-gap:3px}dotquilt-chart-loader{width:320px;height:200px}#chart-content{width:320px;height:200px}#chart-region{width:320px}#chart-content svg{width:320px;height:200px}dotquilt-text-loader{font:32px ui-monospace,monospace}body{font:16px system-ui;margin:24px;color:#405047}#stage{width:320px}.line,.block{width:320px}.multiline{width:320px}dotquilt-region{width:320px}#placeholder{display:grid;gap:16px}#outside{display:grid;gap:16px;margin:20px 0}input{font:inherit}#before,#after{height:20px}#app{display:grid;gap:16px;width:320px}dotquilt-region:not(:defined){display:grid;position:relative}dotquilt-region:not(:defined)>#placeholder,dotquilt-region:not(:defined)>#value{grid-area:1/1}dotquilt-region:not(:defined)[state=pending]>#value,dotquilt-region:not(:defined)[state=pending]>#chart-content{visibility:hidden}',
        { headers: { 'content-type': 'text/css' } },
      );
    if (
      ![
        '/native',
        '/react',
        '/text',
        '/text-react',
        '/chart',
        '/chart-react',
      ].includes(url.pathname)
    )
      return new Response('not found', { status: 404 });
    const mode = url.searchParams.get('mode') ?? 'inline';
    const style = mode.startsWith('external')
      ? "'self'"
      : mode === 'nonce'
        ? "'self' 'nonce-m4-fixture'"
        : mode === 'hash'
          ? `'self' ${hashes}`
          : "'self' 'unsafe-inline'";
    const policy = (name: string) =>
      mode.startsWith('external')
        ? {
            mode: 'external',
            href: `/core/styles/${mode === 'external-family' && name !== 'region' && name !== 'typing' && name !== 'text' && name !== 'chart' ? 'skeleton-family' : name}.css`,
          }
        : {
            mode: 'inline',
            ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
          };
    const surface = (kind: string, id: string, name: string, extra = {}) =>
      server
        .renderStatic({ kind, stylePolicy: policy(name), ...extra })
        .replace(
          /^(<[^ >]+)/,
          `$1 id="${id}" data-host data-css="${name}" class="${id === 'multiline' ? 'multiline' : name}"`,
        );
    const native = `<div id="stage"><dotquilt-region id="region" data-host data-css="region" state="pending">${mode.startsWith('external') ? '<link rel="stylesheet" href="/core/styles/region.css">' : server.regionStyles.map((text: string) => `<style${mode === 'nonce' ? ' nonce="m4-fixture"' : ''}>${text}</style>`).join('')}<div slot="placeholder" id="placeholder">${surface('skeleton-block', 'block', 'skeleton')}${surface('skeleton-line', 'line', 'line')}${surface('skeleton-circle', 'circle', 'circle')}${surface('skeleton-text', 'multiline', 'skeleton-text', { lines: 4, widths: [0.8, 0.4] })}${surface('typing-dots', 'typing', 'typing')}</div><input id="value" value="kept"></dotquilt-region><a id="recovery" href="/recovery">Open the current account</a><div id="outside">${surface('typing-dots', 'standalone', 'typing')}</div></div>`;
    const chartVariant = url.searchParams.get('variant') ?? 'line';
    const chartMarks =
      chartVariant === 'bar'
        ? [
            [20, 80, 55, 100],
            [110, 40, 55, 140],
            [200, 100, 55, 80],
          ]
            .map(
              ([x, y, width, height]) =>
                `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="currentColor"/>`,
            )
            .join('')
        : chartVariant === 'scatter'
          ? [
              [50, 60],
              [130, 120],
              [240, 40],
            ]
              .map(
                ([x, y]) =>
                  `<circle cx="${x}" cy="${y}" r="4" fill="currentColor"/>`,
              )
              .join('')
          : '<path d="M0 130 L80 40 L160 90 L240 30 L320 70" fill="none" stroke="currentColor" stroke-width="2"/>';
    const chartContent = `<div id="chart-content" aria-hidden="true" inert><svg viewBox="0 0 320 200" role="img" aria-label="Application ${chartVariant} chart">${chartMarks}</svg><button id="chart-control" type="button">Chart details</button></div>`;
    const chartNative = `<dotquilt-region id="chart-region" state="pending">${mode.startsWith('external') ? '<link rel="stylesheet" href="/core/styles/region.css">' : server.regionStyles.map((text: string) => `<style${mode === 'nonce' ? ' nonce="m4-fixture"' : ''}>${text}</style>`).join('')}<div slot="placeholder">${surface('chart-loader', 'chart', 'chart', { variant: url.searchParams.get('variant') ?? 'line' })}</div>${chartContent}</dotquilt-region>`;
    const content =
      url.pathname === '/chart'
        ? chartNative
        : url.pathname === '/chart-react'
          ? `<div id="app">${renderToString(h(ChartFixture, { mode, variant: url.searchParams.get('variant') ?? 'line' }))}</div>`
          : url.pathname === '/text'
            ? server
                .renderStatic({
                  kind: 'text-loader',
                  text: '$128,450',
                  mask: '$000,000',
                  state: 'pending',
                  stylePolicy: policy('text'),
                })
                .replace(
                  '<dotquilt-text-loader',
                  '<dotquilt-text-loader id="text"',
                )
            : url.pathname === '/text-react'
              ? `<div id="app">${renderToString(h(TextFixture, { mode }))}</div>`
              : url.pathname === '/native'
                ? native
                : `<div id="app">${renderToString(h(Fixture, { mode }))}</div>`;
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private M4 catalog fixture</title><link rel="stylesheet" href="/app.css"><div id="before">Before</div>${content}<div id="after">After</div>${url.searchParams.get('enhance') === '0' ? '' : `<script type="module" src="${url.pathname}.js"></script>`}</html>`,
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy': `default-src 'none'; script-src 'self'; style-src ${style}; style-src-attr 'none'; object-src 'none'; base-uri 'none'; require-trusted-types-for 'script'`,
        },
      },
    );
  },
});
