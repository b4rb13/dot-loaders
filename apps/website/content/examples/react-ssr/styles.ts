import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
await mkdir('public/dotquilt', { recursive: true });
for (const family of ['region', 'skeleton'])
  await copyFile(
    require.resolve(`@dotquilt-internal/react/styles/${family}.css`),
    `public/dotquilt/${family}.css`,
  );
