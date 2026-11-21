import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Animations, LoadingState, RevealTarget, Timing } from 'dotquilt';
import {
  type LoadingRegion as NativeLoadingRegion,
  type RegionPreset,
  registerLoadingRegion,
} from 'dotquilt/region';
import { first, Loader } from './host';
import { regionCss } from './styles.generated';

/** Marks the loader a region shows while pending: `<div dotquiltPlaceholder>`. */
@Directive({
  selector: '[dotquiltPlaceholder]',
  host: {
    slot: 'placeholder',
    'data-dotquilt-wrapper-slot': '',
    'aria-hidden': 'true',
    inert: '',
  },
})
export class DotquiltPlaceholder {}

/** Your own cue while a region refreshes: `<div dotquiltRefreshIndicator>`. */
@Directive({
  selector: '[dotquiltRefreshIndicator]',
  host: {
    slot: 'refresh-indicator',
    'data-dotquilt-wrapper-slot': '',
    'aria-hidden': 'true',
    inert: '',
  },
})
export class DotquiltRefreshIndicator {}

/**
 * Wraps content that loads: shows its `dotquiltPlaceholder` while pending,
 * keeps the content inert and hidden from assistive technology, then hands
 * over to it.
 */
@Component({
  selector: 'dotquilt-region',
  template: '<ng-content />',
  styles: [regionCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    motion: 'paused',
    '[attr.state]': 'initial().state',
    '[attr.data-presentation]': 'initial().state',
    '[attr.data-dotquilt-wrapper-empty]': "placeholder() ? null : ''",
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class LoadingRegion extends Loader<NativeLoadingRegion> {
  readonly state = input<LoadingState>('ready');
  /** Names one load, so a stale answer can't settle a newer one. */
  readonly cycle = input<string>();
  /** Milliseconds to wait before showing the placeholder. */
  readonly delay = input<number>();
  /** Milliseconds a placeholder stays once shown. */
  readonly minDisplay = input<number>();
  readonly timing = input<Timing>();
  readonly animations = input<Pick<Animations<'region'>, 'handoff'>>();
  readonly preset = input<RegionPreset>();
  readonly revealTargets = input<readonly RevealTarget[]>();
  protected readonly placeholder = contentChild(DotquiltPlaceholder);
  protected readonly initial = first(() => ({ state: this.state() }));
  constructor() {
    super();
    this.connect(registerLoadingRegion, () => ({
      state: this.state(),
      cycle: this.cycle(),
      delay: this.delay(),
      minDisplay: this.minDisplay(),
      timing: this.timing(),
      animations: this.animations(),
      preset: this.preset(),
      revealTargets: this.revealTargets(),
    }));
  }
}
