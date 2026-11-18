import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m4-api');
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
await mkdir(output, { recursive: true });
await cp(resolve(root, 'examples/api'), resolve(consumer, 'examples/api'), {
  recursive: true,
});
await cp(resolve(root, 'tests/api'), resolve(consumer, 'tests/api'), {
  recursive: true,
});
const hashes: Record<string, string> = {};
for (const [entry, name] of [
  ['native.ts', 'native.js'],
  ['react.tsx', 'react.js'],
] as const) {
  const build = await Bun.build({
    entrypoints: [resolve(consumer, 'tests/api', entry)],
    format: 'esm',
    target: 'browser',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`API example build failed: ${build.logs}`);
  const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
  await writeFile(resolve(output, name), bytes);
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
}
const { artifacts } = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
await writeFile(
  resolve(output, 'fixtures.json'),
  `${JSON.stringify({ artifacts, consumer, hashes }, null, 2)}\n`,
);
