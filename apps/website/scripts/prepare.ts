import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { previewVersion } from '../lib/example';

// Copies the built component stylesheets into public/ so pages can link them.
// Requires `packages/react` to be built first (turbo's `^build` handles this).
const root = new URL('../../../', import.meta.url);
const manifest = await Bun.file(
  new URL('packages/core/package.json', root),
).json();
if (manifest.version !== previewVersion)
  throw new Error(
    `Website shows version ${previewVersion} but packages/core is ${manifest.version}; update previewVersion in apps/website/lib/example.ts`,
  );
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
console.log(`Prepared website styles at ${fileURLToPath(destination)}`);
