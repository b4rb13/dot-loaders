import { expect, test } from 'bun:test';
import { staticTableLayout } from 'dotquilt/wrapper';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import {
  ChartLoader,
  LoadingRegion,
  SkeletonText,
  TableLoader,
  TextLoader,
  TypingDots,
} from '../dist/index.js';

const render = (node: () => ReturnType<typeof h>) =>
  renderToString(createSSRApp({ render: node }));
const styles = (html: string) =>
  [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({
    attributes: m[1] ?? '',
    css: m[2] ?? '',
  }));

test('a skeleton renders its static drawing and pre-definition styles', async () => {
  const html = await render(() =>
    h(SkeletonText, { lines: 2, widths: [1, 0.4], mark: 'dash' }),
  );
  expect(html).toContain('<dotquilt-skeleton-text');
  expect(html).toContain('lines="2"');
  expect(html).toContain('motion="paused"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('width="100%"');
  expect(html).toContain('width="40%"');
  expect(html).toContain('mark="dash"');
  const [base, marks] = styles(html);
  // Raw CSS, not HTML-escaped, and only before definition.
  expect(base?.css).toContain(
    'dotquilt-skeleton-text:is(:not(:defined),:state(unstyled))',
  );
  expect(base?.css).not.toContain('&gt;');
  expect(marks?.attributes).toContain('SkeletonText-marks');
});

test('options become first-render attributes, never serialized objects', async () => {
  const html = await render(() =>
    h('div', [
      h(TypingDots, { preset: { kind: 'typing', count: 5, speed: 0.7 } }),
      h(ChartLoader, { preset: { kind: 'chart', variant: 'scatter' } }),
      h(TableLoader, {
        columns: [{ kind: 'text' }, { kind: 'number', width: 0.3 }],
        rows: 3,
      }),
    ]),
  );
  expect(html.match(/class="dot"/g)).toHaveLength(5);
  expect(html).toContain('count="5"');
  expect(html).toContain('speed="0.7"');
  expect(html).toContain('variant="scatter"');
  expect(html).not.toContain('preset=');
  expect(html).not.toContain('columns=');
  expect(html).not.toContain('[object Object]');
  const layout = staticTableLayout(3, undefined, [
    { kind: 'text' },
    { kind: 'number', width: 0.3 },
  ]);
  expect(html.match(/<path /g)).toHaveLength(layout.parts.length);
});

test('a pending region shows its placeholder slot, inert and hidden', async () => {
  const html = await render(() =>
    h(
      LoadingRegion,
      { state: 'pending', 'aria-label': 'Revenue' },
      {
        placeholder: () => h(SkeletonText, { lines: 2 }),
        default: () => h('article', 'content'),
      },
    ),
  );
  expect(html).toContain('state="pending"');
  expect(html).toContain('data-presentation="pending"');
  expect(html).toContain('role="group"');
  expect(html).toContain('aria-label="Revenue"');
  expect(html).toMatch(
    /<div slot="placeholder" data-dotquilt-wrapper-slot aria-hidden="true" inert>/,
  );
  expect(html).not.toMatch(/<dotquilt-region[^>]*data-dotquilt-wrapper-empty/);
  expect(html).toContain('<article>content</article>');
  const empty = await render(() => h(LoadingRegion, { state: 'pending' }));
  expect(empty).toMatch(/<dotquilt-region[^>]*data-dotquilt-wrapper-empty/);
});

test('a pending text loader hides its value and masks with the slot text', async () => {
  const html = await render(() =>
    h(TextLoader, { state: 'pending' }, { default: () => '$12,400' }),
  );
  expect(html).toContain('mask="$12,400"');
  expect(html).toMatch(
    /<span data-dotquilt-text-content aria-hidden="true" inert>\$12,400<\/span>/,
  );
  const ready = await render(() =>
    h(TextLoader, { state: 'ready' }, { default: () => '$12,400' }),
  );
  expect(ready).toMatch(/<span data-dotquilt-text-content>\$12,400<\/span>/);
});

test('a style policy reaches the styles and the host', async () => {
  const inline = await render(() =>
    h(SkeletonText, { stylePolicy: { mode: 'inline', nonce: 'abc' } }),
  );
  expect(styles(inline)[0]?.attributes).toContain('nonce="abc"');
  expect(inline).toMatch(/<dotquilt-skeleton-text[^>]*nonce="abc"/);
  const external = await render(() =>
    h(SkeletonText, {
      stylePolicy: { mode: 'external', href: '/dotquilt/skeleton-text.css' },
    }),
  );
  expect(styles(external)).toHaveLength(0);
  expect(external).toContain(
    '<link rel="stylesheet" href="/dotquilt/skeleton-text.css"',
  );
  expect(external).toContain(
    'data-dotquilt-style-href="/dotquilt/skeleton-text.css"',
  );
});

test('an invalid style policy fails before any markup', async () => {
  await expect(
    render(() =>
      h(SkeletonText, {
        stylePolicy: { mode: 'external', href: 'javascript:alert(1)' },
      }),
    ),
  ).rejects.toThrow('Invalid style policy');
});

test('each component is one element, so page selectors like :first-child still find it', async () => {
  const html = await render(() =>
    h('div', { class: 'row' }, [
      h(SkeletonText, { lines: 2 }),
      h(TypingDots),
      h(LoadingRegion, { state: 'pending' }),
    ]),
  );
  // No style or link beside a host: they sit inside it, out of every slot.
  expect(html).toMatch(/^<div class="row"><dotquilt-skeleton-text/);
  expect(html).toContain('</dotquilt-skeleton-text><dotquilt-typing-dots');
  expect(html).toContain('</dotquilt-typing-dots><dotquilt-region');
  expect(html).toMatch(
    /<dotquilt-skeleton-text[^>]*><style slot="dotquilt-wrapper-style"/,
  );
});
