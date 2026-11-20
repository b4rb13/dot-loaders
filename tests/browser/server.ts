import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '../..');
// Serves the workspace build (packages/core/dist). Packaging itself is checked
// by scripts/pack-smoke.test.ts.
const packagePath = resolve(root, 'packages/core');
const {
  renderStatic,
  skeletonStyles,
  regionStyles,
  staticSkeletonStyles,
  textStyles,
} = await import(resolve(packagePath, 'dist/server.js'));
const catalogClient = await Bun.build({
  entrypoints: [resolve(root, 'tests/m2/catalog-client.ts')],
  target: 'browser',
  format: 'esm',
});
if (!catalogClient.success || !catalogClient.outputs[0])
  throw new Error('Catalog trace fixture build failed');
const catalogScript = await catalogClient.outputs[0].text();
const sha = new Bun.CryptoHasher('sha256');
const hash = (s: string) => sha.update(s).digest('base64');
const hashes = [
  ...skeletonStyles,
  ...regionStyles,
  ...staticSkeletonStyles,
  ...textStyles,
]
  .map((s: string) => `'sha256-${hash(s)}'`)
  .join(' ');
// Minified "production" consumers of the selective entries, built from the workspace.
const productionBundles = new Map<string, Blob>();
for (const [name, source] of [
  [
    'skeleton',
    "import {registerSkeletonBlock} from 'dotquilt/skeleton';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
  ],
  [
    'region',
    "import {registerLoadingRegion} from 'dotquilt/region';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
  ],
  [
    'chart',
    "import {registerLoadingRegion} from 'dotquilt/region';import {registerChartLoader} from 'dotquilt/chart';registerLoadingRegion();registerChartLoader();for(const variant of ['line','bar','scatter']){const region=document.createElement('dotquilt-region');region.state='pending';const chart=document.createElement('dotquilt-chart-loader');chart.slot='placeholder';chart.variant=variant;chart.style.height='120px';const content=document.createElement('p');content.textContent=variant+' chart';region.append(chart,content);document.body.append(region);}",
  ],
] as const) {
  const path = `/production-${name}.js`;
  const directory = resolve(root, '.artifacts/native-server');
  await mkdir(directory, { recursive: true });
  const entry = resolve(directory, `${name}-entry.ts`);
  await writeFile(entry, source);
  const bundle = await Bun.build({
    entrypoints: [entry],
    minify: true,
    target: 'browser',
    format: 'esm',
  });
  if (!bundle.success || !bundle.outputs[0])
    throw new Error(`Production ${name} bundle build failed`);
  productionBundles.set(path, bundle.outputs[0]);
}
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.DOTQUILT_TEST_PORT ?? 4181),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/m2/catalog.js')
      return new Response(catalogScript, {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/m2/catalog.css')
      return new Response(Bun.file(resolve(root, 'tests/m2/catalog.css')), {
        headers: { 'content-type': 'text/css' },
      });
    if (url.pathname === '/m2/catalog') {
      const profile = url.searchParams.get('profile') ?? 'normal';
      if (!['individual', 'normal', 'list', 'stress'].includes(profile))
        return new Response('Invalid profile', { status: 400 });
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private packed catalog benchmark</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/m2/catalog.css"><div id="before">Before</div><div id="bench" class="${profile}"></div><div id="after">After</div><script type="module" src="/m2/catalog.js"></script></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy':
              "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; style-src-attr 'none'; base-uri 'none'; object-src 'none'; require-trusted-types-for 'script'",
          },
        },
      );
    }
    if (url.pathname === '/missing.js')
      return new Response('', {
        status: 404,
        headers: { 'content-type': 'text/javascript' },
      });
    if (/^\/pkg(?:-copy)?\//.test(url.pathname)) {
      const path = resolve(
        packagePath,
        url.pathname.replace(/^\/pkg(?:-copy)?\//, ''),
      );
      if (!path.startsWith(packagePath + sep))
        return new Response(null, { status: 403 });
      return new Response(Bun.file(path));
    }
    const productionBundle = productionBundles.get(url.pathname);
    if (productionBundle)
      return new Response(productionBundle, {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/app.css')
      return new Response(
        `.app-final #content{opacity:.8;transform:scale(.99)}body{font:16px system-ui;margin:40px;color:#405047}.example{min-height:100px;width:320px}.block{height:100px}dotquilt-skeleton-block{display:block;position:relative;width:100%;height:100px}.outside{margin-top:12px}`,
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname === '/init.js')
      return new Response(
        await readFile(resolve(root, 'tests/browser/init.js')),
        { headers: { 'content-type': 'text/javascript' } },
      );
    const production = url.searchParams.get('production');
    if (
      production === 'skeleton' ||
      production === 'region' ||
      production === 'chart'
    )
      return new Response(
        `<!doctype html><html lang="en"><head><title>Measured production bundle</title></head><body><script type="module" src="/production-${production}.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy':
              "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; style-src-attr 'none'; require-trusted-types-for 'script'",
          },
        },
      );
    const mode = url.searchParams.get('mode') ?? 'inline';
    const staticOnly = url.searchParams.has('static');
    const policy =
      mode === 'external'
        ? { mode, href: '/pkg/dist/skeleton.css' }
        : {
            mode: 'inline',
            ...(mode === 'nonce' ? { nonce: 'fixture-nonce' } : {}),
          };
    const staticMarkup = renderStatic({
      kind: 'skeleton-block',
      stylePolicy: policy,
    });
    const ssr = url.searchParams.get('ssr');
    const regionPolicy =
      mode === 'external' ? { mode, href: '/pkg/dist/region.css' } : policy;
    // The app owns its content template and pre-upgrade availability guards.
    // renderStatic accepts decoration descriptions, never application HTML.
    const regionMarkup = ssr
      ? renderStatic({
          kind: 'region',
          state: ssr,
          label: 'Account activity',
          stylePolicy: regionPolicy,
          ...(ssr === 'pending'
            ? { placeholder: { kind: 'skeleton-block', stylePolicy: policy } }
            : {}),
        })
          .replace(
            '<dotquilt-region ',
            '<dotquilt-region id="region" class="example" ',
          )
          .replace(
            '</dotquilt-region>',
            `<article id="content"${ssr === 'pending' ? ' data-app-pending hidden inert aria-hidden="true"' : ''}><button id="action">Current account</button><p id="value">0</p></article></dotquilt-region>`,
          )
      : '<dotquilt-region id="region" class="example" state="pending" cycle="initial" aria-label="Account activity"><dotquilt-skeleton-block class="block" slot="placeholder" id="block"></dotquilt-skeleton-block><article id="content"><button id="action">Current account</button><p id="value">0</p></article></dotquilt-region>';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dotquilt native packed flow</title><link rel="stylesheet" href="/app.css"></head><body><h1>Native loading flow</h1><p role="status" aria-live="polite" aria-atomic="true" id="status">Loading account activity</p>${regionMarkup}<button id="outside" class="outside">Outside action</button><a href="/recovery" id="recovery">Check loading status</a><section id="static">${staticMarkup}</section>${staticOnly ? '' : `<script type="module" src="${url.searchParams.has('failed') ? '/missing.js' : '/init.js'}"></script>`}</body></html>`;
    const style =
      mode === 'nonce'
        ? "'self' 'nonce-fixture-nonce'"
        : mode === 'hash'
          ? `'self' ${hashes}`
          : mode === 'external'
            ? "'self'"
            : "'self' 'unsafe-inline'";
    return new Response(html, {
      headers: {
        'content-type': 'text/html',
        'content-security-policy': `default-src 'none'; script-src 'self'; style-src ${style}; style-src-attr 'none'; img-src 'none'; require-trusted-types-for 'script'; base-uri 'none'; object-src 'none'`,
      },
    });
  },
});
