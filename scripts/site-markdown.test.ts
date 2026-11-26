import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import middleware, {
  apiCatalog,
  apiCatalogHeaders,
  config,
  markdownFor,
  notFoundMarkdown,
  notFoundProblem,
  pageSummary,
  wantsJson,
  wantsMarkdown,
} from '../apps/site/middleware';

// The docs site's Markdown for agents (apps/site/middleware.ts on Vercel):
// requests that prefer text/markdown get Markdown, everyone else the page.

test('the middleware loads on its own in Node, as Vercel runs it', async () => {
  // Vercel compiles middleware.ts to a single middleware.js without bundling
  // and runs it in Node, so an import of another source file can't be found
  // and every request fails (MIDDLEWARE_INVOCATION_FAILED).
  const source = await readFile(
    resolve(import.meta.dirname, '../apps/site/middleware.ts'),
    'utf8',
  );
  const work = await mkdtemp(resolve(tmpdir(), 'dotquilt-middleware-'));
  try {
    const file = resolve(work, 'middleware.mjs');
    await writeFile(
      file,
      new Bun.Transpiler({ loader: 'ts' }).transformSync(source),
    );
    const run = Bun.spawnSync([
      'node',
      '--input-type=module',
      '-e',
      `const m = await import(${JSON.stringify(pathToFileURL(file).href)});
       const answer = await m.default(new Request('https://dotquilt.dev/', { headers: { accept: 'text/html' } }));
       console.log(typeof m.default, String(answer), m.config.matcher.length);`,
    ]);
    expect(run.stderr.toString()).toBe('');
    expect(run.stdout.toString().trim()).toBe('function undefined 3');
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

describe('wantsMarkdown', () => {
  test('a request that names Markdown first, or alone, gets Markdown', () => {
    expect(wantsMarkdown('text/markdown')).toBe(true);
    expect(wantsMarkdown('text/markdown, text/html;q=0.9')).toBe(true);
    expect(wantsMarkdown('text/x-markdown')).toBe(true);
    expect(wantsMarkdown('TEXT/MARKDOWN; charset=utf-8')).toBe(true);
  });
  test('browsers and HTML-first agents get HTML', () => {
    expect(
      wantsMarkdown(
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ),
    ).toBe(false);
    expect(wantsMarkdown('text/html, text/markdown;q=0.5')).toBe(false);
    expect(wantsMarkdown('*/*')).toBe(false);
    expect(wantsMarkdown('text/markdown;q=0')).toBe(false);
    expect(wantsMarkdown('')).toBe(false);
    expect(wantsMarkdown(null)).toBe(false);
  });
});

describe('wantsJson', () => {
  test('a request that names JSON first, or alone, gets JSON errors', () => {
    expect(wantsJson('application/json')).toBe(true);
    expect(wantsJson('application/problem+json')).toBe(true);
    expect(wantsJson('application/json, text/html;q=0.5')).toBe(true);
  });
  test('browsers, HTML-first and wildcard requests do not', () => {
    expect(wantsJson(null)).toBe(false);
    expect(wantsJson('*/*')).toBe(false);
    expect(
      wantsJson(
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ),
    ).toBe(false);
    expect(wantsJson('text/html, application/json;q=0.9')).toBe(false);
    expect(wantsJson('application/json;q=0')).toBe(false);
  });
});

test('the middleware runs on pages, Markdown copies and the API catalog', () => {
  const matches = (path: string) =>
    config.matcher.some((pattern) =>
      // Vercel's matcher: a path-to-regexp source, here only literal
      // characters and (…) groups, so it reads as a regular expression.
      new RegExp(`^${pattern}$`).test(path),
    );
  expect(matches('/docs/theming/')).toBe(true);
  expect(matches('/docs/theming.md')).toBe(true);
  expect(matches('/.well-known/api-catalog')).toBe(true);
  expect(matches('/.well-known/security.txt')).toBe(false);
  expect(matches('/openapi.json')).toBe(false);
  expect(matches('/_astro/page.js')).toBe(false);
});

test('a JSON 404 is RFC 9457 problem details with a code and a resolution', () => {
  expect(notFoundProblem('/nope/')).toEqual({
    type: 'https://dotquilt.dev/docs/ai-setup/#errors',
    title: 'Page not found',
    status: 404,
    detail:
      'There is no page at /nope/ on dotquilt.dev. It may have moved, or the address may be mistyped.',
    instance: '/nope/',
    code: 'page_not_found',
    resolution:
      'Find the page in https://dotquilt.dev/llms.txt, which links every docs page as Markdown. https://dotquilt.dev/openapi.json describes every endpoint.',
  });
});

test('every page maps to its Markdown copy', () => {
  expect(markdownFor('/')).toBe('/index.md');
  expect(markdownFor('/docs/')).toBe('/docs.md');
  expect(markdownFor('/docs/components/skeleton/')).toBe(
    '/docs/components/skeleton.md',
  );
  expect(markdownFor('/about')).toBe('/about.md');
});

test('a 404 body explains the miss and links onwards', () => {
  const body = notFoundMarkdown('/nope');
  expect(body.startsWith('# Page not found\n')).toBe(true);
  expect(body).toContain('`/nope`');
  expect(body).toContain('https://dotquilt.dev/llms.txt');
  expect(body).toContain('https://dotquilt.dev/sitemap-index.xml');
});

test('an HTML-only page is summarised from its title and description', () => {
  const body = pageSummary(
    new URL('https://dotquilt.dev/license/'),
    '<html><head><title>MIT License | Dotquilt</title><meta name="description" content="Dotquilt&#39;s license."/></head></html>',
  );
  expect(body.startsWith('# MIT License | Dotquilt\n')).toBe(true);
  expect(body).toContain("> Dotquilt's license.");
  expect(body).toContain('https://dotquilt.dev/license/');
});

describe('middleware', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  /** A site with these files; anything else is a 404. */
  function serve(files: Record<string, string>) {
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      requests.push(url.pathname);
      const body = files[url.pathname];
      return new Response(body ?? 'missing', { status: body ? 200 : 404 });
    }) as typeof fetch;
    return requests;
  }
  const request = (path: string, accept: string, method = 'GET') =>
    new Request(`https://dotquilt.dev${path}`, {
      method,
      headers: { accept },
    });

  test('passes a browser request through untouched', async () => {
    const requests = serve({});
    expect(
      await middleware(request('/', 'text/html,*/*;q=0.8')),
    ).toBeUndefined();
    expect(requests).toEqual([]);
  });

  test('answers Markdown with the page copy, Vary: Accept and text/markdown', async () => {
    serve({ '/index.md': '# Dotquilt\n' });
    const response = await middleware(request('/', 'text/markdown'));
    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response?.headers.get('vary')).toBe('Accept');
    expect(await response?.text()).toBe('# Dotquilt\n');
  });

  test('summarises a page that has no Markdown copy', async () => {
    serve({
      '/license/': '<title>MIT License | Dotquilt</title>',
    });
    const response = await middleware(request('/license/', 'text/markdown'));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain('# MIT License | Dotquilt');
  });

  test('answers a missing page with a 404 and a Markdown body', async () => {
    serve({});
    const response = await middleware(request('/nope', 'text/markdown'));
    expect(response?.status).toBe(404);
    expect(response?.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(await response?.text()).toContain('# Page not found');
  });

  test('answers a missing page asked for as JSON with a problem+json 404', async () => {
    serve({});
    const response = await middleware(request('/nope/', 'application/json'));
    expect(response?.status).toBe(404);
    expect(response?.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(response?.headers.get('vary')).toBe('Accept');
    expect(await response?.json()).toEqual(notFoundProblem('/nope/'));
  });

  test('passes a page that exists through to a JSON request', async () => {
    const requests = serve({ '/docs/': '<title>Docs</title>' });
    expect(
      await middleware(request('/docs/', 'application/json')),
    ).toBeUndefined();
    expect(requests).toEqual(['/docs/']);
  });

  test('answers a missing Markdown copy asked for as JSON with a problem+json 404', async () => {
    serve({});
    const response = await middleware(
      request('/docs/nope.md', 'application/json'),
    );
    expect(response?.status).toBe(404);
    const body = (await response?.json()) as { instance: string } | undefined;
    expect(body?.instance).toBe('/docs/nope.md');
  });

  test('leaves every other request for a Markdown copy to the static file', async () => {
    const requests = serve({ '/docs/theming.md': '# Theming\n' });
    for (const accept of ['text/markdown', '*/*', 'text/html'])
      expect(
        await middleware(request('/docs/theming.md', accept)),
      ).toBeUndefined();
    expect(
      await middleware(request('/docs/theming.md', 'application/json')),
    ).toBeUndefined();
    // Only the JSON request looked the file up.
    expect(requests).toEqual(['/docs/theming.md']);
  });

  test('a HEAD request for a missing page gets the JSON 404 without a body', async () => {
    serve({});
    const response = await middleware(
      request('/nope/', 'application/json', 'HEAD'),
    );
    expect(response?.status).toBe(404);
    expect(await response?.text()).toBe('');
  });

  test('answers the API catalog as an RFC 9727 Linkset, with the static copy as its body', async () => {
    const requests = serve({});
    const response = await middleware(
      request('/.well-known/api-catalog', 'application/linkset+json'),
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toBe(
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    );
    expect(response?.headers.get('link')).toContain(
      '<https://dotquilt.dev/.well-known/api-catalog>; rel="api-catalog"',
    );
    // Vercel applies no vercel.json headers under /.well-known/, so the
    // static file would go out as application/octet-stream: the middleware
    // answers with the same body.
    const file = await readFile(
      resolve(
        import.meta.dirname,
        '../apps/site/public/.well-known/api-catalog',
      ),
      'utf8',
    );
    expect(await response?.text()).toBe(file);
    expect(JSON.parse(file)).toEqual(apiCatalog);
    expect(requests).toEqual([]);
  });

  test('a HEAD request for the API catalog gets its Link header', async () => {
    serve({});
    const response = await middleware(
      request('/.well-known/api-catalog', '*/*', 'HEAD'),
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get('link')).toBe(apiCatalogHeaders.link);
    expect(await response?.text()).toBe('');
  });

  test('a HEAD request gets the headers without a body', async () => {
    serve({ '/index.md': '# Dotquilt\n' });
    const response = await middleware(request('/', 'text/markdown', 'HEAD'));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe('');
  });
});
