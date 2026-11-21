import { expect, test } from 'bun:test';
import { staticTableLayout } from 'dotquilt/wrapper';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import {
  ChartLoader,
  LoadingRegion,
  SkeletonText,
  TableLoader,
  TextLoader,
  TypingDots,
} from '../dist/index.js';

const html = (component: unknown, props: Record<string, unknown> = {}) =>
  // biome-ignore lint/suspicious/noExplicitAny: any component, any props
  render(component as any, { props }).body.replace(/<!--[^>]*-->/g, '');
const styles = (markup: string) =>
  [...markup.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({
    attributes: m[1] ?? '',
    css: m[2] ?? '',
  }));
const snippet = (markup: string) =>
  createRawSnippet(() => ({ render: () => markup }));

test('a skeleton renders its static drawing and pre-definition styles', () => {
  const markup = html(SkeletonText, {
    lines: 2,
    widths: [1, 0.4],
    mark: 'dash',
  });
  expect(markup).toMatch(/^<dotquilt-skeleton-text/);
  expect(markup).toContain('lines="2"');
  expect(markup).toContain('motion="paused"');
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain('width="100%"');
  expect(markup).toContain('width="40%"');
  expect(markup).toContain('mark="dash"');
  const [base, marks] = styles(markup);
  expect(base?.attributes).toContain('slot="dotquilt-wrapper-style"');
  expect(base?.css).toContain(
    'dotquilt-skeleton-text:is(:not(:defined),:state(unstyled))',
  );
  expect(base?.css).not.toContain('&gt;');
  expect(marks?.attributes).toContain('SkeletonText-marks');
});

test('options become first-render attributes, never serialized objects', () => {
  const markup = [
    html(TypingDots, { preset: { kind: 'typing', count: 5, speed: 0.7 } }),
    html(ChartLoader, { preset: { kind: 'chart', variant: 'scatter' } }),
    html(TableLoader, {
      columns: [{ kind: 'text' }, { kind: 'number', width: 0.3 }],
      rows: 3,
    }),
  ].join('');
  expect(markup.match(/class="dot"/g)).toHaveLength(5);
  expect(markup).toContain('count="5"');
  expect(markup).toContain('speed="0.7"');
  expect(markup).toContain('variant="scatter"');
  expect(markup).not.toContain('preset=');
  expect(markup).not.toContain('columns=');
  expect(markup).not.toContain('[object Object]');
  const layout = staticTableLayout(3, undefined, [
    { kind: 'text' },
    { kind: 'number', width: 0.3 },
  ]);
  expect(markup.match(/<path /g)).toHaveLength(layout.parts.length);
});

test('a pending region shows its placeholder slot, inert and hidden', () => {
  const markup = html(LoadingRegion, {
    state: 'pending',
    'aria-label': 'Revenue',
    placeholder: snippet('<i>marks</i>'),
    children: snippet('<article>content</article>'),
  });
  expect(markup).toContain('state="pending"');
  expect(markup).toContain('data-presentation="pending"');
  expect(markup).toContain('role="group"');
  expect(markup).toContain('aria-label="Revenue"');
  expect(markup).toMatch(
    /<div slot="placeholder" data-dotquilt-wrapper-slot="" aria-hidden="true" inert[^>]*>\s*<i>marks<\/i>/,
  );
  expect(markup).not.toMatch(
    /<dotquilt-region[^>]*data-dotquilt-wrapper-empty/,
  );
  expect(markup).toContain('<article>content</article>');
  const empty = html(LoadingRegion, { state: 'pending' });
  expect(empty).toMatch(/<dotquilt-region[^>]*data-dotquilt-wrapper-empty/);
});

test('a pending text loader hides its value and shows its mask', () => {
  const markup = html(TextLoader, {
    state: 'pending',
    mask: '$00,000',
    children: snippet('<span>$12,400</span>'),
  });
  expect(markup).toContain('mask="$00,000"');
  expect(markup).toMatch(/<span slot="placeholder"[^>]*>\$00,000<\/span>/);
  expect(markup).toMatch(
    /<span data-dotquilt-text-content="" aria-hidden="true" inert[^>]*>/,
  );
  const ready = html(TextLoader, { state: 'ready', mask: '$00,000' });
  expect(ready).toMatch(/<span data-dotquilt-text-content="">/);
});

test('a style policy reaches the styles and the host', () => {
  const inline = html(SkeletonText, {
    stylePolicy: { mode: 'inline', nonce: 'abc' },
  });
  expect(styles(inline)[0]?.attributes).toContain('nonce="abc"');
  expect(inline).toMatch(/<dotquilt-skeleton-text[^>]*nonce="abc"/);
  const external = html(SkeletonText, {
    stylePolicy: { mode: 'external', href: '/dotquilt/skeleton-text.css' },
  });
  expect(styles(external)).toHaveLength(0);
  expect(external).toContain(
    '<link rel="stylesheet" href="/dotquilt/skeleton-text.css"',
  );
  expect(external).toContain(
    'data-dotquilt-style-href="/dotquilt/skeleton-text.css"',
  );
});

test('an invalid style policy fails before any markup', () => {
  expect(() =>
    html(SkeletonText, {
      stylePolicy: { mode: 'external', href: 'javascript:alert(1)' },
    }),
  ).toThrow('Invalid style policy');
});
