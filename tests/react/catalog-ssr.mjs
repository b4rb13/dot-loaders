import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import { gzipSync } from 'node:zlib';
import {
  ChartLoader,
  LoadingRegion,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
  TableLoader,
  TextLoader,
  TypingDots,
} from '@dotquilt/react';
import { renderStatic } from 'dotquilt/server';

const root = {
  SkeletonBlock,
  SkeletonLine,
  SkeletonCircle,
  SkeletonText,
  TypingDots,
  TextLoader,
  ChartLoader,
  TableLoader,
  LoadingRegion,
};

import { createElement as h, Suspense, use, version } from 'react';
import * as serverRendering from 'react-dom/server';

const renderToString = serverRendering.renderToString;
const renderToPipeableStream = Reflect.get(
  serverRendering,
  'renderToPipeableStream',
);
const renderToReadableStream = Reflect.get(
  serverRendering,
  'renderToReadableStream',
);

assert.equal(typeof document, 'undefined');
assert.equal(typeof window, 'undefined');
const entries = [
  ['SkeletonBlock', 'skeleton', 'skeleton-block', {}, {}],
  ['SkeletonLine', 'skeleton', 'skeleton-line', {}, {}],
  ['SkeletonCircle', 'skeleton', 'skeleton-circle', {}, {}],
  [
    'SkeletonText',
    'skeleton',
    'skeleton-text',
    {},
    { lines: 50, widths: Array(50).fill(0.5) },
  ],
  ['TypingDots', 'typing', 'typing-dots', {}, { count: 8 }],
  [
    'TextLoader',
    'text',
    'text-loader',
    { children: 0 },
    {
      children: 'X'.repeat(256),
      mask: '"'.repeat(256),
      cycle: 'c'.repeat(32768),
    },
  ],
  [
    'ChartLoader',
    'chart',
    'chart-loader',
    {
      targetProvider() {
        throw Error('SSR chart provider');
      },
    },
    {
      variant: 'scatter',
      targetProvider() {
        throw Error('SSR chart provider');
      },
    },
  ],
  [
    'TableLoader',
    'table',
    'table-loader',
    {
      targetProvider() {
        throw Error('SSR table provider');
      },
    },
    {
      rows: 100,
      rowHeight: Number.MAX_SAFE_INTEGER / 100,
      columns: Array.from({ length: 20 }, () => ({ kind: 'text', width: 1 })),
      targetProvider() {
        throw Error('SSR table provider');
      },
    },
  ],
  [
    'LoadingRegion',
    'region',
    'region',
    { children: 'Application outcome', placeholder: 'Supplied placeholder' },
    { children: 'Application outcome', cycle: 'c'.repeat(32768) },
  ],
];
for (const [name, family] of entries) {
  const selected = await import(`@dotquilt/react/${family}`);
  assert.equal(root[name], selected[name]);
}
const byte = (s) => Buffer.byteLength(s),
  gzip = (s) => gzipSync(s, { level: 9 }).length;
const nonStyle = (html) =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '');
const own = (html, props) =>
  byte(
    nonStyle(html)
      .replace(String(props.children ?? ''), '')
      .replace(String(props.placeholder ?? ''), ''),
  );
const observations = [],
  rawOutputs = [];
