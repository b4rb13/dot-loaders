/**
 * Markdown for agents, by content negotiation (middleware.ts at the site's
 * root runs this on Vercel). A request whose Accept header prefers
 * `text/markdown` gets the page as Markdown; browsers, which ask for HTML,
 * get the page as before. Pure functions, so they are tested on their own.
 */

export const site = 'https://dotquilt.dev';

/** The headers of every Markdown answer. */
export const markdownHeaders = {
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
