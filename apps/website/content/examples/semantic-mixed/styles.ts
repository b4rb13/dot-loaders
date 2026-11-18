import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
await mkdir('public/dotquilt', { recursive: true });
for (const family of ['region', 'chart', 'table', 'skeleton', 'text', 'typing'])
  await copyFile(
    require.resolve(`@dotquilt-internal/react/styles/${family}.css`),
    `public/dotquilt/${family}.css`,
  );
