import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { LoadingRegion, SkeletonBlock } from '@dotquilt-internal/react';
import { createElement as h, Suspense, use } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

function Detail({ promise }) {
  return h('p', null, use(promise));
}
async function render(nonce) {
  const promise = new Promise((resolve) =>
    setTimeout(() => resolve(`${nonce} detail`), 40),
  );
  const chunks = [];
  await new Promise((resolve, reject) => {
    const target = new PassThrough();
    target.on('data', (chunk) => chunks.push(chunk.toString()));
    target.on('end', resolve);
    target.on('error', reject);
    const stream = renderToPipeableStream(
      h(
        LoadingRegion,
        {
          state: 'pending',
          stylePolicy: { mode: 'inline', nonce },
          placeholder: h(SkeletonBlock, {
            stylePolicy: { mode: 'inline', nonce },
          }),
        },
        h('input', { defaultValue: nonce }),
        h(
          Suspense,
          { fallback: h('p', null, 'Waiting for detail') },
          h(Detail, { promise }),
        ),
      ),
      {
        nonce,
        onShellReady() {
          stream.pipe(target);
        },
        onError: reject,
      },
    );
  });
  return { nonce, chunks, html: chunks.join('') };
}
const [a, b] = await Promise.all([
  render('node-request-a'),
  render('node-request-b'),
]);
for (const [current, other] of [
  [a, b],
  [b, a],
]) {
  assert.ok(current.chunks.length >= 2);
  assert.ok(current.chunks[0].includes('Waiting for detail'));
  assert.ok(current.html.includes(`${current.nonce} detail`));
  assert.ok(current.html.includes(`nonce="${current.nonce}"`));
  assert.ok(!current.html.includes(other.nonce));
  assert.ok(current.html.includes('data-dotquilt-static'));
}
console.log(
  JSON.stringify({
    pass: true,
    reactVersion: (await import('react')).version,
    runtime: process.versions,
    requests: [a, b].map(({ nonce, chunks, html }) => ({
      nonce,
      chunks: chunks.length,
      bytes: Buffer.byteLength(html),
      sha256: createHash('sha256').update(html).digest('hex'),
    })),
    method:
      'Actual Node renderToPipeableStream from installed adapter/native/React packages; concurrent suspended requests have separate nonces, shell/static content and final streamed detail.',
  }),
);
