import type { Animations, RevealTarget } from '../animations.js';
import type {
  HandoffDetail,
  LoadingState,
  Motion,
  StylePolicy,
  Timing,
} from '../types.js';
import { validateBindings } from './binding.js';
import {
  activeWithin,
  ancestors,
  emit,
  node,
  upgradeProperties,
} from './dom.js';
import { ManagedElement, now, remaining } from './element.js';
import { EventElement } from './event-element.js';
import {
  type HandoffDriver,
  type HandoffSource,
  runHandoff,
} from './handoff.js';
import { curves, handoff } from './marks.js';
import { clamp } from './math.js';
import type { Preset } from './preset.js';
import { regionPreset } from './preset.js';
import { capturePresetData } from './preset-data.js';

type OwnerAnimations<F extends 'region' | 'text'> = F extends 'region'
  ? Pick<Animations<F>, 'handoff'>
  : Animations<F>;

type Layers = [
  content: HTMLElement,
  placeholder: HTMLElement,
  refresh: HTMLElement,
];

/** The handoff currently running, from ready until it ends or is cancelled. */
interface RunningHandoff {
  /** Render revision it belongs to; a newer revision makes it stale. */
  readonly revision: number;
  readonly detail: HandoffDetail;
  readonly started: number;
  readonly duration: number;
  /** Every Web Animation it owns, cancelled when it finishes. */
  readonly animations: Animation[];
  /** The content fade, whose eased progress rich drivers follow. */
  incoming?: Animation;
  readonly driver: HandoffDriver | undefined;
}

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
  #participants: string | undefined;
  #settled = true;
  #work: RunningHandoff | undefined;
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
  set state(value: LoadingState | undefined) {
    if (value === undefined) this.removeAttribute('state');
    else this.setAttribute('state', String(value));
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
    if (!this.#batching && this.#work?.driver?.targetsChanged?.(this.#targets))
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
      this.applyOptions(patch);
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
  protected override get optionNames(): readonly string[] {
    return [
      ...super.optionNames,
      'state',
      'cycle',
      'timing',
      'animations',
      'revealTargets',
    ];
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
    for (const placeholder of this.querySelectorAll(
      ':scope > [data-dotquilt-placeholder]',
    ))
      placeholder.removeAttribute('hidden');
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    if (!this.shadowRoot) {
      // Layers are slots that never receive nodes, so until their stylesheet
      // gives them boxes they render as `display: contents`: the light DOM
      // then lays out exactly as the static markup did.
      const root = this.attachStyledShadow(this.styles, false);
      const layer = (part: string, className: string, name?: string) => {
        const element = node(this.ownerDocument, 'slot', {
          name: 'dotquilt-layer',
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
      const frame = node(this.ownerDocument, 'slot', {
        name: 'dotquilt-layer',
        class: 'f',
      });
      frame.append(content, placeholder, refresh);
      root.append(frame);
      this.#wrappers = [content, placeholder, refresh];
    }
    this.whenStyled(() => {
      for (const style of this.querySelectorAll(
        ':scope > [data-dotquilt-style]',
      ))
        style.remove();
    });
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
    this.#participants = undefined;
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
    // A simple reveal fades the content wrapper as a whole, so content updates
    // during it (e.g. a framework's follow-up render) must not cut it short.
    // Rich handoffs and row reveals captured content geometry and still settle.
    if (this.#work && !this.#work.driver?.draw && !this.#targets.length) return;
    // Simple wrapper reveals are independent of nested content. Rich/custom
    // plans may capture geometry derived from it, so keep conservative invalidation.
    if (
      !Array.isArray(change) ||
      this.#work?.driver?.draw ||
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
  /** Where the handoff comes from when this element becomes ready. */
  protected abstract handoffSource(): HandoffSource;

  protected override render(): void {
    const w = this.#wrappers;
    if (!w) return;
    const [content, placeholder, refresh] = w;
    const revision = this.#revision;
    const state = this.state;
    const attribute = this.getAttribute('state');
    const invalid = attribute !== null && attribute !== state;
    if (invalid) this.invalidOption('state');
    if (revision !== this.#revision) return;
    this.toggleAttribute('data-dotquilt-disabled', invalid);
    if (this.#work) {
      if (!this.allowed(this.activity) || this.#work.driver?.restricted?.())
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
      // Rich placeholders rebuild when the loading state or cycle changes;
      // other re-renders (e.g. an ancestor class change) leave them alone,
      // since they receive their own size and style notifications.
      const participants = `${state}|${this.cycle ?? ''}`;
      if (participants !== this.#participants) {
        this.#participants = participants;
        this.refreshParticipants();
      }
      return;
    }
    this.#participants = undefined;
    if (prior === 'pending') this.#start(revision, w);
    else this.#settled = true;
  }
  #start(revision: number, [content, placeholder]: Layers): void {
    const timing = this.timing;
    const easing = timing.easing ?? 'ease-out';
    const source = this.handoffSource();
    const binding =
      this.#bindings.handoff ??
      this.preset?.animations?.handoff ??
      source.binding;
    let duration = 0;
    let driver: HandoffDriver | undefined;
    try {
      driver = runHandoff(source.prepare, binding, {
        host: source.host,
        content,
        targets: this.#targets,
        duration: timing.duration,
        current: () => this.#work?.revision === revision,
        own: (animation) => {
          if (this.#work?.revision === revision)
            this.#work.animations.push(animation);
          else animation.cancel();
        },
        report: (code) => this.report(code, 'animations'),
      });
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
      animation: binding?.id ?? source.animation,
    };
    this.#work = {
      revision,
      detail,
      started: now(this),
      duration,
      animations: [],
      driver,
    };
    this.setAttribute('data-presentation', 'handoff');
    this.refreshParticipants();
    emit(this, 'dotquilt-handoff-start', detail);
    if (
      !this.#work ||
      this.#work.revision !== revision ||
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
      const { outgoing, incoming, extra } =
        !binding &&
        (source.animation === 'dotquilt/dissolve' ||
          source.animation === 'dotquilt/fade')
          ? this.#specHandoff(placeholder, content, duration, source.animation)
          : {
              // Custom and dense sources keep one shared clock: they draw in
              // step with the content's progress.
              outgoing: placeholder.animate(
                { opacity: [1, 0] },
                { duration, easing, fill: 'both' },
              ),
              incoming: content.animate(
                { opacity: [0, 1] },
                { duration, easing, fill: 'both' },
              ),
              extra: [],
            };
      this.#work.animations.push(outgoing, incoming, ...extra);
      this.#work.incoming = incoming;
      outgoing.onfinish = () => {
        if (this.#work?.revision === revision) this.#finish('end', 'complete');
      };
      driver?.draw?.(0);
      if (this.#work?.revision === revision)
        driver?.activate(() => this.frame());
    } catch {
      this.report('animation-failed', 'animations');
      this.#finish('end', 'fallback');
    }
  }
  /**
   * design/SPEC.md: content fades in while a slight blur clears and rises
   * into place on a longer settle. Skeleton marks leave by themselves, so
   * their layer holds until the end; other placeholders fade with the content.
   * Every part scales with `duration`, and the handoff ends after the rise.
   */
  #specHandoff(
    placeholder: HTMLElement,
    content: HTMLElement,
    duration: number,
    animation: string,
  ) {
    const scale = duration / handoff.duration;
    const fade = (handoff.contentFade * scale) / duration;
    const timing = this.timing;
    const outgoing = placeholder.animate(
      animation === 'dotquilt/dissolve'
        ? { opacity: [1, 1, 0], offset: [0, 0.9, 1] }
        : {
            opacity: [1, 0, 0],
            offset: [0, fade, 1],
            easing: timing.easing ?? curves.fade,
          },
      { duration, fill: 'both' },
    );
    const incoming = content.animate(
      {
        opacity: [0, 1],
        filter: [`blur(${handoff.blurPx}px)`, 'blur(0px)'],
      },
      {
        duration: handoff.contentFade * scale,
        easing: timing.easing ?? curves.fade,
        fill: 'both',
      },
    );
    const rise = content.animate(
      { translate: [`0 ${handoff.risePx}px`, '0 0'] },
      {
        duration: handoff.contentRise * scale,
        easing: timing.easing ?? curves.settle,
        fill: 'both',
      },
    );
    return { outgoing, incoming, extra: [rise] };
  }
  protected frame(): void {
    const work = this.#work;
    if (!work) return;
    if (!this.allowed(this.activity) || work.driver?.restricted?.()) {
      this.#finish('end', 'restricted');
      return;
    }
    const p = Math.min(1, (now(this) - work.started) / work.duration);
    try {
      work.driver?.draw?.(
        p,
        clamp(work.incoming?.effect?.getComputedTiming().progress ?? p),
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
    work.driver?.dispose();
    for (const animation of work.animations) {
      animation.onfinish = null;
      animation.cancel();
    }
    this.settled();
    if (
      outcome === 'end' &&
      work.revision === this.#revision &&
      this.state === 'ready'
    ) {
      this.setAttribute('data-presentation', 'ready');
      this.#settled = true;
      this.clearDeadline();
    }
    emit(this, `dotquilt-handoff-${outcome}`, { ...work.detail, reason });
  }
}
