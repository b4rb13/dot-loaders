import type { Animations, RevealTarget } from '../animations.js';
import type {
  HandoffDetail,
  LoadingState,
  Motion,
  StylePolicy,
  Timing,
} from '../types.js';
import { definitionOf, validateBindings } from './binding.js';
import {
  activeWithin,
  ancestors,
  emit,
  installStyles,
  node,
  upgradeProperties,
} from './dom.js';
import { ManagedElement, now, remaining } from './element.js';
import { EventElement } from './event-element.js';
import { clamp } from './math.js';
import type { Preset } from './preset.js';
import { regionPreset } from './preset.js';
import { capturePresetData } from './preset-data.js';

type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
type OwnerAnimations<F extends 'region' | 'text'> = F extends 'region'
  ? Pick<Animations<F>, 'handoff'>
  : Animations<F>;

type Layers = [
  content: HTMLElement,
  placeholder: HTMLElement,
  refresh: HTMLElement,
];

type Work = [
  revision: number,
  detail: HandoffDetail,
  started: number,
  duration: number,
  animations: Animation[],
  driver: import('./handoff.js').HandoffDriver | undefined,
];

export abstract class LoadingController<
  F extends 'region' | 'text' = 'region',
> extends EventElement<F> {
  protected override upgrade(): void {
    upgradeProperties(this, [
      'stylePolicy',
      'preset',
      'animations',
      'revealTargets',
      'timing',
      'state',
      'cycle',
      'motion',
    ]);
  }
  protected abstract get family(): F;
  protected abstract get styles(): readonly string[];
  protected placeholderChanged(
    _placeholder: HTMLSlotElement,
    _state: LoadingState,
  ): void {}
  protected abstract contentChanged(): void;
  protected abstract settled(): void;
  protected override capturePreset(value: Preset<F>): Preset<F> {
    return capturePresetData(value, this.family, () => regionPreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'state',
    'cycle',
    'tabindex',
  ];
  #revision = 0;
  #serial = 0;
  #batching = false;
  #previous: LoadingState = 'ready';
  #settled = true;
  #work: Work | undefined;
  #wrappers: Layers | undefined;
  #bindings: Animations<F> = {};
  #targets: readonly RevealTarget[] = [];
  #clockTiming: Timing = {};
  #contentObserver: MutationObserver | undefined;
  #temporaryTabIndex = false;
  get activity() {
    return this.ownActivity;
  }
  get presentation(): string {
    return this.getAttribute('data-presentation') ?? this.state;
  }
  get state(): LoadingState {
    const value = this.getAttribute('state');
    return value === null || value === 'ready'
      ? 'ready'
      : value === 'refreshing'
        ? 'refreshing'
        : 'pending';
  }
  set state(value: LoadingState) {
    this.setAttribute('state', String(value));
  }
  get cycle(): string | undefined {
    return this.getAttribute('cycle') ?? undefined;
  }
  set cycle(value: string | undefined) {
    if (value === undefined) this.removeAttribute('cycle');
    else this.setAttribute('cycle', String(value));
  }
  get timing(): Timing {
    return Object.freeze({ ...this.preset?.timing, ...this.#clockTiming });
  }
  set timing(value: Timing | undefined) {
    const duration = value?.duration;
    const valid =
      duration !== undefined && Number.isFinite(duration) && duration >= 0;
    let easing = value?.easing ?? 'ease-out';
    if (
      typeof easing !== 'string' ||
      !/^(linear|ease(-in)?(-out)?|cubic-bezier\([^;{}]+\))$/.test(easing)
    ) {
      easing = 'ease-out';
      this.report('invalid-easing', 'timing.easing');
    }
    if (duration !== undefined && !valid)
      this.report('invalid-duration', 'timing.duration');
    this.#clockTiming = Object.freeze({
      ...(valid ? { duration } : {}),
      ...(value?.easing === undefined ? {} : { easing }),
    });
    this.requestRender();
  }
  get animations(): OwnerAnimations<F> {
    return this.#bindings as OwnerAnimations<F>;
  }
  set animations(value: OwnerAnimations<F> | undefined) {
    try {
      if (
        this.family === 'region' &&
        (value as Animations<F> | undefined)?.idle
      )
        throw new TypeError();
      validateBindings(value, this.family);
      this.#bindings = Object.freeze({ ...value }) as Animations<F>;
    } catch {
      this.#bindings = {};
      this.report('invalid-binding', 'animations');
    }
    this.requestRender();
  }
  get revealTargets(): readonly RevealTarget[] {
    return this.#targets;
  }
  set revealTargets(value: readonly RevealTarget[]) {
    if (
      value?.length === this.#targets.length &&
      value.every(
        (target, i) =>
          target.id === this.#targets[i]?.id &&
          target.element === this.#targets[i]?.element,
      )
    )
      return;
    this.#targets = Object.freeze(
      [...(value ?? [])].slice(0, 100).map((v) => Object.freeze({ ...v })),
    );
    if (value?.length > 100) this.report('target-limit', 'revealTargets');
    this.#settleTargets();
    this.requestRender();
  }
  #settleTargets(): void {
    if (!this.#batching && this.#work?.[5]?.targetsChanged?.(this.#targets))
      this.#finish('end', 'targets-changed');
  }
  update(patch: {
    readonly state?: LoadingState;
    readonly cycle?: string | undefined;
    readonly timing?: Timing | undefined;
    readonly animations?: OwnerAnimations<F> | undefined;
    readonly revealTargets?: readonly RevealTarget[];
    readonly motion?: Motion | undefined;
    readonly stylePolicy?: StylePolicy;
    readonly preset?: import('./preset.js').Preset<F> | undefined;
  }): void {
    const priorState = this.state;
    const priorCycle = this.cycle;
    this.#batching = true;
    try {
      for (const [key, value] of Object.entries(patch))
        if (
          /^(state|cycle|timing|animations|revealTargets|motion|stylePolicy|preset)$/.test(
            key,
          )
        )
          Reflect.set(this, key, value);
    } finally {
      this.#batching = false;
    }
    if (this.state !== priorState || this.cycle !== priorCycle) {
      this.#revision++;
      this.#finish('cancel', 'superseded');
    }
    this.#settleTargets();
    this.requestRender();
  }
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (name === 'tabindex') {
      this.#temporaryTabIndex = false;
      return;
    }
    if (
      !this.#batching &&
      old !== value &&
      (name === 'state' || name === 'cycle')
    ) {
      this.#revision++;
      this.#finish('cancel', 'superseded');
    }
    super.attributeChangedCallback(name, old, value);
  }
  override connectedCallback(): void {
    super.connectedCallback();
    for (const style of this.querySelectorAll(':scope > [data-dotquilt-style]'))
      style.remove();
    for (const placeholder of this.querySelectorAll(
      ':scope > [data-dotquilt-placeholder]',
    ))
      placeholder.removeAttribute('hidden');
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      installStyles(root, this.styles, this.policy);
      const layer = (part: string, className: string, name?: string) => {
        const element = node(this.ownerDocument, 'div', {
          part,
          class: className,
        });
        element.append(node(this.ownerDocument, 'slot', name ? { name } : {}));
        if (name) {
          element.inert = true;
          element.setAttribute('aria-hidden', 'true');
        }
        return element;
      };
      const content = layer('content', 'c'),
        placeholder = layer('placeholder', 'p', 'placeholder'),
        refresh = layer('refresh-indicator', 'r', 'refresh-indicator');
      // The layers overlap inside their own grid, so the overlay survives app
      // CSS that changes the host's display (e.g. `display: block`).
      const frame = node(this.ownerDocument, 'div', { class: 'f' });
      frame.append(content, placeholder, refresh);
      root.append(frame);
      this.#wrappers = [content, placeholder, refresh];
    }
    if (this.#wrappers) this.resources?.watch(this.#wrappers[0]);
    this.listen(this, 'focusin', this.#onFocus);
    this.listen(this, 'focusout', this.#onFocus);
    this.listen(this, 'pointerdown', this.#onFocus);
    this.listen(this, 'keydown', this.#onFocus);
    this.listen(this.shadowRoot, 'slotchange', this.#onContentChange);
    this.#contentObserver = new MutationObserver(this.#onContentChange);
    this.#contentObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.#previous = 'ready';
    this.requestRender();
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseTabIndex();
    this.removeAttribute('data-dotquilt-focus');
    this.#contentObserver?.disconnect();
    this.#contentObserver = undefined;
    this.#finish('cancel', 'removed');
  }
  refresh(): void {
    this.resources?.eligible(true);
    this.#finish('end', 'geometry-changed');
    this.requestRender();
  }
  #onContentChange = (change: MutationRecord[] | Event): void => {
    // Simple wrapper reveals are independent of nested content. Rich/custom
    // plans may capture geometry derived from it, so keep conservative invalidation.
    if (
      !Array.isArray(change) ||
      this.#work?.[5]?.draw ||
      change.some(({ target }) => {
        const element =
          target.nodeType === 1
            ? (target as HTMLElement)
            : target.parentElement;
        return (
          !element ||
          [element, ...ancestors(element)].find((el) =>
            el.matches('dotquilt-region,dotquilt-text-loader'),
          ) === this
        );
      })
    )
      this.contentChanged();
  };
  #onFocus = (event: Event): void => {
    if (event.type === 'pointerdown')
      this.setAttribute('data-dotquilt-focus', 'pointer');
    else if (event.type === 'keydown')
      this.setAttribute('data-dotquilt-focus', '');
    else if (
      event.type === 'focusout' &&
      (event as FocusEvent).relatedTarget !== this
    ) {
      this.removeAttribute('data-dotquilt-focus');
      this.#releaseTabIndex();
    }
    if (event.type === 'focusin' && this.#work && activeWithin(this))
      this.#finish('end', 'focus');
  };
  #releaseTabIndex(): void {
    if (this.#temporaryTabIndex) {
      this.#temporaryTabIndex = false;
      this.removeAttribute('tabindex');
    }
  }
  protected refreshParticipants(): void {}
  protected abstract handoffSource(): [
    binding: Animations<
      'skeleton' | 'region' | 'text' | 'chart' | 'table'
    >['handoff'],
    host: HTMLElement,
    animation: string,
    prepare?: (
      binding: Animations<
        'skeleton' | 'region' | 'text' | 'chart' | 'table'
      >['handoff'],
      ...args: Tail<Parameters<typeof import('./handoff.js').createHandoff>>
    ) => import('./handoff.js').HandoffDriver,
  ];

  protected override render(): void {
    const w = this.#wrappers;
    if (!w) return;
    const [content, placeholder, refresh] = w;
    const revision = this.#revision;
    const state = this.state;
    const attribute = this.getAttribute('state');
    const invalid = attribute !== null && attribute !== state;
    if (invalid) this.report('invalid-state', 'state');
    if (revision !== this.#revision) return;
    this.toggleAttribute('data-dotquilt-disabled', invalid);
    if (this.#work) {
      if (!this.allowed(this.activity) || this.#work[5]?.restricted?.())
        this.#finish('end', 'restricted');
      return;
    }
    if (
      state === 'pending' &&
      this.#previous !== 'pending' &&
      activeWithin(content)
    ) {
      // A permanent negative tabindex also excludes slotted controls from Tab.
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
        this.#temporaryTabIndex = true;
      }
      this.focus({ preventScroll: true });
      // A before-hide transfer stays visible even when initiated by a pointer.
      if (this.isConnected && this.ownerDocument.activeElement === this)
        this.setAttribute('data-dotquilt-focus', '');
      else {
        this.removeAttribute('data-dotquilt-focus');
        this.#releaseTabIndex();
      }
      if (revision !== this.#revision || !this.isConnected) return;
      if (this.ownerDocument.activeElement !== this)
        this.report('focus-fallback-unavailable', 'state');
    }
    if (revision !== this.#revision) return;
    const prior = this.#previous;
    this.#previous = state;
    content.inert = state === 'pending';
    content.setAttribute('aria-busy', String(state !== 'ready'));
    if (state === 'pending') content.setAttribute('aria-hidden', 'true');
    else content.removeAttribute('aria-hidden');
    this.setAttribute('data-presentation', state);
    this.placeholderChanged(
      placeholder.firstElementChild as HTMLSlotElement,
      state,
    );
    const indicator = refresh.firstElementChild as HTMLSlotElement;
    if (
      state === 'refreshing' &&
      !(content.firstElementChild as HTMLSlotElement).assignedNodes().length
    ) {
      if (!indicator.firstChild)
        indicator.append(
          node(this.ownerDocument, 'span', { class: 'fallback' }),
        );
      this.report('missing-content', 'state');
    } else if (indicator.firstChild) indicator.replaceChildren();
    if (revision !== this.#revision) return;
    if (state !== 'ready') {
      if (this.#settled) {
        this.ownActivity.started = undefined;
        this.#settled = false;
      }
      this.refreshParticipants();
      return;
    }
    if (prior === 'pending') this.#start(revision, w);
    else this.#settled = true;
  }
  #start(revision: number, [content, placeholder]: Layers): void {
    const timing = this.timing;
    const easing = timing.easing ?? 'ease-out';
    const [sourceBinding, sourceHost, sourceAnimation, prepare] =
      this.handoffSource();
    const binding =
      this.#bindings.handoff ??
      this.preset?.animations?.handoff ??
      sourceBinding;
    let duration = 0;
    let driver: Work[5];
    try {
      const factory = prepare ?? (binding && definitionOf(binding).handoff);
      if (!factory) throw new TypeError();
      driver = factory(
        binding as NonNullable<typeof binding>,
        sourceHost,
        content,
        this.#targets,
        timing.duration,
        () => this.#work?.[0] === revision,
        (animation) => {
          if (this.#work?.[0] === revision) this.#work[4].push(animation);
          else animation.cancel();
        },
        (code) => this.report(code, 'animations'),
      );
      duration = driver.duration;
      if (!Number.isFinite(duration) || duration < 0) throw new TypeError();
    } catch {
      duration = 0;
      driver?.dispose();
      driver = undefined;
      this.report('animation-failed', 'animations');
    }
    if (revision !== this.#revision || !this.isConnected) {
      driver?.dispose();
      return;
    }
    if (
      !this.allowed(this.activity) ||
      driver?.restricted?.() ||
      duration > remaining(this, this.activity) ||
      activeWithin(content)
    )
      duration = 0;
    if (duration > 0 && this.activity.started === undefined)
      this.arm(this.activity);
    const detail: HandoffDetail = {
      cycle: this.cycle,
      handoffId: ++this.#serial,
      animation: binding?.id ?? sourceAnimation,
    };
    this.#work = [revision, detail, now(this), duration, [], driver];
    this.setAttribute('data-presentation', 'handoff');
    this.refreshParticipants();
    emit(this, 'dotquilt-handoff-start', detail);
    if (
      !this.#work ||
      this.#work[0] !== revision ||
      revision !== this.#revision ||
      !this.isConnected
    )
      return;
    if (!duration) {
      this.#finish('end', 'immediate');
      return;
    }
    // Synchronous start handlers may consume the window or change restrictions.
    if (
      !this.allowed(this.activity) ||
      driver?.restricted?.() ||
      duration > remaining(this, this.activity)
    ) {
      this.#finish('end', 'restricted');
      return;
    }
    try {
      const options: KeyframeAnimationOptions = {
        duration,
        easing,
        fill: 'both',
      };
      const outgoing = placeholder.animate({ opacity: [1, 0] }, options);
      const incoming = content.animate({ opacity: [0, 1] }, options);
      this.#work[4].push(outgoing, incoming);
      outgoing.onfinish = () => {
        if (this.#work?.[0] === revision) this.#finish('end', 'complete');
      };
      driver?.draw?.(0);
      if (this.#work?.[0] === revision) driver?.activate(() => this.frame());
    } catch {
      this.report('animation-failed', 'animations');
      this.#finish('end', 'fallback');
    }
  }
  protected frame(): void {
    const work = this.#work;
    if (!work) return;
    if (!this.allowed(this.activity) || work[5]?.restricted?.()) {
      this.#finish('end', 'restricted');
      return;
    }
    const p = Math.min(1, (now(this) - work[2]) / work[3]);
    try {
      work[5]?.draw?.(
        p,
        clamp(work[4][1]?.effect?.getComputedTiming().progress ?? p),
      );
    } catch {
      this.report('animation-failed', 'animations');
      this.#finish('end', 'fallback');
      return;
    }
    if (p >= 1) this.#finish('end', 'complete');
  }
  #finish(outcome: 'end' | 'cancel', reason: string): void {
    const work = this.#work;
    if (!work) return;
    this.#work = undefined;
    work[5]?.dispose();
    for (const animation of work[4]) {
      animation.onfinish = null;
      animation.cancel();
    }
    this.settled();
    if (
      outcome === 'end' &&
      work[0] === this.#revision &&
      this.state === 'ready'
    ) {
      this.setAttribute('data-presentation', 'ready');
      this.#settled = true;
      this.clearDeadline();
    }
    emit(this, `dotquilt-handoff-${outcome}`, { ...work[1], reason });
  }
}
