import type { Animations, Rect } from './animations.js';
import { chartStyles } from './chart-styles.js';
import { chartAppearance } from './internal/chart-appearance.js';
import {
  defaultMorphWipe,
  defaultRidge,
} from './internal/chart-definitions.js';
import {
  chartProjection,
  emptyChartInput,
} from './internal/chart-projection.js';
import {
  DenseLoader,
  type PointerResponse,
  type Projector,
} from './internal/dense-loader.js';
import { node, register, upgradeProperties } from './internal/dom.js';
import type { Preset } from './internal/preset.js';
import { chartPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import type { Motion, StylePolicy } from './types.js';
export type ChartVariant = 'line' | 'bar' | 'scatter';
export interface Point {
  readonly x: number;
  readonly y: number;
}
export type ChartInput =
  | Readonly<{ kind: 'line'; points: readonly Point[]; baseline: number }>
  | Readonly<{ kind: 'bar'; bars: readonly Rect[]; baseline: number }>
  | Readonly<{ kind: 'scatter'; points: readonly Point[] }>;
export type TargetGeometry =
  | ChartInput
  | Readonly<{ kind: 'points'; points: readonly Point[] }>
  | Readonly<{ kind: 'rects'; rects: readonly Rect[] }>;
export type TargetProvider = (
  bounds: Readonly<{ width: number; height: number }>,
) => TargetGeometry | null;
export type ChartPreset = import('./internal/preset.js').Preset<'chart'>;

export class ChartLoader extends DenseLoader<'chart', TargetProvider> {
  static override observedAttributes = [
    ...DenseLoader.observedAttributes,
    'variant',
  ];
  protected readonly family = 'chart';
  protected readonly styles = chartStyles;
  protected readonly appearanceKey = chartAppearance;
  protected readonly emptyInput = emptyChartInput;
  protected defaultIdle() {
    return defaultRidge;
  }
  protected defaultHandoff() {
    return defaultMorphWipe;
  }
  protected createSurface(document: Document): Node {
    return node(document, 'div', {
      class: 'surface',
      part: 'surface',
      'aria-hidden': 'true',
    });
  }
  protected projector(
    provider: TargetProvider | undefined,
  ): Projector<'chart'> {
    const variant = this.variant;
    return (bounds, report) =>
      chartProjection(provider, bounds, variant, report);
  }
  protected override upgrade(): void {
    super.upgrade();
    upgradeProperties(this, ['variant']);
  }
  protected override capturePreset(value: Preset<'chart'>): Preset<'chart'> {
    return capturePresetData(value, 'chart', () => chartPreset);
  }
  protected override prepareConnection(): void {
    // Remove static preset decoration before replaying explicit caller properties.
    const marker = 'data-dotquilt-preset-variant';
    const decoration = this.getAttribute(marker);
    if (decoration === null) return;
    if (
      !Object.hasOwn(this, 'variant') &&
      this.getAttribute('variant') === decoration
    )
      this.removeAttribute('variant');
    this.removeAttribute(marker);
  }

  get variant(): ChartVariant {
    const value = this.getAttribute('variant') ?? this.preset?.variant;
    return value === 'bar' || value === 'scatter' ? value : 'line';
  }
  set variant(value: ChartVariant | undefined) {
    if (value === undefined) this.removeAttribute('variant');
    else this.setAttribute('variant', value);
  }

  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (
      name === 'variant' &&
      value !== null &&
      !['line', 'bar', 'scatter'].includes(value)
    )
      this.invalidOption(name);
    super.attributeChangedCallback(name, old, value);
  }

  update(
    patch: Readonly<{
      variant?: ChartVariant | undefined;
      speed?: number | undefined;
      pointerResponse?: PointerResponse | undefined;
      animations?: Animations<'chart'> | undefined;
      preset?: ChartPreset | undefined;
      targetProvider?: TargetProvider | undefined;
      motion?: Motion | undefined;
      stylePolicy?: StylePolicy | undefined;
    }>,
  ): void {
    this.applyOptions(patch);
  }
  protected override get optionNames(): readonly string[] {
    return [...super.optionNames, 'variant'];
  }
}
export function registerChartLoader(): void {
  register('dotquilt-chart-loader', ChartLoader);
}
export { refreshStyles } from './internal/element.js';
