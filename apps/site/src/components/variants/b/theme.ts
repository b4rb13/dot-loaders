/**
 * Calls `change` when the page switches between light and dark, by the
 * site's theme menu or the system setting. Loaders that paint on a canvas
 * read their colours once, so they need to hear about it.
 */
export function onTheme(change: () => void): void {
  new MutationObserver(change).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', change);
}
