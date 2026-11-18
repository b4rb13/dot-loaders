import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cache } from 'react';
export const catalogSources = cache(async () => {
  const files = {
    'src/lib/catalog-options.ts': 'lib/catalog-options.ts',
    'src/lib/catalog-authoring.ts': 'lib/catalog-authoring.ts',
    'src/lib/catalog-model.ts': 'lib/catalog-model.ts',
    'src/lib/catalog-recipes.ts': 'lib/catalog-recipes.ts',
    'src/lib/catalog-geometry.ts': 'lib/catalog-geometry.ts',
    'src/components/catalog-scene.tsx': 'components/catalog-scene.tsx',
    'public/catalog.css': 'app/catalog.css',
  };
  return Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([destination, source]) => [
        destination,
        await readFile(resolve(process.cwd(), source), 'utf8'),
      ]),
    ),
  );
});
