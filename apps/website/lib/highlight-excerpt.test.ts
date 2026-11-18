import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { highlightExcerpt } from './highlight-excerpt';

test('server highlighting preserves source and uses classes instead of inline styles', async () => {
  const source = "// Keep real content\nconst value = '<script> & text';\n";
  const html = renderToStaticMarkup(await highlightExcerpt(source));
  expect(html).toContain('code-comment');
  expect(html).toContain('code-keyword');
  expect(html).toContain('code-string');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('style=');
  expect(html).not.toContain('tabindex=');
  expect(html).not.toContain('<script>');
  const plain = html
    .replace(/<[^>]+>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"');
  expect(plain).toBe(source);
});
