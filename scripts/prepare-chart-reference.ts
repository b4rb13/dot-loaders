import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  out = resolve(root, '.artifacts/m4/chart-size-development/baseline');
await mkdir(out, { recursive: true });
const consumer = await mkdtemp(resolve(tmpdir(), 'dotquilt-chart-baseline-'));
await mkdir(resolve(consumer, 'node_modules/@dotquilt-internal'), {
  recursive: true,
});
await writeFile(
  resolve(consumer, 'package.json'),
  JSON.stringify({ private: true, type: 'module' }),
);
for (const name of ['core', 'react']) {
  const archive = resolve(
    root,
    '.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796',
  );
  const reference = await Bun.file(resolve(archive, 'evidence.json')).json();
  const tarball = resolve(archive, 'artifacts', `${name}.tgz`);
  if (
    createHash('sha256')
      .update(await readFile(tarball))
      .digest('hex') !== reference.artifactFiles[`artifacts/${name}.tgz`]
  )
    throw new Error('Changed immutable reference package');
  const target = resolve(consumer, 'node_modules/@dotquilt-internal', name);
  await mkdir(target);
  const p = Bun.spawn([
    'tar',
    '-xf',
    tarball,
    '--strip-components=1',
    '-C',
    target,
  ]);
  if (await p.exited) throw Error('tar');
}
const current = (
  await readFile(resolve(root, '.artifacts/m4/consumer-path'), 'utf8')
).trim();
for (const name of ['react', 'react-dom', 'scheduler']) {
  await symlink(
    resolve(current, 'node_modules', name),
    resolve(consumer, 'node_modules', name),
  );
}
for (const file of [
  'client.ts',
  'react.tsx',
  'text-client.ts',
  'text-react.tsx',
  'chart-client.ts',
  'chart-react.tsx',
]) {
  await writeFile(
    resolve(consumer, file),
    await readFile(resolve(root, 'tests/m4', file)),
  );
  const b = await Bun.build({
    entrypoints: [resolve(consumer, file)],
    target: 'browser',
    format: 'esm',
    minify: false,
  });
  if (!b.success || !b.outputs[0]) throw Error(JSON.stringify(b.logs));
  await Bun.write(
    resolve(
      out,
      file === 'chart-client.ts'
        ? 'chart.js'
        : file === 'chart-react.tsx'
          ? 'chart-react.js'
          : file === 'text-client.ts'
            ? 'text.js'
            : file === 'text-react.tsx'
              ? 'text-react.js'
              : file === 'client.ts'
                ? 'native.js'
                : 'react.js',
    ),
    b.outputs[0],
  );
}
await writeFile(resolve(out, 'consumer-path'), consumer);
let server = await readFile(resolve(root, 'tests/m4/server.ts'), 'utf8');
server = server
  .replace(
    "const root = resolve(import.meta.dir, '../..');",
    `const root=${JSON.stringify(root)};`,
  )
  .replace(
    "const output = resolve(root, '.artifacts/m4');",
    `const output=${JSON.stringify(out)};`,
  )
  .replace('port: 4194', 'port: 4195');
await writeFile(resolve(out, 'server.ts'), server);
console.log(out);
