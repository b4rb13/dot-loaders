import { appMarkup } from './src/markup';

const families = ['region', 'chart', 'table', 'skeleton', 'text', 'typing'];
const assets = new Set([
  '/native.js',
  '/react.js',
  '/app.css',
  ...families.map((name) => `/dotquilt/${name}.css`),
]);
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 4236),
  async fetch(request) {
    const url = new URL(request.url);
    if (assets.has(url.pathname)) {
      const file = Bun.file(
        new URL(`./public${url.pathname}`, import.meta.url),
      );
      return (await file.exists())
        ? new Response(file)
        : new Response('Not found', { status: 404 });
    }
    if (url.pathname !== '/') return new Response('Not found', { status: 404 });
    const integration =
      url.searchParams.get('integration') === 'native' ? 'native' : 'react';
    return new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dotquilt semantic and mixed example</title><link rel="stylesheet" href="/app.css">${families.map((name) => `<link data-required-style rel="stylesheet" href="/dotquilt/${name}.css">`).join('')}</head><body><main><h1>One report, explicit ownership</h1><p>Illustrative local content. ${integration === 'native' ? 'Native enhancement' : 'React client mount'}; this application does not implement React SSR.</p><nav aria-label="Integration"><a href="/?integration=react">React example</a><a href="/?integration=native">Native example</a></nav><div id="app">${appMarkup()}</div><details><summary>Provider calls and owner events</summary><pre id="observations" tabindex="0">No active load.</pre></details><noscript><p>Content stays readable. Loading controls require JavaScript.</p></noscript><p><a href="/?integration=${integration}">Reload the ready report</a></p></main><script type="module" src="/${integration}.js"></script></body></html>`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy':
            "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        },
      },
    );
  },
});
