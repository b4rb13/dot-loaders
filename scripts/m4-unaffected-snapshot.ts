import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { entrySignature } from './m4-entry-equivalence.js';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4'),
  packet = await Bun.file(resolve(output, 'packed-report.json')).json(),
  consumer = packet.consumer;
const hash = (data: string | Uint8Array) =>
  createHash('sha256').update(data).digest('hex');
const files: Record<string, string> = {};
const identityNeutral: Record<
  string,
  { sha256: string; replacements: number; moduleComments: number }
> = {};
for (const file of [
  'native.js',
  'react.js',
  'text.js',
  'text-react.js',
  'chart.js',
  'chart-react.js',
]) {
  const data = await readFile(resolve(output, file), 'utf8');
  files[file] = hash(data);
  identityNeutral[file] = entrySignature(data);
}
for (const pkg of ['core', 'react'])
  for (const file of [
    'skeleton',
    'skeleton-family',
    'line',
    'circle',
    'skeleton-text',
    'typing',
    'region',
    'text',
    'chart',
  ])
    files[`${pkg}/${file}.css`] = hash(
      await readFile(
        resolve(
          consumer,
          `node_modules/@dotquilt-internal/${pkg}/dist/${file}.css`,
        ),
      ),
    );
for (const file of await Array.fromAsync(
  new Bun.Glob('*.{ts,tsx}').scan(resolve(root, 'tests/m4')),
))
  files[`tests/m4/${file}`] = hash(
    await readFile(resolve(root, 'tests/m4', file)),
  );
const { createElement: h } = await import(
    resolve(consumer, 'node_modules/react/index.js')
  ),
  { renderToString } = await import(
    resolve(consumer, 'node_modules/react-dom/server.bun.js')
  );
const { Fixture } = await import(resolve(consumer, 'react.tsx')),
  { TextFixture } = await import(resolve(consumer, 'text-react.tsx')),
  { ChartFixture } = await import(resolve(consumer, 'chart-react.tsx'));
const markup: Record<string, string> = {};
for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  markup[`skeleton/${mode}`] = hash(renderToString(h(Fixture, { mode })));
  markup[`text/${mode}`] = hash(renderToString(h(TextFixture, { mode })));
  for (const variant of ['line', 'bar', 'scatter'])
    markup[`chart/${mode}/${variant}`] = hash(
      renderToString(h(ChartFixture, { mode, variant })),
    );
}
const name = process.argv[2];
if (name !== 'before' && name !== 'after')
  throw new Error('Specify before or after');
await writeFile(
  resolve(output, `table-unaffected-${name}.json`),
  `${JSON.stringify({ artifacts: packet.artifacts, files, identityNeutral, markup, scope: 'Existing M4 non-table fixtures only; exact served JS/CSS, fixture source and SSR bytes. No TableLoader or whole-package equivalence claim.' }, null, 2)}\n`,
);
console.log(
  `Captured ${Object.keys(files).length} file hashes and ${Object.keys(markup).length} SSR signatures`,
);
