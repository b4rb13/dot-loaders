import type { RecipeOptions } from './catalog-options';
export type ComponentSlug =
  | 'text-loader'
  | 'chart-loader'
  | 'table-loader'
  | 'skeleton-block'
  | 'skeleton-line'
  | 'skeleton-circle'
  | 'skeleton-text'
  | 'typing-dots'
  | 'loading-region';
export type CatalogSettings = Readonly<{
  component: ComponentSlug;
  integration: 'react' | 'native';
  idle: string;
  reveal: string;
  speed: 'auto' | 0.5 | 1 | 2;
  mode: 'direct' | 'preset' | 'custom';
  options: RecipeOptions;
  pointer: 'none' | 'lift';
  variant: 'line' | 'bar' | 'scatter';
  rows: 3 | 5;
  lines: 1 | 3 | 5;
  count: 3 | 5 | 8;
  duration: 'auto' | '0' | '300' | '900';
  sample: 'latin' | 'zero' | 'international';
}>;
export const textSamples = {
  latin: 'DOTS BECOME WORDS',
  zero: '0',
  international: 'こんにちは世界',
} as const;
