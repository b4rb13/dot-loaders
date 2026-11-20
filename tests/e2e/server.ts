// Serves the e2e fixture against the workspace build (packages/*/dist).
// Run `bun run build` first; no packing or temp installs are involved.
import { resolve } from 'node:path';
import { LoadingRegion } from '@dotquilt/react/region';
import { SkeletonText } from '@dotquilt/react/skeleton';
import { renderStatic } from 'dotquilt/server';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

const port = Number(process.env.E2E_PORT ?? 4310);
// Bundled per request so a reused server always serves the current build.
async function fixtureScript() {
  const build = await Bun.build({
    entrypoints: [resolve(import.meta.dir, 'fixture.ts')],
    target: 'browser',
    format: 'esm',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Fixture build failed:\n${build.logs.join('\n')}`);
  return build.outputs[0].text();
}
await fixtureScript();

const css = `
:root { color-scheme: light; --bg: #ffffff; --fg: #18181b; }
:root[data-theme=dark] { color-scheme: dark; --bg: #111113; --fg: #ececee; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: var(--bg); color: var(--fg); font: 16px/1.4 system-ui, sans-serif; }
#stage { width: 360px; }
.unrelated { width: 40px; height: 8px; margin-top: 16px; background: currentColor; opacity: 0.2; }
.owner { width: 360px; min-height: 180px; }
[slot=placeholder] { width: 100%; height: 180px; }
dotquilt-skeleton-line, dotquilt-typing-dots { height: 1em; }
dotquilt-skeleton-circle { width: 64px; height: 64px; }
dotquilt-text-loader { font: 600 24px/1.2 ui-monospace, monospace; }
.card h2 { margin: 0 0 8px; font-size: 20px; }
.card p { margin: 0 0 12px; }
.chart { margin: 0; }
.chart svg { display: block; width: 100%; height: 160px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { height: 32px; padding: 0 8px; text-align: left; border-bottom: 1px solid color-mix(in srgb, var(--fg) 15%, transparent); }
`;

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/fixture.js')
      return new Response(await fixtureScript(), {
        headers: { 'content-type': 'text/javascript' },
      });
    // Server-rendered regions with no JavaScript at all.
    const staticPage = /^\/static\/(native|react)$/.exec(pathname);
    if (staticPage) {
      const query = new URL(request.url).searchParams;
      const state = query.get('state') ?? 'pending';
      const mark = query.get('mark') as 'dash' | 'square' | null;
      const shape = mark ? { mark } : {};
      const content =
        '<article class="card"><h2>Quarterly revenue</h2><p>Revenue grew 12%.</p><button type="button">Open report</button></article>';
      const markup =
        staticPage[1] === 'native'
          ? renderStatic({
              kind: 'region',
              state: state as 'pending' | 'ready',
              label: 'Example content',
              placeholder: { kind: 'skeleton-text', ...shape },
            }).replace('</dotquilt-region>', `${content}</dotquilt-region>`)
          : renderToString(
              h(
                LoadingRegion,
                {
                  state: state as 'pending' | 'ready',
                  'aria-label': 'Example content',
                  className: 'owner',
                  placeholder: h(SkeletonText, shape),
                },
                h(
                  'article',
                  { className: 'card' },
                  h('h2', null, 'Quarterly revenue'),
                  h('p', null, 'Revenue grew 12%.'),
                  h('button', { type: 'button' }, 'Open report'),
                ),
              ),
            );
      return new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Static region</title><style>${css}</style></head><body><button type="button">Before</button><main id="stage">${markup}</main><button type="button">After</button></body></html>`,
        { headers: { 'content-type': 'text/html' } },
      );
    }
    if (pathname === '/')
      return new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dotquilt e2e fixture</title><link rel="icon" href="data:,"><style>${css}</style></head><body><main id="stage"></main><div id="unrelated" class="unrelated"></div><script type="module" src="/fixture.js"></script></body></html>`,
        { headers: { 'content-type': 'text/html' } },
      );
    return new Response('not found', { status: 404 });
  },
});
console.log(`e2e fixture on http://127.0.0.1:${port}`);