for (const mode of ['inline', 'nonce', 'external'])
  for (const state of ['ready', 'pending', 'refreshing'])
    for (const [name, family, kind, defaults, maximum] of entries) {
      const css =
        kind === 'skeleton-line'
          ? 'line'
          : kind === 'skeleton-circle'
            ? 'circle'
            : kind === 'skeleton-text'
              ? 'skeleton-text'
              : kind === 'skeleton-block'
                ? 'skeleton'
                : family;
      const policy =
        mode === 'external'
          ? { mode: 'external', href: `/dotquilt/${css}.css` }
          : mode === 'nonce'
            ? { mode: 'inline', nonce: 'catalog-request' }
            : { mode: 'inline' };
      const maxPolicy =
        mode === 'external'
          ? { mode: 'external', href: `/${"'".repeat(2047)}` }
          : { mode: 'inline', nonce: '"'.repeat(256) };
      const props = {
        ...defaults,
        ...(name === 'TextLoader' || name === 'LoadingRegion' ? { state } : {}),
        stylePolicy: policy,
      };
      const max = { ...props, ...maximum, stylePolicy: maxPolicy };
      const html = renderToString(h(root[name], props)),
        maxHTML = renderToString(h(root[name], max));
      assert.ok(html.includes(`<dotquilt-${kind}`));
      assert.ok(
        !html.includes('[object Object]') &&
          !html.includes('targetProvider=') &&
          !html.includes('cycle='),
      );
      assert.ok(html.includes('motion="paused"'));
      assert.ok(
        !html.includes('setInterval') &&
          !html.includes('requestAnimationFrame'),
      );
      const nativeDescription = {
        kind,
        ...(name === 'TextLoader'
          ? { text: props.children, mask: props.mask, state }
          : name === 'LoadingRegion'
            ? {
                state,
                label: 'Application outcome',
                placeholder: { kind: 'skeleton-block' },
              }
            : {}),
        stylePolicy: policy,
      };
      if (name === 'LoadingRegion') delete nativeDescription.placeholder;
      const nativeHTML = renderStatic(nativeDescription);
      const nativeMaximumDescription = {
        ...nativeDescription,
        stylePolicy: maxPolicy,
      };
      for (const field of [
        'lines',
        'widths',
        'count',
        'rows',
        'rowHeight',
        'columns',
        'variant',
        'mask',
      ])
        if (field in maximum) nativeMaximumDescription[field] = maximum[field];
      if (name === 'TextLoader')
        nativeMaximumDescription.text = maximum.children;
      const nativeMaximumHTML = renderStatic(nativeMaximumDescription);
      rawOutputs.push({
        mode,
        state,
        name,
        html,
        maxHTML,
        nativeHTML,
        nativeMaximumHTML,
      });
      assert.ok(nativeHTML.includes(`dotquilt-${kind}`));
      const limit = [
        'LoadingRegion',
        'TextLoader',
        'ChartLoader',
        'TableLoader',
      ].includes(name)
        ? 2048
        : 1024;
      observations.push({
        mode,
        state,
        name,
        css,
        defaultOwnBytes: own(html, props),
        maximumOwnBytes: own(maxHTML, max),
        defaultLimit: limit,
        maximumLimit: 16384,
        defaultPass: own(html, props) <= limit,
        maximumPass: own(maxHTML, max) <= 16384,
        transmittedBytes: byte(html),
        transmittedGzip: gzip(html),
        maximumTransmittedBytes: byte(maxHTML),
        nativeBytes: byte(nativeHTML),
        nativeOwnBytes: byte(nonStyle(nativeHTML)),
        nativeMaximumOwnBytes: byte(nonStyle(nativeMaximumHTML)),
        nativeDefaultPass: byte(nonStyle(nativeHTML)) <= limit,
        nativeMaximumPass: byte(nonStyle(nativeMaximumHTML)) <= 16384,
      });
    }
const assets = [
  'skeleton',
  'line',
  'circle',
  'skeleton-text',
  'typing',
  'text',
  'chart',
  'table',
  'region',
].map((family) => {
  const css = readFileSync(`node_modules/@dotquilt/react/dist/${family}.css`);
  return { family, bytes: css.length, gzip: gzip(css) };
});
// Gzip bytes the loaders add to a 24-surface page, including every external
// stylesheet. 9 KB since the alternative marks, 9.5 KB since the refresh cue
// (owner decisions, 2026-11-19).
const documentLimit = 9728;
const documents = [],
  rawDocuments = [];
