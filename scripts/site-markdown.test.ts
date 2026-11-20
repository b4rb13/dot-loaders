import { afterEach, describe, expect, test } from 'bun:test';
import middleware from '../apps/site/middleware';
import {
  markdownFor,
  notFoundMarkdown,
  pageSummary,
  wantsMarkdown,
} from '../apps/site/src/lib/negotiation';

// The docs site's Markdown for agents (apps/site/middleware.ts on Vercel):
// requests that prefer text/markdown get Markdown, everyone else the page.

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

  test('a HEAD request gets the headers without a body', async () => {
    serve({ '/index.md': '# Dotquilt\n' });
    const response = await middleware(request('/', 'text/markdown', 'HEAD'));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe('');
  });
});
