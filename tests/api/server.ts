// Serves the API examples against the workspace build (packages/*/dist).
import { resolve, sep } from 'node:path';
import { renderStatic } from '@dotquilt-internal/core/server';

const root = resolve(import.meta.dir, '../..');
const core = resolve(root, 'packages/core/dist');
const clients = new Map<string, string>();
for (const name of ['native.ts', 'react.tsx']) {
  const build = await Bun.build({
    entrypoints: [resolve(import.meta.dir, name)],
    format: 'esm',
    target: 'browser',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot build the API client ${name}`);
  clients.set(
    `/${name.replace(/\.tsx?$/, '')}.js`,
    await build.outputs[0].text(),
  );
}
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
    const client = clients.get(url.pathname);
    if (client)
      return new Response(client, {
        headers: { 'content-type': 'text/javascript' },
      });
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
