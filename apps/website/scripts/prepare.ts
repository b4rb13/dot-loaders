import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { previewVersion } from '../lib/example';

const root = new URL('../../../', import.meta.url);
const freeze = await Bun.file(
  new URL('docs/implementation/m5/runtime-freeze.json', root),
).json();
for (const [path, expected] of Object.entries(freeze.files)) {
  const actual = createHash('sha256')
    .update(await readFile(new URL(path, root)))
    .digest('hex');
  if (actual !== expected) throw new Error(`Frozen runtime changed: ${path}`);
}
for (const artifact of Object.values(freeze.artifacts) as {
  path: string;
  sha256: string;
}[]) {
  if (
    createHash('sha256')
      .update(await readFile(artifact.path))
      .digest('hex') !== artifact.sha256
  )
    throw new Error('Frozen tarball changed');
}
const manifest = await Bun.file(
  new URL('packages/core/package.json', root),
).json();
if (manifest.version !== previewVersion)
  throw new Error('Website preview version differs from the frozen package');
const destination = new URL('../public/dotquilt/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const family of [
  'region',
  'skeleton',
  'line',
  'circle',
  'skeleton-text',
  'typing',
  'text',
  'chart',
  'table',
])
  await writeFile(
    new URL(`${family}.css`, destination),
    await readFile(new URL(`packages/react/dist/${family}.css`, root)),
  );
console.log(
  `Verified ${Object.keys(freeze.files).length} frozen files; prepared website styles at ${fileURLToPath(destination)}`,
);