for (const mode of ['inline', 'nonce', 'external']) {
  const plain = renderToString(
    h(
      'main',
      null,
      Array.from({ length: 6 }, (_, i) =>
        h('section', { key: i }, `Outcome ${i}`),
      ),
    ),
  );
  const decoratedTree = h(
    'main',
    null,
    Array.from({ length: 6 }, (_, i) =>
      h(
        root.LoadingRegion,
        {
          key: i,
          state: 'pending',
          stylePolicy:
            mode === 'external'
              ? { mode: 'external', href: '/dotquilt/region.css' }
              : {
                  mode: 'inline',
                  ...(mode === 'nonce' ? { nonce: 'catalog-cohort' } : {}),
                },
          placeholder: Array.from({ length: 4 }, (_, j) => {
            const [name, family, kind, props] = entries[(i * 4 + j) % 8];
            const css =
              kind === 'skeleton-block'
                ? 'skeleton'
                : kind === 'skeleton-line'
                  ? 'line'
                  : kind === 'skeleton-circle'
                    ? 'circle'
                    : kind === 'skeleton-text'
                      ? 'skeleton-text'
                      : family;
            return h(root[name], {
              ...props,
              key: j,
              stylePolicy:
                mode === 'external'
                  ? { mode: 'external', href: `/dotquilt/${css}.css` }
                  : {
                      mode: 'inline',
                      ...(mode === 'nonce' ? { nonce: 'catalog-cohort' } : {}),
                    },
            });
          }),
        },
        h('section', null, `Outcome ${i}`),
      ),
    ),
  );
  const decorated = renderToString(decoratedTree);
  rawDocuments.push({ mode, plainHTML: plain, decoratedHTML: decorated });
  const helper = () => renderToString(decoratedTree);
  for (let warmup = 0; warmup < 3; warmup++) helper();
  const samples = Array.from({ length: 20 }, () => {
    const start = performance.now();
    helper();
    return performance.now() - start;
  });
  const sorted = [...samples].sort((a, b) => a - b),
    p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const additionalGzip =
    Math.max(0, gzip(decorated) - gzip(plain)) +
    (mode === 'external' ? assets.reduce((s, a) => s + a.gzip, 0) : 0);
  documents.push({
    mode,
    decoratedBytes: byte(decorated),
    decoratedGzip: gzip(decorated),
    plainBytes: byte(plain),
    plainGzip: gzip(plain),
    surfaces: 24,
    regions: 6,
    assets: mode === 'external' ? assets : [],
    additionalGzip,
    warmHelper: {
      warmups: 3,
      samples,
      p95,
      localUnder20ms: p95 <= 20,
      referenceQualification:
        'unverified: approved reference hardware unavailable; local diagnostic only',
    },
    limit: documentLimit,
    pass: additionalGzip <= documentLimit,
  });
}
function Deferred({ promise }) {
  return h('p', null, use(promise));
}
async function stream(nonce) {
  const chunks = [];
  const promise = new Promise((resolve) =>
    setTimeout(() => resolve(`${nonce} resolved`), 80),
  );
  const tree = h(
    'main',
    null,
    entries.map(([name, , , props]) =>
      h(root[name], {
        ...props,
        key: name,
        stylePolicy: { mode: 'inline', nonce },
      }),
    ),
    h(
      Suspense,
      { fallback: h('p', null, 'Waiting for catalog') },
      h(Deferred, { promise }),
    ),
  );
  if (typeof renderToPipeableStream === 'function') {
    await new Promise((resolve, reject) => {
      const out = new PassThrough();
      out.on('data', (c) => chunks.push(c.toString()));
      out.on('end', resolve);
      out.on('error', reject);
      const task = renderToPipeableStream(tree, {
        nonce,
        onShellReady() {
          task.pipe(out);
        },
        onError: reject,
      });
    });
  } else {
    const body = await renderToReadableStream(tree, { nonce });
    for await (const bytes of body)
      chunks.push(new TextDecoder().decode(bytes));
  }
  return { nonce, chunks, html: chunks.join('') };
}
const [a, b] = await Promise.all([stream('catalog-a'), stream('catalog-b')]);
for (const [current, other] of [
  [a, b],
  [b, a],
]) {
  assert.ok(current.chunks.length >= 2);
  const shell = current.chunks.findIndex((chunk) =>
    chunk.includes('Waiting for catalog'),
  );
  const final = current.chunks.findIndex((chunk) =>
    chunk.includes(`${current.nonce} resolved`),
  );
  assert.ok(shell >= 0 && final > shell);
  assert.ok(current.html.includes(`${current.nonce} resolved`));
  assert.ok(!current.html.includes(other.nonce));
  for (const [, , kind] of entries)
    assert.ok(current.html.includes(`<dotquilt-${kind}`));
}
writeFileSync(
  `catalog-ssr-output-${process.versions.bun ? 'bun' : 'node'}.json`,
  JSON.stringify({ components: rawOutputs, documents: rawDocuments }),
);
console.log(
  JSON.stringify({
    runtime: process.versions,
    reactVersion: version,
    functionalPass: true,
    observations,
    documents,
    streaming: [a, b].map(({ nonce, chunks, html }) => ({
      nonce,
      chunks: chunks.length,
      bytes: byte(html),
    })),
    numericPass:
      observations.every(
        (o) =>
          o.defaultPass &&
          o.maximumPass &&
          o.nativeDefaultPass &&
          o.nativeMaximumPass,
      ) && documents.every((d) => d.pass),
    qualification:
      'Local artifact/SSR evidence; timings, reference devices, owner visual and full release qualification remain separate.',
  }),
);
