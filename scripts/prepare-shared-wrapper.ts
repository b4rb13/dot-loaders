import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4-shared-wrapper');
const packet = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const consumer = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
await mkdir(output, { recursive: true });
await mkdir(resolve(consumer, 'shared-wrapper'), { recursive: true });
const hashes: Record<string, string> = {};
for (const file of [
  'client.tsx',
  'server.ts',
  'shared-wrapper.spec.ts',
  'multi-rich.spec.ts',
  'final-api.spec.ts',
]) {
  const from = resolve(root, 'tests/shared-wrapper', file),
    to = resolve(consumer, 'shared-wrapper', file);
  await cp(from, to);
  hashes[`tests/shared-wrapper/${file}`] = createHash('sha256')
    .update(await readFile(from))
    .digest('hex');
}
for (const [source, name] of [['client.tsx', 'client.js']]) {
  const build = await Bun.build({
    entrypoints: [resolve(consumer, 'shared-wrapper', source as string)],
    format: 'esm',
    target: 'browser',
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot build shared-wrapper consumer ${source}`);
  const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
  await writeFile(resolve(output, name as string), bytes);
  hashes[name as string] = createHash('sha256').update(bytes).digest('hex');
}
await writeFile(
  resolve(output, 'fixtures.json'),
  JSON.stringify({ artifacts: packet.artifacts, consumer, hashes }, null, 2) +
    '\n',
);
console.log(
  'Prepared native/React shared-wrapper fixtures from the installed private pair.',
);
