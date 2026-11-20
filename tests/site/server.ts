// Serves the built docs site (apps/site/dist). Run `bun run build` first.
import { existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../apps/site/dist');
if (!existsSync(join(root, 'index.html')))
  throw new Error('Build the site first: bun run build');
const port = 4331;

Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const path = normalize(decodeURIComponent(new URL(request.url).pathname));
    // Vercel serves Web Analytics under /_vercel/insights; here it is a
    // script that does nothing and an endpoint that accepts the page views.
    if (path === '/_vercel/insights/script.js')
      return new Response('', {
        headers: { 'content-type': 'text/javascript' },
      });
    if (path.startsWith('/_vercel/insights/'))
      return new Response(null, { status: 204 });
    let file = join(root, path);
    if (!file.startsWith(root))
      return new Response('not found', { status: 404 });
    if (existsSync(file) && statSync(file).isDirectory())
      file = join(file, 'index.html');
    if (existsSync(file)) return new Response(Bun.file(file));
    return new Response(Bun.file(join(root, '404.html')), { status: 404 });
  },
});
console.log(`site on http://127.0.0.1:${port}`);
