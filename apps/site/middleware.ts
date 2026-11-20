/**
 * Vercel Routing Middleware: Markdown for agents.
 *
 * A request that prefers `text/markdown` (see src/lib/negotiation.ts) gets
 * the page's Markdown copy (`/` → `/index.md`, `/docs/x/` → `/docs/x.md`), an
 * HTML-only page gets a short Markdown summary, and a missing page gets a 404
 * with a Markdown body. Every other request, such as a browser's, passes
 * through to the static site untouched. Static files (anything with an
 * extension) and Vercel's own paths never run it.
 */
import {
  markdownFor,
  markdownHeaders,
  notFoundMarkdown,
  pageSummary,
  wantsMarkdown,
} from './src/lib/negotiation';

export const config = {
  matcher: ['/((?!_astro/|_vercel/|pagefind/|.*\\.[^/]+$).*)'],
};

function answer(request: Request, body: string, status: number): Response {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: markdownHeaders,
  });
}

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  if (!wantsMarkdown(request.headers.get('accept'))) return undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
  const url = new URL(request.url);
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
