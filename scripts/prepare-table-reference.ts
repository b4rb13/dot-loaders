import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const before = await Bun.file(
  resolve(root, '.artifacts/m4/table-size-work/before-packed.json'),
).json();
const prior = await Bun.file(
  resolve(root, 'docs/implementation/m4/table-evidence.json'),
).json();
const output = resolve(
  root,
  '.artifacts/m4/table-size-work/deterministic/reference',
);
await mkdir(output, { recursive: true });
for (const pkg of ['core', 'react']) {
  const files = Object.entries(prior.sourceArchive).filter(([path]) =>
    path.startsWith(`packages/${pkg}/dist/`),
  );
  for (const [path, sha256] of files) {
    const relative = path.slice(`packages/${pkg}/`.length);
    const actual = createHash('sha256')
      .update(
        await readFile(
          resolve(
            before.consumer,
            `node_modules/@dotquilt-internal/${pkg}/${relative}`,
          ),
        ),
      )
      .digest('hex');
    if (actual !== sha256)
      throw new Error(`Changed reference installation: ${path}`);
  }
}
for (const [name, target] of [
  ['api.ts', 'table-compare-api.ts'],
  ['client.ts', 'table-compare-client.ts'],
] as const) {
  const source = (
    await readFile(resolve(root, 'tests/table', name), 'utf8')
  ).replace("'./api.js'", "'./table-compare-api.js'");
  await writeFile(resolve(before.consumer, target), source);
}
const build = await Bun.build({
  entrypoints: [resolve(before.consumer, 'table-compare-client.ts')],
  target: 'browser',
  format: 'esm',
  minify: true,
});
if (!build.success || !build.outputs[0])
  throw new Error('Reference Table fixture build failed');
await writeFile(
  resolve(output, 'table.js'),
  new Uint8Array(await build.outputs[0].arrayBuffer()),
);
await writeFile(resolve(output, 'consumer-path'), before.consumer);
const server = (await readFile(resolve(root, 'tests/table/server.ts'), 'utf8'))
  .replace(
    "resolve(import.meta.dir, '../..')",
    "resolve(import.meta.dir, '../../../../..')",
  )
  .replace(
    "output = resolve(root, '.artifacts/m4')",
    "output = resolve(root, '.artifacts/m4/table-size-work/deterministic/reference')",
  )
  .replace('port: 4197', 'port: 4198');
await writeFile(resolve(output, 'server.ts'), server);
await writeFile(
  resolve(output, 'reference.json'),
  `${JSON.stringify(
    {
      artifacts: before.artifacts,
      source:
        'Current unchanged fixture source compiled from hash-verified installed immutable previous native/React dist files',
      consumer: before.consumer,
    },
    null,
    2,
  )}\n`,
);
console.log('Reference Table fixture uses immutable original package bytes');
