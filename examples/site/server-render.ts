import { renderStatic } from '@dotquilt-internal/core/server';

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? '&#39;',
  );

/**
 * Server-renders the revenue card: the region and its placeholder come from
 * Dotquilt, your content from your own template. Works in Node, Bun or Deno.
 */
export function revenueCard(revenue: string | null, nonce?: string): string {
  // The same policy as your Content-Security-Policy header, for the region
  // and its placeholder alike.
  const stylePolicy = { mode: 'inline' as const, ...(nonce ? { nonce } : {}) };
  const region = renderStatic({
    kind: 'region',
    state: revenue === null ? 'pending' : 'ready',
    label: 'Revenue this month',
    placeholder: { kind: 'skeleton-text', lines: 2, stylePolicy },
    stylePolicy,
  });
  const content = `<article class="card"><h2>Revenue</h2><p>${escapeHtml(
    revenue ?? '',
  )}</p></article>`;
  // Your content goes inside the region, after the placeholder.
  return region.replace('</dotquilt-region>', `${content}</dotquilt-region>`);
}
