import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import {
  type TypingDots as NativeTypingDots,
  registerTypingDots,
  type TypingPreset,
} from 'dotquilt/typing';
import { first, MarkLoader } from './host';
import { typingCss } from './styles.generated';

/** A row of dots in a slow wave, for a reply being written. */
@Component({
  selector: 'dotquilt-typing-dots',
  template: `<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static
      >@for (dot of dots(); track $index) {<i class="dot"></i>}</span
    ></span
  >`,
  styles: [typingCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.count]': 'initial().count',
    '[attr.speed]': 'initial().speed',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class TypingDots extends MarkLoader<NativeTypingDots> {
  /** How many dots, up to 8. */
  readonly count = input<number>();
  /** How fast the wave moves, up to 4. */
  readonly speed = input<number>();
  readonly preset = input<TypingPreset>();
  protected readonly initial = first(() => {
    const dots = this.count() ?? this.preset()?.count ?? 3;
    return {
      count: Number.isInteger(dots) && dots > 0 ? Math.min(dots, 8) : 3,
      speed: this.speed() ?? this.preset()?.speed ?? 1,
    };
  });
  protected readonly dots = first(() =>
    Array.from({ length: this.initial().count }),
  );
  constructor() {
    super();
    this.connect(registerTypingDots, () => ({
      count: this.count(),
      speed: this.speed(),
      preset: this.preset(),
    }));
  }
}
