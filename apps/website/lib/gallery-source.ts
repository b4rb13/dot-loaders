import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cache } from 'react';
import { findGalleryRecipe } from './gallery';

export const gallerySource = cache(async (id: string) => {
  const recipe = findGalleryRecipe(id);
  if (!recipe) throw new Error('Unknown gallery recipe');
  return readFile(
    resolve(process.cwd(), 'content/examples/gallery', `${recipe.id}.tsx`),
    'utf8',
  );
});
