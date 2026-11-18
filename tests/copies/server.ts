import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core/dist');
const { createElement: h } = (await import(
  resolve(consumer, 'node_modules/react/index.js')
)) as typeof import('react');
const { renderToString } = (await import(
  resolve(consumer, 'node_modules/react-dom/server.js')
)) as typeof import('react-dom/server');
const { Scene, initial } = (await import(
  resolve(consumer, 'copies/scene.tsx')
)) as typeof import('./scene');
Bun.serve({
  hostname: '127.0.0.1',
  port: 4206,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico')
      return new Response(null, { status: 204 });
    const module = /^\/copy-(one|two)\/(.+\.js)$/.exec(url.pathname);
    if (module) {
      const path = resolve(core, module[2] as string);
      if (!path.startsWith(core + sep))
        return new Response('Forbidden', { status: 403 });
      return new Response(Bun.file(path), {
        headers: { 'content-type': 'text/javascript' },
      });
    }
    if (url.pathname === '/client.js')
      return new Response(
        Bun.file(resolve(root, '.artifacts/m4-copies/client.js')),
        { headers: { 'content-type': 'text/javascript' } },
      );
    if (url.pathname === '/app.css')
      return new Response(Bun.file(resolve(root, 'tests/copies/app.css')), {
        headers: { 'content-type': 'text/css' },
      });
    const style = /^\/styles\/([a-z-]+)\.css$/.exec(url.pathname);
    if (style)
      return new Response(Bun.file(resolve(core, `${style[1]}.css`)), {
        headers: { 'content-type': 'text/css' },
      });
    const family = url.searchParams.get('family') ?? 'chart';
    if (!['skeleton', 'region', 'text', 'chart', 'table'].includes(family))
      return new Response('Invalid family', { status: 400 });
    const model = initial(family as import('./scene').Family);
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private compatible-copy fixture</title><link rel="stylesheet" href="/app.css"><body>${[0, 1].map((index) => `<section id="root-${index}">${url.pathname === '/react' ? renderToString(h(Scene, { model, index }), { identifierPrefix: `copy-${index}-` }) : ''}</section>`).join('')}<script type="module" src="/client.js"></script></body></html>`,
      {
        headers: {
          'content-type': 'text/html',
          'content-security-policy':
            "default-src 'none';script-src 'self';style-src 'self';style-src-attr 'none';img-src 'self';object-src 'none';base-uri 'none';require-trusted-types-for 'script'",
        },
      },
    );
  },
});
