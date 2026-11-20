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
import { curves } from './internal/marks.js';
import type { Preset } from './internal/preset.js';
import { typingPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import { typingStyles } from './typing-styles.js';

interface Owner extends HTMLElement {
  activity: Activity;
  presentation: string;
}
/** Decorative activity only. Application readiness belongs to LoadingRegion. */
export class TypingDots extends ManagedElement<'typing'> {
  protected override upgrade(): void {
    upgradeProperties(this, ['stylePolicy', 'preset', 'motion', 'speed']);
  }
  protected override capturePreset(value: Preset<'typing'>): Preset<'typing'> {
    return capturePresetData(value, 'typing', () => typingPreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'count',
    'speed',
  ];
  #effects: Animation[] = [];
  #count = 0;
  #phase = 0;
  get count(): number {
    const value = +(this.getAttribute('count') ?? this.preset?.count ?? 3);
    return Number.isInteger(value) && value > 0 ? Math.min(8, value) : 3;
  }
  set count(value: number | undefined) {
    if (value === undefined) this.removeAttribute('count');
    else this.setAttribute('count', String(value));
  }
  get speed(): number {
    const value = +(this.getAttribute('speed') ?? this.preset?.speed ?? 1);
    return value > 0 && Number.isFinite(value) ? Math.min(4, value) : 1;
  }
  set speed(value: number | undefined) {
    if (value === undefined) this.removeAttribute('speed');
    else this.setAttribute('speed', String(value));
  }
  get owner(): Owner | undefined {
    const owner = ancestors(this).find(
      (element) => element.localName === 'dotquilt-region',
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
    // Remove static preset decoration before replaying explicit caller properties.
    const marker = 'data-dotquilt-preset-count';
    const decoration = this.getAttribute(marker);
    if (decoration !== null) {
      if (
        !Object.hasOwn(this, 'count') &&
        this.getAttribute('count') === decoration
      )
        this.removeAttribute('count');
      this.removeAttribute(marker);
    }
    super.connectedCallback();
    upgradeProperties(this, ['count']);
    this.setAttribute('data-dotquilt-surface', '');
    if (!this.shadowRoot) this.attachStyledShadow(typingStyles, true);
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
    this.#stop();
  }
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (value !== null && (name === 'count' || name === 'speed')) {
      const number = +value;
      if (
        !(
          number > 0 &&
          (name === 'count'
            ? Number.isInteger(number)
            : Number.isFinite(number))
        )
      )
        this.invalidOption(name);
      else if (name === 'count' && number > 8)
        this.report('typing-limit', 'count');
    }
    super.attributeChangedCallback(name, old, value);
  }
  update(patch: {
    readonly count?: number | undefined;
    readonly speed?: number | undefined;
    readonly motion?: import('./types.js').Motion | undefined;
    readonly preset?: TypingPreset | undefined;
    readonly stylePolicy?: import('./types.js').StylePolicy;
  }): void {
    this.applyOptions(patch);
  }
  protected override get optionNames(): readonly string[] {
    return [...super.optionNames, 'count', 'speed'];
  }
  refresh(): void {
    this.resources?.eligible(true);
    this.requestRender();
  }
  #stop(): void {
    this.#phase =
      this.#effects[0]?.effect?.getComputedTiming().progress ?? this.#phase;
    for (const effect of this.#effects) effect.cancel();
    this.#effects = [];
  }
  protected override render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const count = this.count;
    if (this.#count !== count) {
      this.#stop();
      for (const dot of root.querySelectorAll('.dot')) dot.remove();
      for (let i = 0; i < count; i++)
        root.append(
          node(this.ownerDocument, 'span', {
            class: 'dot',
            part: 'surface',
            'aria-hidden': 'true',
          }),
        );
      this.#count = count;
    }
    const owner = this.owner;
    const activity = owner?.activity ?? this.ownActivity;
    const moving =
      this.allowed(activity) && (!owner || owner.presentation === 'pending');
    this.toggleAttribute('data-moving', moving);
    if (!moving) {
      this.#stop();
      return;
    }
    if (activity.started === undefined || !this.deadline) this.arm(activity);
    // design/SPEC.md: a calm wave, 1.9 s per cycle, each dot 14% behind.
    const period = 1900 / this.speed;
    if (this.#effects[0]?.effect?.getTiming().duration === period) return;
    this.#stop();
    try {
      for (const [index, dot] of root.querySelectorAll('.dot').entries()) {
        this.#effects.push(
          dot.animate(
            [
              { opacity: 0.3, translate: '0 0', easing: curves.sine },
              { opacity: 1, translate: '0 -1.5px', easing: curves.sine },
              { opacity: 0.3, translate: '0 0' },
            ],
            {
              duration: period,
              iterations: remaining(this, activity) / period,
              iterationStart: (this.#phase + 1 - ((index * 0.14) % 1)) % 1,
            },
          ),
        );
      }
    } catch {
      this.#stop();
      this.report('animation-failed', 'animations');
    }
  }
}
export function registerTypingDots(): void {
  register('dotquilt-typing-dots', TypingDots);
}

export type TypingPreset = import('./internal/preset.js').Preset<'typing'>;
