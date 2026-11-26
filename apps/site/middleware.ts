/**
 * Vercel Routing Middleware: Markdown and JSON errors for agents, by content
 * negotiation.
 *
 * - A request for a page whose Accept header prefers `text/markdown` gets
 *   the page's Markdown copy (`/` → `/index.md`, `/docs/x/` → `/docs/x.md`),
 *   an HTML-only page gets a short Markdown summary, and a missing page gets
 *   a 404 with a Markdown body.
 * - A request that doesn't ask for HTML (an agent, a script, `curl`: Accept
 *   `application/json`, `*\/*` or none), for a page or a Markdown copy that
 *   doesn't exist, gets a 404 as RFC 9457 `application/problem+json` (see
 *   /openapi.json), or as Markdown if it prefers Markdown. Browsers name
 *   `text/html`, and get the site's 404 page as before.
 *
 * Everything that exists passes through to the static site untouched; for a
 * request that doesn't ask for HTML, after one HEAD request to check. Of the
 * static files (anything with an extension), only those agents read run it:
 * `.md`, `.txt` and `.json`. Vercel's own paths never run it, and it can't run under /.well-known/:
 * with `trailingSlash` on, Vercel ends routing for those paths before any
 * vercel.json header or middleware (so public/.well-known/api-catalog goes
 * out as application/octet-stream).
 *
 * Vercel compiles this file on its own, without bundling, so it imports
 * nothing: everything it needs is below. scripts/site-markdown.test.ts loads
 * it the same way.
 */

export const config = {
  matcher: [
    '/((?!_astro/|_vercel/|pagefind/|\\.well-known/|.*\\.[^/]+$).*)',
    // The files an agent reads: Markdown copies, llms.txt and the JSON ones.
    '/(.*)\\.(md|txt|json)',
  ],
};

const site = 'https://dotquilt.dev';

/** The headers of every Markdown answer. */
const markdownHeaders = {
  'content-type': 'text/markdown; charset=utf-8',
  vary: 'Accept',
  'cache-control': 'public, max-age=0, must-revalidate',
} as const;

/**
 * Whether an Accept header asks for Markdown before HTML: `text/markdown`
 * (or `text/x-markdown`) with a quality above zero and at least that of
 * `text/html`. Wildcards don't count: a browser's `*\/*` is not a request
 * for Markdown.
 */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const part of accept.toLowerCase().split(',')) {
    const [type = '', ...parameters] = part.split(';').map((s) => s.trim());
    const q = parameters.find((parameter) => parameter.startsWith('q='));
    const quality = q === undefined ? 1 : Number(q.slice(2));
    if (!Number.isFinite(quality)) continue;
    if (type === 'text/markdown' || type === 'text/x-markdown')
      markdown = Math.max(markdown, quality);
    else if (type === 'text/html' || type === 'application/xhtml+xml')
      html = Math.max(html, quality);
  }
  return markdown > 0 && markdown >= html;
}

/**
 * Whether an Accept header asks for JSON before HTML: `application/json` or
 * `application/problem+json` with a quality above zero and at least that of
 * `text/html`. Wildcards don't count, as for Markdown.
 */
export function wantsJson(accept: string | null | undefined): boolean {
  if (!accept) return false;
  let json = 0;
  let html = 0;
  for (const part of accept.toLowerCase().split(',')) {
    const [type = '', ...parameters] = part.split(';').map((s) => s.trim());
    const q = parameters.find((parameter) => parameter.startsWith('q='));
    const quality = q === undefined ? 1 : Number(q.slice(2));
    if (!Number.isFinite(quality)) continue;
    if (type === 'application/json' || type === 'application/problem+json')
      json = Math.max(json, quality);
    else if (type === 'text/html' || type === 'application/xhtml+xml')
      html = Math.max(html, quality);
  }
  return json > 0 && json >= html;
}

/**
 * Whether an Accept header names HTML at all (`text/html` or
 * `application/xhtml+xml` with a quality above zero), as every browser's
 * does. A wildcard doesn't count.
 */
export function asksForHtml(accept: string | null | undefined): boolean {
  if (!accept) return false;
  return accept
    .toLowerCase()
    .split(',')
    .some((part) => {
      const [type = '', ...parameters] = part.split(';').map((s) => s.trim());
      const q = parameters.find((parameter) => parameter.startsWith('q='));
      const quality = q === undefined ? 1 : Number(q.slice(2));
      return (
        (type === 'text/html' || type === 'application/xhtml+xml') &&
        quality > 0
      );
    });
}

