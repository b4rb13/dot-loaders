import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '../..');
// Default: serve the workspace build (packages/core/dist). With DOTQUILT_PACKED=1,
// serve the tarball that `bun run verify:packed` installed into a clean consumer.
const packagePath = process.env.DOTQUILT_PACKED
  ? resolve(
      (
        await readFile(resolve(root, '.artifacts/consumer-path'), 'utf8')
      ).trim(),
      'node_modules/@dotquilt-internal/core',
    )
  : resolve(root, 'packages/core');
const {
  renderStatic,
  skeletonStyles,
  regionStyles,
  staticSkeletonStyles,
  textStyles,
} = await import(resolve(packagePath, 'dist/server.js'));
const { denseStyles } = await import(
  resolve(packagePath, 'dist/internal/dense/painter.js')
);
const proofClient = await Bun.build({
  entrypoints: [resolve(root, 'tests/m2/client.ts')],
  target: 'browser',
  format: 'esm',
});
if (!proofClient.success || !proofClient.outputs[0])
  throw new Error('M2 proof client build failed');
const proofScript = await proofClient.outputs[0].text();
const traceClient = await Bun.build({
  entrypoints: [resolve(root, 'tests/m2/trace-client.ts')],
  target: 'browser',
  format: 'esm',
});
if (!traceClient.success || !traceClient.outputs[0])
  throw new Error('Trace fixture build failed');
const traceScript = await traceClient.outputs[0].text();
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
  ...denseStyles,
]
  .map((s: string) => `'sha256-${hash(s)}'`)
  .join(' ');
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
    if (url.pathname === '/m2/trace.js')
      return new Response(traceScript, {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/m2/trace') {
      const profile = url.searchParams.get('profile') ?? 'normal';
      if (!['individual', 'normal', 'list', 'stress'].includes(profile))
        return new Response('Invalid profile', { status: 400 });
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private whole-render fixture</title><link rel="stylesheet" href="/m2/app.css"><link rel="stylesheet" href="/m2/trace.css"><div id="before">Before</div><div id="bench" class="m2-cohort ${profile}"></div><div id="after">After</div><script type="module" src="/m2/trace.js"></script></html>`,
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy':
              "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; style-src-attr 'none'; require-trusted-types-for 'script'",
          },
        },
      );
    }
    if (url.pathname === '/m2/trace.css')
      return new Response(
        'body{margin:0}#before,#after{height:20px}#bench.normal{height:320px}#bench.stress{height:600px}#bench.individual{width:320px;height:160px;grid-template-columns:320px;grid-template-rows:160px}.trace-region{min-height:0;overflow:hidden}.trace-content{height:100%;overflow:hidden}.trace-content svg{display:block;width:100%;height:100%;fill:currentColor}.trace-content table{width:100%;height:100%;font:12px monospace}',
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname === '/m2/client.js')
      return new Response(proofScript, {
        headers: { 'content-type': 'text/javascript' },
      });
    if (url.pathname === '/m2/dense.css')
      return new Response(denseStyles.join('\n'), {
        headers: { 'content-type': 'text/css' },
      });
    if (url.pathname === '/m2/app.css')
      return new Response(
        '.m2-cohort{display:grid;gap:0}.m2-cohort .m2-tile{width:100%;height:100%}.m2-cohort.normal{grid-template-columns:repeat(6,160px);grid-auto-rows:80px;width:960px}.m2-cohort.list{grid-template-columns:repeat(5,180px);grid-auto-rows:160px;width:900px;height:640px;overflow:auto}.m2-cohort.stress{grid-template-columns:repeat(10,120px);grid-auto-rows:60px;width:1200px}body{font:16px system-ui;margin:32px;color:#405047}button{font:inherit;margin:8px}#m2-stage{margin-top:24px}.m2-region{width:320px;min-height:160px}.m2-block{width:320px;height:160px}#proof-content{position:relative;width:320px;min-height:160px}#proof-content>button{position:absolute;right:0;bottom:0}#proof-content svg{display:block;width:320px;height:160px;fill:currentColor}#proof-content p{margin:45px 0 0 20px;font:30px monospace}table{border-collapse:collapse;width:300px;table-layout:fixed}td{height:23px;padding:0 0 0 20px;font:16px monospace}',
        { headers: { 'content-type': 'text/css' } },
      );
    if (url.pathname === '/m2') {
      const mode = url.searchParams.get('mode') ?? 'inline';
      const style =
        mode === 'nonce'
          ? "'self' 'nonce-fixture-nonce'"
          : mode === 'hash'
            ? `'self' ${hashes}`
            : mode === 'external'
              ? "'self'"
              : "'self' 'unsafe-inline'";
      return new Response(
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>M2 private renderer proof</title><link rel="stylesheet" href="/m2/app.css"><h1>M2 renderer comparison</h1><p>Private diagnostic fixture. Renderer selection and reference qualification remain provisional.</p><p role="status" aria-live="polite">Loading the current outcome</p><button id="reveal">Reveal content</button><button id="pending">New loading cycle</button><button id="pause">Pause motion</button><section id="m2-stage"></section><script type="module" src="/m2/client.js"></script></html>',
        {
          headers: {
            'content-type': 'text/html',
            'content-security-policy': `default-src 'none'; script-src 'self'; style-src ${style}; style-src-attr 'none'; base-uri 'none'; object-src 'none'; require-trusted-types-for 'script'`,
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
    if (
      ['/production-skeleton.js', '/production-region.js'].includes(
        url.pathname,
      )
    )
      return new Response(
        Bun.file(
          resolve(
            root,
            '.artifacts',
            url.pathname.slice(12).replace('.js', '-consumer.js'),
          ),
        ),
        { headers: { 'content-type': 'text/javascript' } },
      );
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
    if (production === 'skeleton' || production === 'region')
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
