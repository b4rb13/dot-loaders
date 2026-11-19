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
import { ManagedElement, now } from './element.js';
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
import { motionLimit } from './time.js';

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
  /** When its clock started; later than the start while a view transition runs. */
  started: number;
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
      'delay',
      'minDisplay',
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
  /** A built-in cue shown while refreshing, when the app gives none. */
  protected refreshCue(): Element | undefined {
    return undefined;
  }
  /** Called once each time refreshing starts with the built-in cue. */
  protected refreshStarted(_cue: Element): void {}
  protected override capturePreset(value: Preset<F>): Preset<F> {
    return capturePresetData(value, this.family, () => regionPreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'state',
    'cycle',
    'tabindex',
    'delay',
    'min-display',
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
  /**
   * Anti-flicker timing. `#shownAt` is when the placeholder became visible;
   * `#timer` ends a delay or a minimum display. A loader upgraded from markup
   * already on the page (server rendering) has its placeholder on screen, so
   * its first render is never delayed.
   */
  #shownAt: number | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #rendered = false;
  readonly #inPlace = this.isConnected;
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
  /** Milliseconds to wait before showing the placeholder (0–10000). */
  get delay(): number {
    return this.#milliseconds('delay');
  }
  set delay(value: number | undefined) {
    if (value === undefined) this.removeAttribute('delay');
    else this.setAttribute('delay', String(value));
  }
  /** Milliseconds a placeholder stays once shown (0–10000). */
  get minDisplay(): number {
    return this.#milliseconds('min-display');
  }
  set minDisplay(value: number | undefined) {
    if (value === undefined) this.removeAttribute('min-display');
    else this.setAttribute('min-display', String(value));
  }
  #milliseconds(name: string): number {
    const value = Number(this.getAttribute(name) ?? 0);
    return Number.isFinite(value) && value >= 0 ? Math.min(10000, value) : 0;
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
    } else this.accept('timing.easing');
    if (duration !== undefined && !valid)
      this.report('invalid-duration', 'timing.duration');
    else this.accept('timing.duration');
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
      this.accept('animations');
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
    else this.accept('revealTargets');
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
    readonly delay?: number | undefined;
    readonly minDisplay?: number | undefined;
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
      ManagedElement.newCycle(this);
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
      'delay',
      'minDisplay',
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
      (name === 'delay' || name === 'min-display') &&
      value !== null &&
      !(Number.isFinite(Number(value)) && Number(value) >= 0)
    )
      this.invalidOption(name);
    if (
      !this.#batching &&
      old !== value &&
      (name === 'state' || name === 'cycle')
    ) {
      this.#revision++;
      this.#finish('cancel', 'superseded');
      ManagedElement.newCycle(this);
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
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.removeAttribute('data-dotquilt-waiting');
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
    // The default morph reads geometry once and reveals the whole wrapper, so
    // it carries on like a simple reveal (its marks may land a little off).
    const driver = this.#work?.driver;
    if (
      this.#work &&
      (driver?.paints || (!driver?.draw && !this.#targets.length))
    )
      return;
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
    const requested = this.state;
    const attribute = this.getAttribute('state');
    const invalid = attribute !== null && attribute !== requested;
    const waiting = this.hasAttribute('data-dotquilt-waiting');
    const first = !this.#rendered;
    this.#rendered = true;
    let state = requested;
    // Minimum display: a placeholder that showed stays until min-display.
    if (
      requested === 'ready' &&
      this.#previous === 'pending' &&
      !waiting &&
      this.#shownAt !== undefined
    ) {
      const left = this.#shownAt + this.minDisplay - now(this);
      if (left > 0) {
        this.#later(left, () => this.requestRender());
        state = 'pending';
      }
    }
    // Delay: entering pending, the placeholder stays hidden for `delay`; a
    // response inside it skips the placeholder and its handoff altogether.
    let skipHandoff = false;
    if (state === 'pending' && (this.#previous !== 'pending' || first)) {
      if (this.delay > 0 && !(first && this.#inPlace)) {
        this.setAttribute('data-dotquilt-waiting', '');
        this.#shownAt = undefined;
        this.#later(this.delay, () => {
          this.removeAttribute('data-dotquilt-waiting');
          this.#shownAt = now(this);
        });
      } else if (!waiting) this.#shownAt = now(this);
    } else if (state !== 'pending' && waiting) {
      clearTimeout(this.#timer);
      this.removeAttribute('data-dotquilt-waiting');
      skipHandoff = true;
    }
    if (invalid) this.invalidOption('state');
    if (revision !== this.#revision) return;
    this.toggleAttribute('data-dotquilt-disabled', invalid);
    if (this.#work) {
      if (!this.canAnimate() || this.#work.driver?.restricted?.())
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
    } else {
      // The built-in cue is the slot's fallback: an app's own indicator,
      // slotted in, replaces it.
      const cue = state === 'refreshing' ? this.refreshCue() : undefined;
      if (cue) {
        if (indicator.firstChild !== cue) indicator.replaceChildren(cue);
        if (prior !== 'refreshing') this.refreshStarted(cue);
      } else if (indicator.firstChild) indicator.replaceChildren();
    }
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
    if (prior === 'pending' && !skipHandoff) this.#start(revision, w);
    else this.#settled = true;
  }
  /** Runs `task` after `ms`, replacing any earlier timer. */
  #later(ms: number, task: () => void): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      task();
    }, ms);
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
        placeholder,
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
    // The handoff ignores the idle's 4-second window: it is short, and it
    // happens because the data arrived (owner decision 3, 2026-11-19). A
    // requested handoff longer than the motion limit is still skipped.
    if (
      !this.canAnimate() ||
      driver?.restricted?.() ||
      duration > motionLimit ||
      activeWithin(content)
    )
      duration = 0;
    const detail: HandoffDetail = {
      cycle: this.cycle,
      handoffId: ++this.#serial,
      animation:
        binding?.id ?? (driver?.paints ? 'dotquilt/morph' : source.animation),
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
    // Synchronous start handlers may change restrictions.
    if (!this.canAnimate() || driver?.restricted?.()) {
      this.#finish('end', 'restricted');
      return;
    }
    try {
      const { outgoing, incoming, extra } = driver?.paints
        ? this.#heldHandoff(placeholder, content, duration)
        : !binding &&
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
      driver?.attach?.(outgoing, incoming);
      outgoing.onfinish = () => {
        if (this.#work?.revision === revision) this.#finish('end', 'complete');
      };
      driver?.draw?.(0);
      // A view transition (React's <ViewTransition>, or startViewTransition)
      // shows frozen snapshots while it runs. Hold the handoff's first frame
      // until it finishes, so the reveal plays where people can see it
      // instead of jumping ahead when the snapshots lift.
      const transition = (
        this.ownerDocument as Document & {
          activeViewTransition?: { finished: Promise<unknown> } | null;
        }
      ).activeViewTransition;
      if (transition) {
        const work = this.#work;
        for (const animation of work.animations) animation.pause();
        const go = () => {
          if (this.#work !== work || work.revision !== revision) return;
          work.started = now(this);
          for (const animation of work.animations) animation.play();
          driver?.activate(() => this.frame());
        };
        transition.finished.then(go, go);
        return;
      }
      if (this.#work?.revision === revision)
        driver?.activate(() => this.frame());
    } catch {
      this.report('animation-failed', 'animations');
      this.#finish('end', 'fallback');
    }
  }
  /**
   * The driver paints both layers itself (morph.ts); these only keep the
   * handoff's clock, so the layers stay fully opaque under its masks.
   */
  #heldHandoff(
    placeholder: HTMLElement,
    content: HTMLElement,
    duration: number,
  ) {
    const timing = { duration, fill: 'both' as const };
    return {
      outgoing: placeholder.animate({ opacity: [1, 1] }, timing),
      incoming: content.animate({ opacity: [1, 1] }, timing),
      extra: [],
    };
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
    if (!this.canAnimate() || work.driver?.restricted?.()) {
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
