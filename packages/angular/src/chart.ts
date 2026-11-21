import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Animations } from 'dotquilt';
import {
  type ChartPreset,
  type ChartVariant,
  type ChartLoader as NativeChartLoader,
  registerChartLoader,
  type TargetProvider,
} from 'dotquilt/chart';
import { first, MarkLoader } from './host';
import { chartCss } from './styles.generated';

/** A field of marks that takes the shape of a chart, then hands over to it. */
@Component({
  selector: 'dotquilt-chart-loader',
  template:
    '<span data-dotquilt-wrapper-static aria-hidden="true"><span data-dotquilt-static></span></span>',
  styles: [chartCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.variant]': 'initial().variant',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class ChartLoader extends MarkLoader<NativeChartLoader> {
  /** The kind of chart it stands in for. */
  readonly variant = input<ChartVariant>();
  /** How fast the ridge and glow move, up to 4. */
  readonly speed = input<number>();
  readonly pointerResponse = input<'none' | 'lift'>();
  readonly animations = input<Animations<'chart'>>();
  readonly preset = input<ChartPreset>();
  /** Where the real chart is, for the handoff. */
  readonly targetProvider = input<TargetProvider>();
  protected readonly initial = first(() => ({
    variant: this.variant() ?? this.preset()?.variant ?? 'line',
  }));
  constructor() {
    super();
    this.connect(registerChartLoader, () => ({
      variant: this.variant(),
      speed: this.speed(),
      pointerResponse: this.pointerResponse(),
      animations: this.animations(),
      preset: this.preset(),
      targetProvider: this.targetProvider(),
    }));
  }
}
