import { type ComponentSlug, catalogDefaults } from './catalog';
import type { CatalogSettings } from './catalog-model';

export interface GalleryRecipe {
  readonly id: string;
  readonly title: string;
  readonly component: ComponentSlug;
  readonly idle: string;
  readonly reveal: string;
  readonly description: string;
  readonly variant?: 'line' | 'bar' | 'scatter';
  readonly cellStyle?:
    | 'auto'
    | 'text'
    | 'number'
    | 'badge'
    | 'date'
    | 'badge-text'
    | 'text-badge';
}
export const galleryRecipes: readonly GalleryRecipe[] = [
  {
    id: 'independent-characters',
    title: 'Independent characters',
    component: 'text-loader',
    idle: 'scrambleCharacters',
    reveal: 'lock',
    description:
      'Each character changes at its own pace, then locks into the real label.',
  },
  {
    id: 'word-by-word',
    title: 'Word by word',
    component: 'text-loader',
    idle: 'scrambleWords',
    reveal: 'printText',
    description:
      'Change words independently and print the real text into place.',
  },
  {
    id: 'classic-scramble',
    title: 'Classic scramble',
    component: 'text-loader',
    idle: 'scramble',
    reveal: 'lock',
    description: 'A coordinated scramble followed by a precise character lock.',
  },
  {
    id: 'travelling-label',
    title: 'Travelling label',
    component: 'text-loader',
    idle: 'labelPulse',
    reveal: 'fade',
    description: 'A travelling pulse with a quiet text fade.',
  },
  {
    id: 'chart-ridge',
    title: 'Rising ridge',
    component: 'chart-loader',
    idle: 'ridge',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied line geometry before the real chart is revealed.',
    variant: 'line',
  },
  {
    id: 'chart-scan',
    title: 'Chart scan',
    component: 'chart-loader',
    idle: 'scan',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied line geometry before the real chart is revealed.',
    variant: 'line',
  },
  {
    id: 'chart-terrain',
    title: 'Moving terrain',
    component: 'chart-loader',
    idle: 'terrain',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied line geometry before the real chart is revealed.',
    variant: 'line',
  },
  {
    id: 'chart-bars',
    title: 'Bar field',
    component: 'chart-loader',
    idle: 'bars',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied bar geometry before the real chart is revealed.',
    variant: 'bar',
  },
  {
    id: 'chart-scatter',
    title: 'Scatter field',
    component: 'chart-loader',
    idle: 'scatter',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied scatter geometry before the real chart is revealed.',
    variant: 'scatter',
  },
  {
    id: 'chart-cycle',
    title: 'Changing silhouettes',
    component: 'chart-loader',
    idle: 'cycle',
    reveal: 'morphWipe',
    description:
      'Dots converge onto the supplied line geometry before the real chart is revealed.',
    variant: 'line',
  },
  {
    id: 'table-type-on',
    title: 'Table type-on',
    component: 'table-loader',
    idle: 'typeOn',
    reveal: 'rows',
    description:
      'Type placeholder cells, converge onto actual glyphs and reveal the owned rows.',
    cellStyle: 'auto',
  },
  {
    id: 'table-shimmer-auto',
    title: 'Table shimmer \u00b7 auto',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'An auto cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'auto',
  },
  {
    id: 'table-shimmer-text',
    title: 'Table shimmer \u00b7 text',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A text cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'text',
  },
  {
    id: 'table-shimmer-number',
    title: 'Table shimmer \u00b7 number',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A number cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'number',
  },
  {
    id: 'table-shimmer-badge',
    title: 'Table shimmer \u00b7 badge',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A badge cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'badge',
  },
  {
    id: 'table-shimmer-date',
    title: 'Table shimmer \u00b7 date',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A date cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'date',
  },
  {
    id: 'table-shimmer-badge-text',
    title: 'Table shimmer \u00b7 badge-text',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A badge-text cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'badge-text',
  },
  {
    id: 'table-shimmer-text-badge',
    title: 'Table shimmer \u00b7 text-badge',
    component: 'table-loader',
    idle: 'tableShimmer',
    reveal: 'rows',
    description:
      'A text-badge cell treatment with measured glyph convergence and row reveal.',
    cellStyle: 'text-badge',
  },
  {
    id: 'skeleton-block',
    title: 'Skeleton block',
    component: 'skeleton-block',
    idle: 'pulse',
    reveal: 'dissolve',
    description:
      'Pulse a reserved block placeholder, then dissolve into stable application content.',
  },
  {
    id: 'skeleton-line',
    title: 'Skeleton line',
    component: 'skeleton-line',
    idle: 'pulse',
    reveal: 'dissolve',
    description:
      'Pulse a reserved line placeholder, then dissolve into stable application content.',
  },
  {
    id: 'skeleton-circle',
    title: 'Skeleton circle',
    component: 'skeleton-circle',
    idle: 'pulse',
    reveal: 'dissolve',
    description:
      'Pulse a reserved circle placeholder, then dissolve into stable application content.',
  },
  {
    id: 'skeleton-text',
    title: 'Skeleton text',
    component: 'skeleton-text',
    idle: 'pulse',
    reveal: 'dissolve',
    description:
      'Pulse a reserved text placeholder, then dissolve into stable application content.',
  },
  {
    id: 'typing-dots',
    title: 'Typing dots',
    component: 'typing-dots',
    idle: 'default',
    reveal: 'default',
    description:
      'A compact activity indicator inside an application-owned loading region.',
  },
  {
    id: 'coordinated-region',
    title: 'Coordinated region',
    component: 'loading-region',
    idle: 'pulse',
    reveal: 'dissolve',
    description:
      'One region coordinates an avatar and paragraph placeholder while content stays mounted.',
  },
];
export function findGalleryRecipe(id: string) {
  return galleryRecipes.find((recipe) => recipe.id === id);
}
export function componentRecipe(component: ComponentSlug) {
  const recipe = galleryRecipes.find(
    (recipe) => recipe.component === component,
  );
  if (!recipe) throw new Error('Missing component example');
  return recipe;
}
export function gallerySettings(recipe: GalleryRecipe): CatalogSettings {
  return {
    ...catalogDefaults(recipe.component),
    idle: recipe.component === 'loading-region' ? 'default' : recipe.idle,
    reveal: recipe.component === 'loading-region' ? 'default' : recipe.reveal,
    ...(recipe.variant ? { variant: recipe.variant } : {}),
    ...(recipe.cellStyle
      ? { options: { [recipe.idle]: { cellStyle: recipe.cellStyle } } }
      : {}),
  };
}
