import { expect, test } from 'bun:test';
import { catalog, catalogQuery, parseCatalogQuery } from './catalog';
import {
  componentRecipe,
  findGalleryRecipe,
  galleryRecipes,
  gallerySettings,
} from './gallery';

test('gallery covers every component and all19 first-party motion factories without duplicate URLs', () => {
  expect(new Set(galleryRecipes.map((recipe) => recipe.id)).size).toBe(24);
  expect(new Set(galleryRecipes.map((recipe) => recipe.component)).size).toBe(
    9,
  );
  expect(
    new Set(
      galleryRecipes
        .flatMap((recipe) => [recipe.idle, recipe.reveal])
        .filter((name) => name !== 'default'),
    ).size,
  ).toBe(19);
  for (const component of catalog)
    expect(componentRecipe(component.slug).component).toBe(component.slug);
  expect(findGalleryRecipe('../package.json')).toBeUndefined();
});

test('gallery links preserve every supported recipe/geometry/treatment setting', () => {
  for (const recipe of galleryRecipes) {
    const settings = gallerySettings(recipe);
    expect(
      parseCatalogQuery(catalogQuery(settings), recipe.component).settings,
    ).toEqual(settings);
  }
  const region = gallerySettings(componentRecipe('loading-region'));
  expect(region.idle).toBe('default');
  expect(region.reveal).toBe('default');
});
