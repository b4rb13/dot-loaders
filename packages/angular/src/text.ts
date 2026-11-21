import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Animations, LoadingState, Timing } from 'dotquilt';
import {
  type TextLoader as NativeTextLoader,
  registerTextLoader,
  type TextPreset,
} from 'dotquilt/text';
import { first, MarkLoader } from './host';
import { textCss } from './styles.generated';

/**
 * A value in the making: characters in marks that lock into the real text.
 * Its content is the value; `mask` gives the placeholder its shape in the
 * server HTML.
 */
@Component({
  selector: 'dotquilt-text-loader',
  template: `<span
      slot="placeholder"
      data-dotquilt-text-placeholder=""
      aria-hidden="true"
      inert
      >{{ initial().mask }}</span
    ><span
      data-dotquilt-text-content=""
      [attr.aria-hidden]="initial().pending ? 'true' : null"
      [attr.inert]="initial().pending ? '' : null"
      ><ng-content
    /></span>`,
  styles: [textCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    motion: 'paused',
    '[attr.state]': 'initial().state',
    '[attr.mask]': 'initial().mask',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class TextLoader extends MarkLoader<NativeTextLoader> {
  /** The shape the placeholder shows, such as `$00,000`. */
  readonly mask = input<string>();
  readonly state = input<LoadingState>('ready');
  /** Names one load, so a stale answer can't settle a newer one. */
  readonly cycle = input<string>();
  /** Milliseconds to wait before showing the placeholder. */
  readonly delay = input<number>();
  /** Milliseconds a placeholder stays once shown. */
  readonly minDisplay = input<number>();
  readonly timing = input<Timing>();
  /** How fast the characters change, up to 4. */
  readonly speed = input<number>();
  readonly pointerResponse = input<'none' | 'lift'>();
  readonly animations = input<Animations<'text'>>();
  readonly preset = input<TextPreset>();
  // Host and content attributes are the first render's only: from then on
  // the element owns them.
  protected readonly initial = first(() => {
    const mask = this.mask() ?? '';
    return {
      state: this.state(),
      mask: mask.length <= 256 ? mask : '',
      pending: this.state() === 'pending',
    };
  });
  constructor() {
    super();
    this.connect(registerTextLoader, () => ({
      state: this.state(),
      cycle: this.cycle(),
      delay: this.delay(),
      minDisplay: this.minDisplay(),
      timing: this.timing(),
      speed: this.speed(),
      pointerResponse: this.pointerResponse(),
      animations: this.animations(),
      preset: this.preset(),
      mask: this.mask(),
    }));
  }
}
