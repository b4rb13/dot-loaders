import { expect, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import {
  ChartLoader,
  LoadingRegion,
  SkeletonBlock,
  TextLoader,
  TypingDots,
} from '../dist/index.js';

test('SSR derives geometry from local presets without serializing configuration or request state', () => {
  const typing = renderToString(
    h(TypingDots, { preset: { kind: 'typing', count: 5, speed: 0.7 } }),
  );
  expect(typing.match(/class="dot"/g)).toHaveLength(5);
  expect(typing).toContain('count="5"');
  expect(typing).toContain('motion="paused"');
  expect(typing).not.toContain('preset=');
  const chart = renderToString(
    h(ChartLoader, { preset: { kind: 'chart', variant: 'scatter' } }),
  );
  expect(chart).toContain('variant="scatter"');
  const region = renderToString(
    h(
      LoadingRegion,
      {
        preset: { kind: 'region', timing: { duration: 700 } },
        state: 'pending',
      },
      'content',
    ),
  );
  expect(region).not.toContain('700');
  expect(region).toContain('state="pending"');
});

test('TextLoader SSR preserves zero/escaped text and bounds the decorative long-text footprint', () => {
  expect(
    renderToString(h(TextLoader, { state: 'pending', mask: '000' }, 0)),
  ).toContain('>0</span>');
  expect(renderToString(h(TextLoader, null, '<b>&'))).toContain(
    '&lt;b&gt;&amp;',
  );
  const value = 'x'.repeat(10000);
  const html = renderToString(h(TextLoader, { state: 'pending' }, value));
  expect(html.split(value)).toHaveLength(2);
  expect(html.length - value.length).toBeLessThan(8192);
  expect(html).toMatch(
    /data-dotquilt-text-content="" data-dotquilt-react-host="[^"]+" aria-hidden="true" inert=""/,
  );
});

test('normal SSR is static, escaped and keeps available content in application-owned light DOM', () => {
  const html = renderToString(
    h(
      LoadingRegion,
      {
        state: 'pending',
        cycle: '<request>',
        placeholder: h(SkeletonBlock),
        'aria-label': 'Account',
      },
      h('input', { defaultValue: '<value>' }),
    ),
  );
  expect(html).toContain('state="pending"');
  expect(html).toContain('motion="paused"');
  expect(html).not.toContain('cycle=');
  expect(html).toContain('data-dotquilt-static');
  expect(html).toContain('value="&lt;value&gt;"');
  expect(html).not.toContain('inert="">' + '<input');
  expect(html).not.toContain('shadowrootmode');
});
test('independent server renders do not share style authorization or loading state', async () => {
  const [a, b] = await Promise.all(
    ['A', 'B'].map(async (nonce) =>
      renderToString(
        h(
          LoadingRegion,
          {
            state: nonce === 'A' ? 'pending' : 'ready',
            stylePolicy: { mode: 'inline', nonce },
          },
          nonce,
        ),
      ),
    ),
  );
  expect(a).toContain('nonce="A"');
  expect(a).not.toContain('nonce="B"');
  expect(b).toContain('state="ready"');
  expect(b).not.toContain('nonce="A"');
});
test('unsafe initial style policies fail before emitting a stylesheet; external styles have no inline CSS', () => {
  expect(() =>
    renderToString(
      h(SkeletonBlock, {
        stylePolicy: { mode: 'external', href: 'javascript:alert(1)' },
      }),
    ),
  ).toThrow('Invalid style policy');
  const html = renderToString(
    h(SkeletonBlock, {
      stylePolicy: { mode: 'external', href: '/skeleton.css' },
    }),
  );
  expect(html).toContain('href="/skeleton.css"');
  expect(html).not.toContain('<style');
});

test('ready zero and empty outcomes are not replaced by loading markup', () => {
  const zero = renderToString(h(LoadingRegion, null, 0));
  const empty = renderToString(h(LoadingRegion, null, ''));
  expect(zero).toContain('>0</dotquilt-region>');
  expect(zero).toContain('state="ready"');
  expect(empty).toContain('state="ready"');
  expect(empty).not.toContain('slot="placeholder"');
});

test('ChartLoader SSR is decorative and never samples or serializes a provider, preset or animation', () => {
  let called = 0;
  const html = renderToString(
    h(
      LoadingRegion,
      {
        state: 'pending',
        placeholder: h(ChartLoader, {
          variant: 'bar',
          targetProvider: () => {
            called++;
            return null;
          },
        }),
      },
      h('button', { type: 'button' }, 'Actual chart'),
    ),
  );
  expect(called).toBe(0);
  expect(html).toContain('variant="bar"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('Actual chart');
  expect(html).not.toContain('targetProvider');
});
