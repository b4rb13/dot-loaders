import type { Animations } from './animations.js';
import { definitionOf, validateBindings } from './internal/binding.js';
import {
  ancestors,
  installStyles,
  node,
  register,
  upgradeProperties,
} from './internal/dom.js';
import {
  type Activity,
  ManagedElement,
  remaining,
} from './internal/element.js';
import type { Preset } from './internal/preset.js';
import { skeletonPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import { createPulse } from './internal/pulse.js';
import {
  dissolveSkeleton,
  skeletonHandoff,
} from './internal/skeleton-handoff.js';
import { skeletonStyles } from './styles.js';
import type { Motion } from './types.js';

interface Owner extends HTMLElement {
  activity: Activity;
  state: string;
  presentation: string;
}
export class SkeletonBlock extends ManagedElement {
  protected get styles(): readonly string[] {
    return skeletonStyles;
  }
  protected override upgrade(): void {
    upgradeProperties(this, [
      'stylePolicy',
      'preset',
      'animations',
      'motion',
      'speed',
      'pointerResponse',
    ]);
  }
  protected override capturePreset(
    value: Preset<'skeleton'>,
  ): Preset<'skeleton'> {
    return capturePresetData(value, 'skeleton', () => skeletonPreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'speed',
    'pointer-response',
  ];
  get speed(): number {
    const n = +(this.getAttribute('speed') ?? this.preset?.speed ?? 1);
    return n > 0 && Number.isFinite(n) ? Math.min(4, n) : 1;
  }
  set speed(value: number | undefined) {
    if (value === undefined) this.removeAttribute('speed');
    else this.setAttribute('speed', String(value));
  }
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (
      name === 'speed' &&
      value !== null &&
      !(+value > 0 && Number.isFinite(+value))
    )
      this.report('invalid-number', 'speed');
    if (
      name === 'pointer-response' &&
      value !== null &&
      !['none', 'lift'].includes(value)
    )
      this.report('invalid-pointer-response', 'pointerResponse');
    super.attributeChangedCallback(name, old, value);
  }

  #bindings: Animations<'skeleton'> = {};
  #runner: import('./internal/runner.js').Runner | undefined;
  #factory: ReturnType<typeof definitionOf>['runner'];
  #pointerHost: HTMLElement | undefined;
  get animations(): Animations<'skeleton'> {
    return this.#bindings;
  }
  set animations(value: Animations<'skeleton'> | undefined) {
    try {
      validateBindings(value, 'skeleton');
      this.#bindings = Object.freeze({ ...value });
      this.#runner?.reset?.();
    } catch {
      this.#bindings = {};
      this.report('invalid-binding', 'animations');
    }
    this.requestRender();
  }
  get pointerResponse(): 'none' | 'lift' {
    return (this.getAttribute('pointer-response') ??
      this.preset?.pointerResponse) === 'lift'
      ? 'lift'
      : 'none';
  }
  set pointerResponse(value: 'none' | 'lift' | undefined) {
    if (value === undefined) this.removeAttribute('pointer-response');
    else this.setAttribute('pointer-response', value);
  }
  protected override presetChanged(): void {
    this.#runner?.reset?.();
  }
  #handoffCheck: (() => void) | undefined;
  [skeletonHandoff](): import('./internal/skeleton-handoff.js').SkeletonDeparture {
    const binding = this.#bindings.handoff ?? this.preset?.animations?.handoff;
    const builtin = !binding || definitionOf(binding).dissolve;
    const fallPx =
      (binding?.options as { fallPx?: number } | undefined)?.fallPx ?? 5;
    return (duration, easing, own, invalidate) => {
      if (!builtin || !this.allowed(this.activity)) return () => {};
      const effect = dissolveSkeleton(
        this,
        duration,
        easing,
        fallPx,
        own,
        invalidate,
        (code) => this.report(code, 'animations'),
      );
      this.#handoffCheck = effect.check;
      return () => {
        if (this.#handoffCheck === effect.check) this.#handoffCheck = undefined;
        effect.dispose();
      };
    };
  }
  get owner(): Owner | undefined {
    const owner = ancestors(this).find(
      (e) => e.localName === 'dotquilt-region',
    ) as Owner | undefined;
    if (!owner) return undefined;
    let top: Element = this;
    while (top.parentElement && top.parentElement !== owner)
      top = top.parentElement;
    return top.getAttribute('slot') === 'placeholder' ? owner : undefined;
  }
  get activity(): Activity {
    return this.owner?.activity ?? this.ownActivity;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('data-dotquilt-surface', '');
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      installStyles(root, this.styles, this.policy);
      root.append(
        node(this.ownerDocument, 'div', {
          class: 'surface',
          part: 'surface',
          'aria-hidden': 'true',
        }),
        node(this.ownerDocument, 'div', {
          class: 'surface pulse',
          'aria-hidden': 'true',
        }),
      );
    }
    if (!this.hasAttribute('aria-hidden'))
      this.setAttribute('aria-hidden', 'true');
    for (const fallback of this.querySelectorAll(
      ':scope > [data-dotquilt-static],:scope > [data-dotquilt-style]',
    ))
      fallback.remove();
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearPointer();
    this.#runner?.dispose();
    this.#trackPointer(false);
  }
  update(patch: {
    readonly animations?: Animations<'skeleton'> | undefined;
    readonly motion?: Motion | undefined;
    readonly speed?: number | undefined;
    readonly pointerResponse?: 'none' | 'lift' | undefined;
    readonly preset?: SkeletonPreset | undefined;
    readonly stylePolicy?: import('./types.js').StylePolicy;
  }): void {
    for (const [key, value] of Object.entries(patch))
      Reflect.set(this, key, value);
  }
  refresh(): void {
    this.resources?.eligible(true);
    const owner = this.owner;
    if (owner && owner.presentation !== 'pending') this.#runner?.dispose();
    this.requestRender();
  }
  #trackPointer(active: boolean): void {
    const target = active ? (this.owner ?? this) : undefined;
    if (target === this.#pointerHost) return;
    this.#pointerHost?.removeEventListener('pointermove', this.#onPointer);
    this.#pointerHost?.removeEventListener('pointerleave', this.#clearPointer);
    this.#pointerHost = target;
    target?.addEventListener('pointermove', this.#onPointer);
    target?.addEventListener('pointerleave', this.#clearPointer);
    this.#clearPointer();
  }
  #clearPointer = (): void => {
    this.removeAttribute('data-pointer');
  };
  #onPointer = (event: PointerEvent): void => {
    const r = this.getBoundingClientRect();
    this.toggleAttribute(
      'data-pointer',
      event.pointerType !== 'touch' &&
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom,
    );
  };
  protected override render(): void {
    const owner = this.owner;
    const activity = owner?.activity ?? this.ownActivity;
    const moving =
      this.allowed(activity) && (!owner || owner.presentation === 'pending');
    this.toggleAttribute('data-moving', moving);
    this.#trackPointer(moving && this.pointerResponse === 'lift');
    if (moving && (activity.started === undefined || !this.deadline))
      this.arm(activity);
    if (owner && owner.presentation !== 'pending') {
      this.#runner?.dispose();
      this.#handoffCheck?.();
      return;
    }
    this.#draw(!moving, remaining(this, activity));
  }
  #draw(still: boolean, duration: number): void {
    const binding = this.#bindings.idle ?? this.preset?.animations?.idle;
    const factory = binding ? definitionOf(binding).runner : createPulse;
    if (this.#factory !== factory) {
      this.#runner?.dispose();
      this.#runner = undefined;
      this.#factory = factory;
    }
    this.#runner ??= factory?.(
      this,
      (code) => this.report(code, 'animations'),
      () => this.requestRender(),
    );
    this.#runner?.draw(binding, still, this.speed, duration);
  }
}
export type SkeletonPreset = import('./internal/preset.js').Preset<'skeleton'>;
export function registerSkeletonBlock(): void {
  register('dotquilt-skeleton-block', SkeletonBlock);
}
export { refreshStyles } from './internal/element.js';
