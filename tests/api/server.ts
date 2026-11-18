import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
const core = resolve(consumer, 'node_modules/@dotquilt-internal/core/dist');
const { renderStatic } = await import(resolve(core, 'server.js'));
Bun.serve({
  hostname: '127.0.0.1',
  port: 4203,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico')
      return new Response(null, { status: 204 });
    const modulePath = /^\/copy-(one|two)\/(.+\.js)$/.exec(url.pathname);
    if (modulePath) {
      const path = resolve(core, modulePath[2] as string);
      if (!path.startsWith(core + sep))
        return new Response('Forbidden', { status: 403 });
      return new Response(Bun.file(path), {
        headers: { 'content-type': 'text/javascript' },
      });
    }
    const css = /^\/styles\/(region|skeleton-text|chart)\.css$/.exec(
      url.pathname,
    );
    if (css)
      return new Response(Bun.file(resolve(core, `${css[1]}.css`)), {
        headers: { 'content-type': 'text/css' },
      });
    if (url.pathname === '/app.css')
      return new Response(Bun.file(resolve(root, 'examples/api/app.css')), {
        headers: { 'content-type': 'text/css' },
      });
    if (url.pathname === '/native.js' || url.pathname === '/react.js')
      return new Response(
        Bun.file(resolve(root, '.artifacts/m4-api', url.pathname.slice(1))),
        { headers: { 'content-type': 'text/javascript' } },
      );
    const markup = renderStatic({
      kind: 'region',
      state: 'ready',
      stylePolicy: { mode: 'external', href: '/styles/region.css' },
      placeholder: {
        kind: 'skeleton-text',
        stylePolicy: { mode: 'external', href: '/styles/skeleton-text.css' },
      },
    });
    const summary = markup
      .replace('<dotquilt-region', '<dotquilt-region class="summary"')
      .replace(
        '</dotquilt-region>',
        '<input aria-label="Retained input" value="original"><p data-result>Current summary</p><span slot="refresh-indicator">Updating</span></dotquilt-region>',
      );
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private API examples</title><link rel="stylesheet" href="/app.css"><body><div id="app">${url.searchParams.has('react') || url.searchParams.has('empty') ? '' : summary}</div></body></html>`,
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
