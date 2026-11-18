import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const latest = 'docs/implementation/m4/motion-review-evidence.json';
const packetPath =
  process.env.DOTQUILT_REVIEW_PACKET ??
  ((await Bun.file(resolve(root, latest)).exists())
    ? latest
    : 'docs/implementation/m4/text-variants-evidence.json');
const packet = await Bun.file(resolve(root, packetPath)).json();
const current = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
for (const name of ['core', 'react']) {
  if (packet.artifacts[name].sha256 !== current.artifacts[name].sha256)
    throw new Error('Review assets do not match the final API packet');
}
const consumer = (
  await Bun.file(resolve(root, '.artifacts/m4/consumer-path')).text()
).trim();
const hash = async (path: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(path).arrayBuffer())
    .digest('hex');
for (const name of ['core', 'react']) {
  if (
    (await hash(packet.artifacts[name].path)) !== packet.artifacts[name].sha256
  )
    throw new Error('Tarball identity mismatch');
  const prefix = `packages/${name}/dist/`;
  for (const [path, expected] of Object.entries(packet.sourceArchive)) {
    if (
      path.startsWith(prefix) &&
      (await hash(
        resolve(
          consumer,
          `node_modules/@dotquilt-internal/${name}/dist`,
          path.slice(prefix.length),
        ),
      )) !== expected
    )
      throw new Error(`Installed package changed: ${path}`);
  }
}
const compiled = new Map<string, Blob>();
for (const [route, file] of [
  ['catalog/native.js', 'client.ts'],
  ['catalog/text.js', 'text-client.ts'],
  ['catalog/chart.js', 'chart-client.ts'],
  ['table/table.js', 'table-client.ts'],
  ['shared/client.js', 'shared-wrapper/client.tsx'],
]) {
  const build = await Bun.build({
    entrypoints: [resolve(consumer, file as string)],
    target: 'browser',
    format: 'esm',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot build review example ${file}`);
  compiled.set(route as string, build.outputs[0]);
}
await import('../../tests/m4/server.ts');
await import('../../tests/table/server.ts');
await import('../../tests/shared-wrapper/server.ts');
const ports = { catalog: 4194, table: 4197, shared: 4202 };
Bun.serve({
  hostname: '127.0.0.1',
  port: 4208,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/fixture-theme.css') {
      const dark = url.searchParams.get('theme') === 'dark';
      return new Response(
        `#table-controls{display:none}:root{color-scheme:${dark ? 'dark' : 'light'}}body{background:${dark ? '#17211b' : '#ffffff'};color:${dark ? '#c7d5cb' : '#405047'}}`,
        { headers: { 'content-type': 'text/css' } },
      );
    }
    if (url.pathname === '/packet.json')
      return Response.json({
        core: packet.artifacts.core.sha256,
        react: packet.artifacts.react.sha256,
        renderer: 'provisional',
        npm: 'disabled',
        m2: 'OPEN',
        speed: 'real time; no virtual clock or playback-rate override',
        label: packet.label ?? 'final API review pair',
      });
    if (['/', '/review.js', '/review.css'].includes(url.pathname)) {
      const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      return new Response(Bun.file(resolve(import.meta.dir, name)), {
        headers: {
          'content-security-policy':
            "default-src 'none';script-src 'self';style-src 'self';frame-src 'self';connect-src 'self';base-uri 'none';object-src 'none'",
        },
      });
    }
    let service: keyof typeof ports;
    let path: string;
    const asset = /^\/assets\/(catalog|table|shared)\/(.*)$/.exec(url.pathname);
    if (asset) {
      const fresh = compiled.get(`${asset[1]}/${asset[2]}`);
      if (fresh)
        return new Response(fresh, {
          headers: { 'content-type': 'text/javascript' },
        });
      service = asset[1] as keyof typeof ports;
      path = `/${asset[2]}`;
    } else if (/^\/styles\/[\w-]+\.css$/.test(url.pathname)) {
      service = 'shared';
      path = url.pathname;
    } else if (url.pathname === '/native' || url.pathname === '/react') {
      service = 'shared';
      path = url.pathname;
    } else if (url.pathname.startsWith('/frame/')) {
      const family = url.pathname.slice(7);
      if (!['native', 'text', 'chart', 'table'].includes(family))
        return new Response('Not found', { status: 404 });
      service = family === 'table' ? 'table' : 'catalog';
      path = `/${family}`;
    } else return new Response('Not found', { status: 404 });
    const upstream = await fetch(
      `http://127.0.0.1:${ports[service]}${path}${url.search}`,
    );
    const headers = new Headers(upstream.headers);
    const type = headers.get('content-type') ?? '';
    if (!type.includes('text/html'))
      return new Response(upstream.body, { status: upstream.status, headers });
    const html = (await upstream.text()).replace(
      /\b(src|href)="\/(?!\/)([^"]*)"/g,
      (_, attribute, value) => `${attribute}="/assets/${service}/${value}"`,
    );
    const policy = headers.get('content-security-policy');
    if (policy)
      headers.set(
        'content-security-policy',
        policy.replaceAll('http://127.0.0.1:4202/favicon.svg', "'self'"),
      );
    headers.delete('content-length');
    return new Response(html, { status: upstream.status, headers });
  },
});
console.log(
  'Private owner review: http://127.0.0.1:4208 (current packed pair, real clocks)',
);