/** Where the errors are documented (the `type` of each problem). */
const errorDocs = `${site}/docs/ai-setup/#errors`;

/** A missing page or Markdown copy, as RFC 9457 problem details. */
export function notFoundProblem(pathname: string) {
  return {
    type: errorDocs,
    title: 'Page not found',
    status: 404,
    detail: `There is no page at ${pathname} on dotquilt.dev. It may have moved, or the address may be mistyped.`,
    instance: pathname,
    code: 'page_not_found',
    resolution: `Find the page in ${site}/llms.txt, which links every docs page as Markdown. ${site}/openapi.json describes every endpoint.`,
  };
}

/** A page's Markdown copy: `/` → `/index.md`, `/docs/theming/` → `/docs/theming.md`. */
export function markdownFor(pathname: string): string {
  const path = pathname.replace(/\/+$/, '');
  return path ? `${path}.md` : '/index.md';
}

/** The links an agent can go on from, after a miss or on an HTML-only page. */
const onwards = [
  `- Every docs page, as an index: ${site}/llms.txt`,
  `- Every docs page in one file: ${site}/llms-full.txt`,
  `- The sitemap: ${site}/sitemap-index.xml`,
  `- The home page: ${site}/`,
];

/** The Markdown body of a 404. */
export function notFoundMarkdown(pathname: string): string {
  return [
    '# Page not found',
    '',
    `There is no page at \`${pathname}\` on dotquilt.dev. It may have moved, or the address may be mistyped.`,
    '',
    'Go on from here:',
    '',
    ...onwards,
    '',
  ].join('\n');
}

const decode = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * A page that exists only as HTML (an interactive one, such as the
 * playground): its title and description, and where to read on.
 */
export function pageSummary(url: URL, html: string): string {
  const title = decode(
    html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? 'Dotquilt',
  );
  const description = html.match(
    /<meta\s+name="description"\s+content="([^"]*)"/i,
  )?.[1];
  return [
    `# ${title}`,
    '',
    ...(description ? [`> ${decode(description)}`, ''] : []),
    `This page is interactive and has no Markdown version. Open it in a browser: ${site}${url.pathname}`,
    '',
    'Read on as Markdown:',
    '',
    ...onwards,
    '',
  ].join('\n');
}

function answer(request: Request, body: string, status: number): Response {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: markdownHeaders,
  });
}

/**
 * Marks the middleware's own requests to the site, which pass straight
 * through it.
 */
const internal = 'x-dotquilt-middleware';

/**
 * The same request's headers (a preview's login cookie included), asking
 * for `accept`, marked as the middleware's own.
 */
function own(request: Request, accept: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('accept', accept);
  headers.set(internal, '1');
  return headers;
}

/** Whether the site has a page or file at this request's address. */
async function exists(request: Request, url: URL): Promise<boolean> {
  return (
    await fetch(url, { method: 'HEAD', headers: own(request, 'text/html') })
  ).ok;
}

const isFile = (pathname: string) => /\.[^/]+$/.test(pathname);

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
  if (request.headers.has(internal)) return undefined;
  const accept = request.headers.get('accept');
  const url = new URL(request.url);
  // A file an agent reads (the only files the matcher lets in), or a page
  // not asked for as Markdown.
  if (isFile(url.pathname) || !wantsMarkdown(accept)) {
    // A browser, or a client that prefers HTML: the site as it is.
    if (asksForHtml(accept) && !wantsJson(accept)) return undefined;
    if (await exists(request, url)) return undefined;
    if (wantsMarkdown(accept))
      return answer(request, notFoundMarkdown(url.pathname), 404);
    return new Response(
      request.method === 'HEAD'
        ? null
        : JSON.stringify(notFoundProblem(url.pathname)),
      {
        status: 404,
        headers: {
          'content-type': 'application/problem+json',
          vary: 'Accept',
          'cache-control': 'public, max-age=0, must-revalidate',
        },
      },
    );
  }
  const copy = await fetch(new URL(markdownFor(url.pathname), url), {
    headers: own(request, 'text/markdown'),
  });
  if (copy.ok) return answer(request, await copy.text(), 200);
  // No Markdown copy: is there a page at all?
  const page = await fetch(url, { headers: own(request, 'text/html') });
  if (page.ok) return answer(request, pageSummary(url, await page.text()), 200);
  return answer(request, notFoundMarkdown(url.pathname), 404);
}
