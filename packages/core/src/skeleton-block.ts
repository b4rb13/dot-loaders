import type { Animations } from './animations.js';
import { definitionOf, validateBindings } from './internal/binding.js';
import {
  ancestors,
  node,
  register,
  upgradeProperties,
} from './internal/dom.js';
import {
  type Activity,
  ManagedElement,
  remaining,
} from './internal/element.js';
import { handoff } from './internal/marks.js';
import type { Preset } from './internal/preset.js';
import { skeletonPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import { createPulse } from './internal/pulse.js';
import {
  type SkeletonExit,
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
      this.invalidOption('speed');
    if (
      name === 'pointer-response' &&
      value !== null &&
      !['none', 'lift'].includes(value)
    )
      this.invalidOption('pointer-response');
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
      this.accept('animations');
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
  /** How its marks leave when a region hands it over (skeleton-handoff.ts). */
  [skeletonHandoff](): SkeletonExit {
    const binding = this.#bindings.handoff ?? this.preset?.animations?.handoff;
    return {
      dissolves: !binding || !!definitionOf(binding).dissolve,
      // The default exit follows the spec; an explicit dissolve() keeps its fall.
      departure: binding
        ? {
            driftPx:
              (binding.options as { fallPx?: number } | undefined)?.fallPx ?? 5,
            shrink: 0,
          }
        : { driftPx: -handoff.markDriftPx, shrink: handoff.markShrink },
      canAnimate: () => this.canAnimate(),
      report: (code) => this.report(code, 'animations'),
      watch: (check) => {
        this.#handoffCheck = check;
        return () => {
          if (this.#handoffCheck === check) this.#handoffCheck = undefined;
        };
      },
    };
  }
  get owner(): Owner | undefined {
    return this.cachedOwner(() => {
      const owner = ancestors(this).find(
        (e) => e.localName === 'dotquilt-region',
      ) as Owner | undefined;
      if (!owner) return undefined;
      let top: Element = this;
      while (top.parentElement && top.parentElement !== owner)
        top = top.parentElement;
      return top.getAttribute('slot') === 'placeholder' ? owner : undefined;
    });
  }
  get activity(): Activity {
    return this.owner?.activity ?? this.ownActivity;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('data-dotquilt-surface', '');
    if (!this.shadowRoot) {
      const root = this.attachStyledShadow(this.styles, true);
      root.append(
        node(this.ownerDocument, 'div', {
          class: 'surface',
          part: 'surface',
          'aria-hidden': 'true',
        }),
        // The glow lives on a container, so a surface can take a shape mask.
        node(this.ownerDocument, 'div', {
          class: 'pulse',
          'aria-hidden': 'true',
        }),
      );
      root.lastElementChild?.append(
        node(this.ownerDocument, 'div', {
          class: 'surface',
          'aria-hidden': 'true',
        }),
      );
    }
    if (!this.hasAttribute('aria-hidden'))
      this.setAttribute('aria-hidden', 'true');
    this.whenStyled(() => {
      for (const fallback of this.querySelectorAll(
        ':scope > [data-dotquilt-static],:scope > [data-dotquilt-style]',
      ))
        fallback.remove();
    });
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
    this.applyOptions(patch);
  }
  protected override get optionNames(): readonly string[] {
    return [...super.optionNames, 'speed', 'pointerResponse', 'animations'];
  }
  refresh(): void {
    this.resources?.eligible(true);
    const owner = this.owner;
    if (owner && owner.presentation !== 'pending') this.#runner?.dispose();
    this.requestRender();
  }
  /**
   * The layer whose marks light up around the pointer, made only for a
   * loader that asks for `lift`: a copy of the surface under a round mask.
   */
  protected ensureLift(): void {
    const root = this.shadowRoot;
    if (
      !root ||
      [...root.children].some((child) => child.classList.contains('lift'))
    )
      return;
    const layer = node(this.ownerDocument, 'div', {
      class: 'lift',
      'aria-hidden': 'true',
    });
    layer.append(
      node(this.ownerDocument, 'div', {
        class: 'surface',
        'aria-hidden': 'true',
      }),
    );
    root.append(layer);
  }
  #trackPointer(active: boolean): void {
    if (active) this.ensureLift();
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
    const inside =
      event.pointerType !== 'touch' &&
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom;
    this.toggleAttribute('data-pointer', inside);
    if (!inside) return;
    // The pointer glow is centred on the pointer, in the loader's own box.
    // Set through the CSSOM on shadow layers, so strict CSP still applies.
    for (const layer of this.shadowRoot?.querySelectorAll<HTMLElement>(
      '.lift',
    ) ?? []) {
      const box = layer.getBoundingClientRect();
      layer.style.setProperty(
        '--dotquilt-pointer-x',
        `${Math.round(event.clientX - box.left)}px`,
      );
      layer.style.setProperty(
        '--dotquilt-pointer-y',
        `${Math.round(event.clientY - box.top)}px`,
      );
    }
  };
  protected override render(): void {
    const owner = this.owner;
    const activity = owner?.activity ?? this.ownActivity;
    const moving =
      this.allowed(activity) && (!owner || owner.presentation === 'pending');
    this.toggleAttribute('data-moving', moving);
    // The pointer glow answers the visitor, not the clock: it works for as
    // long as the placeholder shows, after the idle motion has stopped too,
    // but not while motion is paused or reduced.
    this.#trackPointer(
      this.canAnimate() &&
        (!owner || owner.presentation === 'pending') &&
        this.pointerResponse === 'lift',
    );
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
