import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { LoadingRegion, SkeletonBlock } from '@dotquilt-internal/react';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

const gzip = (value) => gzipSync(value, { level: 9 }).length;
const bytes = (value) => Buffer.byteLength(value, 'utf8');
const ownBytes = (html) =>
  bytes(
    html
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '')
      .replace('<span>Application outcome</span>', '')
      .replace('<span>Supplied placeholder</span>', ''),
  );
const results = {};
for (const mode of ['inline', 'nonce', 'external']) {
  const policy = (family) =>
    mode === 'external'
      ? { mode: 'external', href: `/dotquilt/${family}.css` }
      : mode === 'nonce'
        ? { mode: 'inline', nonce: 'request-specific-nonce' }
        : { mode: 'inline' };
  const primitive = renderToString(
    h(SkeletonBlock, { stylePolicy: policy('skeleton') }),
  );
  const region = renderToString(
    h(
      LoadingRegion,
      {
        state: 'pending',
        stylePolicy: policy('region'),
        placeholder: h('span', null, 'Supplied placeholder'),
      },
      h('span', null, 'Application outcome'),
    ),
  );
  const maximumPolicy =
    mode === 'external'
      ? { mode: 'external', href: `/${"'".repeat(2047)}` }
      : { mode: 'inline', nonce: '"'.repeat(256) };
  const maximum = renderToString(
    h(
      LoadingRegion,
      {
        state: 'pending',
        cycle: 'c'.repeat(32768),
        stylePolicy: maximumPolicy,
      },
      h('span', null, 'Application outcome'),
    ),
  );
  const maximumPrimitive = renderToString(
    h(SkeletonBlock, { stylePolicy: maximumPolicy }),
  );
  const plain = h(
    'main',
    null,
    Array.from({ length: 6 }, (_, i) =>
      h('section', { key: i }, h('p', null, `Account ${i} outcome`)),
    ),
  );
  const decorated = h(
    'main',
    null,
    Array.from({ length: 6 }, (_, i) =>
      h(
        'section',
        { key: i },
        h(
          LoadingRegion,
          {
            state: 'pending',
            cycle: String(i),
            stylePolicy: policy('region'),
            placeholder: Array.from({ length: 4 }, (_, j) =>
              h(SkeletonBlock, { key: j, stylePolicy: policy('skeleton') }),
            ),
          },
          h('p', null, `Account ${i} outcome`),
        ),
      ),
    ),
  );
  const plainHTML = renderToString(plain),
    decoratedHTML = renderToString(decorated);
  const assets =
    mode === 'external'
      ? ['skeleton', 'region'].map((family) => ({
          path: `/dotquilt/${family}.css`,
          bytes: bytes(
            readFileSync(
              `node_modules/@dotquilt-internal/react/dist/${family}.css`,
            ),
          ),
          gzip: gzip(
            readFileSync(
              `node_modules/@dotquilt-internal/react/dist/${family}.css`,
            ),
          ),
        }))
      : [];
  const additionalGzip =
    Math.max(0, gzip(decoratedHTML) - gzip(plainHTML)) +
    assets.reduce((sum, a) => sum + a.gzip, 0);
  for (let warmup = 0; warmup < 3; warmup++) renderToString(decorated);
  const samples = Array.from({ length: 20 }, () => {
    const start = performance.now();
    renderToString(decorated);
    return performance.now() - start;
  });
  const sorted = [...samples].sort((a, b) => a - b),
    p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  results[mode] = {
    primitiveOwnBytes: ownBytes(primitive),
    regionOwnBytes: ownBytes(region),
    maximumOwnBytes: ownBytes(maximum),
    maximumPrimitiveOwnBytes: ownBytes(maximumPrimitive),
    maximumAllTransmittedBytes: bytes(maximum),
    maximumAllMarkupExcludingCssText: bytes(
      maximum.replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/g, '$1$2'),
    ),
    maximumInput:
      '2048-character valid external URL with maximal HTML escaping or 256-character nonce with maximal escaping; 32768-character opaque cycle delivered on commit without SSR identity serialization. Arbitrary application HTML attributes are application output.',
    plain: { bytes: bytes(plainHTML), gzip: gzip(plainHTML) },
    decorated: {
      bytes: bytes(decoratedHTML),
      gzip: gzip(decoratedHTML),
      surfaces: 24,
      regions: 6,
    },
    assets,
    additionalGzip,
    warmHelper: {
      samples,
      p95,
      localUnder20ms: p95 <= 20,
      referenceQualification: 'unverified: approved M1 Air device unavailable',
    },
    pass:
      ownBytes(primitive) <= 1024 &&
      ownBytes(region) <= 2048 &&
      ownBytes(maximum) <= 16384 &&
      ownBytes(maximumPrimitive) <= 16384 &&
      additionalGzip <= 8192,
  };
}
console.log(
  JSON.stringify({
    runtime: process.versions,
    results,
    pass: Object.values(results).every((result) => result.pass),
  }),
);
