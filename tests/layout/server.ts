import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type Profile, policy, profiles, sourceProps } from './scene';

const root = resolve(import.meta.dir, '../..');
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core/dist');
const { renderStatic } = await import(resolve(core, 'server.js'));
const { createElement: h } = await import(
  resolve(consumer, 'node_modules/react/index.js')
);
const { renderToString } = await import(
  resolve(consumer, 'node_modules/react-dom/server.js')
);
const { Scene } = await import(resolve(consumer, 'layout/scene.tsx'));
Bun.serve({
  hostname: '127.0.0.1',
  port: 4207,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico')
      return new Response(null, { status: 204 });
    if (url.pathname === '/client.js')
      return new Response(
        Bun.file(resolve(root, '.artifacts/m4-layout/client.js')),
        { headers: { 'content-type': 'text/javascript' } },
      );
    if (url.pathname === '/app.css')
      return new Response(Bun.file(resolve(root, 'tests/layout/app.css')), {
        headers: { 'content-type': 'text/css' },
      });
    const sheet = /^\/(react-)?styles\/([a-z-]+)\.css$/.exec(url.pathname);
    if (sheet)
      return new Response(
        Bun.file(
          resolve(
            sheet[1]
              ? resolve(consumer, 'node_modules/@dotquilt-internal/react/dist')
              : core,
            `${sheet[2]}.css`,
          ),
        ),
        {
          headers: { 'content-type': 'text/css' },
        },
      );
    const name = url.searchParams.get('profile') ?? 'block';
    if (!(name in profiles))
      return new Response('Invalid profile', { status: 400 });
    const profile = name as Profile,
      p = profiles[profile],
      mode = url.searchParams.get('mode') ?? 'external';
    if (url.pathname === '/reservation.css')
      return new Response(`#stage{--reserve:${p.height}px}`, {
        headers: { 'content-type': 'text/css' },
      });
    let markup: string;
    if (url.pathname === '/react')
      markup = renderToString(
        h(Scene, {
          profile,
          mode,
          state:
            url.searchParams.get('state') === 'ready' ? 'ready' : 'pending',
        }),
      );
    else {
      const source = renderStatic({
        kind: p.kind,
        ...sourceProps(profile),
        ...('text' in p
          ? {
              text: p.text,
              state:
                url.searchParams.get('state') === 'ready' ? 'ready' : 'pending',
            }
          : {}),
        stylePolicy: policy(p.family, mode),
      }).replace(
        /^(<[^ >]+)/,
        `$1 id="${'text' in p ? 'owner' : 'source'}" class="source"`,
      );
      markup =
        'text' in p
          ? source
          : `<dotquilt-region id="owner" state="${url.searchParams.get('state') === 'ready' ? 'ready' : 'pending'}"><div slot="placeholder" aria-hidden="true" inert>${source}</div><div id="content"><input id="value" aria-label="Retained value" value="retained"><p>Application content</p></div></dotquilt-region>`;
    }
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Private reserved layout</title><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/reservation.css?profile=${profile}"><body class="${url.searchParams.has('inline') ? 'inline' : ''}"><main id="stage"><p id="before">Before</p><div id="root">${markup}</div><p id="after">After</p></main><script type="module" src="/client.js"></script></body></html>`,
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy':
            "default-src 'none';script-src 'self';style-src 'self' 'nonce-layout-fixture';style-src-attr 'none';img-src 'self';object-src 'none';base-uri 'none';require-trusted-types-for 'script'",
        },
      },
    );
  },
});
