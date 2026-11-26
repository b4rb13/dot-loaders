/**
 * Vercel Routing Middleware: Markdown and JSON errors for agents, by content
 * negotiation.
 *
 * - A request for a page whose Accept header prefers `text/markdown` gets
 *   the page's Markdown copy (`/` → `/index.md`, `/docs/x/` → `/docs/x.md`),
 *   an HTML-only page gets a short Markdown summary, and a missing page gets
 *   a 404 with a Markdown body.
 * - A request that prefers `application/json`, for a page or a Markdown copy
 *   that doesn't exist, gets a 404 as RFC 9457 `application/problem+json`
 *   (see /openapi.json). One for a page that exists gets the page.
 *
 * Every other request, such as a browser's, passes through to the static site
 * untouched. Of the static files (anything with an extension), only the
 * Markdown copies run it, and it returns at once unless the request prefers
 * JSON; Vercel's own paths and /.well-known/ never run it.
 *
 * Vercel compiles this file on its own, without bundling, so it imports
 * nothing: everything it needs is below. scripts/site-markdown.test.ts loads
 * it the same way.
 */

export const config = {
  matcher: [
    '/((?!_astro/|_vercel/|pagefind/|\\.well-known/|.*\\.[^/]+$).*)',
    '/(.*)\\.md',
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

/** Whether the site has a page or file at this request's address. */
async function exists(request: Request, url: URL): Promise<boolean> {
  // The same request's headers (a preview's login cookie included), asking
  // for HTML or anything, which pass back through this middleware untouched.
  const headers = new Headers(request.headers);
  headers.set('accept', isFile(url.pathname) ? '*/*' : 'text/html');
  return (await fetch(url, { method: 'HEAD', headers })).ok;
}

const isFile = (pathname: string) => /\.[^/]+$/.test(pathname);

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
  const accept = request.headers.get('accept');
  const url = new URL(request.url);
  // A Markdown copy (the only files the matcher lets in), or a page, asked
  // for as JSON: a JSON error if it doesn't exist, else the file or page.
  if (isFile(url.pathname) || !wantsMarkdown(accept)) {
    if (!wantsJson(accept) || (await exists(request, url))) return undefined;
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
  // The same request's headers (a preview's login cookie included), asking
  // for the file itself.
  const headers = new Headers(request.headers);
  headers.set('accept', 'text/markdown');
  const copy = await fetch(new URL(markdownFor(url.pathname), url), {
    headers,
  });
  if (copy.ok) return answer(request, await copy.text(), 200);
  // No Markdown copy: is there a page at all? Asking for HTML passes back
  // through this middleware untouched.
  headers.set('accept', 'text/html');
  const page = await fetch(url, { headers });
  if (page.ok) return answer(request, pageSummary(url, await page.text()), 200);
  return answer(request, notFoundMarkdown(url.pathname), 404);
}
