import { type Mark, type Motion, marks, type StylePolicy } from '../types.js';
import {
  BaseElement,
  emit,
  installStyles,
  motionRestricted,
  node,
  type RefreshHost,
  styleRefresh,
} from './dom.js';
import type { Preset, PresetKind } from './preset.js';
import { subscribe } from './services.js';
export interface Activity {
  started: number | undefined;
}

import { now, remaining } from './time.js';

export { now, remaining } from './time.js';

/** What an element keeps while its external shadow stylesheet loads. */
interface Hold {
  link: Element;
  /** Renders the light-DOM static fallback, for elements that project it. */
  slot: HTMLSlotElement | undefined;
  observer: MutationObserver | undefined;
  /** Shadow nodes hidden until the stylesheet applies. */
  hidden: Set<Element>;
  /** Work that would remove the static presentation. */
  deferred: (() => void)[];
  /** The pending frame that checks whether the stylesheet has loaded. */
  frame: number | undefined;
  loaded: (event: Event) => void;
}
export abstract class ManagedElement<
  K extends PresetKind = 'skeleton',
> extends BaseElement {
  static observedAttributes = ['motion', 'mark'];
  protected policy: StylePolicy = { mode: 'inline' };
  protected ownActivity: Activity = { started: undefined };
  protected resources: ReturnType<typeof subscribe> | undefined;
  protected deadline: ReturnType<typeof setTimeout> | undefined;
  #queued = false;
  #issues = new Set<string>();
  #hold: Hold | undefined;
  #internals: ElementInternals | undefined;
  // Cached between environment changes so animation frames don't walk ancestors.
  #restricted: boolean | undefined;
  #owner: { value: unknown } | undefined;
  #preset: Preset<K> | undefined;
  protected abstract capturePreset(value: Preset<K>): Preset<K>;
  protected presetChanged(): void {}
  get preset(): Preset<K> | undefined {
    return this.#preset;
  }
  set preset(value: Preset<K> | undefined) {
    try {
      this.#preset =
        value === undefined ? undefined : this.capturePreset(value);
    } catch {
      this.#preset = undefined;
      this.report('invalid-preset', 'preset');
    }
    this.presetChanged();
    this.#motionChanged();
  }
  get motion(): Motion {
    const value =
      this.getAttribute('motion') ?? this.#preset?.motion ?? 'system';
    return value === 'system' ? 'system' : 'paused';
  }
  set motion(value: Motion | undefined) {
    if (value === undefined) this.removeAttribute('motion');
    else this.setAttribute('motion', String(value));
  }
  /** The shape this loader draws. Styles and painters read the attribute. */
  get mark(): Mark {
    const value = this.getAttribute('mark');
    return marks.includes(value as Mark) ? (value as Mark) : 'dot';
  }
  set mark(value: Mark | undefined) {
    if (value === undefined) this.removeAttribute('mark');
    else this.setAttribute('mark', String(value));
  }
  /** Forgets values cached between environment changes. */
  protected forget(): void {
    this.#restricted = undefined;
    this.#owner = undefined;
  }
  /** The owning region (or other owner), computed once per environment change. */
  protected cachedOwner<T>(compute: () => T): T {
    this.#owner ??= { value: compute() };
    return this.#owner.value as T;
  }
  #motionChanged(): void {
    this.forget();
    this.toggleAttribute(
      'data-dotquilt-paused',
      !this.hasAttribute('motion') && this.#preset?.motion === 'paused',
    );
    this.requestRender();
  }
  get stylePolicy(): StylePolicy {
    return this.policy;
  }
  set stylePolicy(value: StylePolicy) {
    if (this.shadowRoot) {
      try {
        if (JSON.stringify(value) !== JSON.stringify(this.policy))
          this.report('late-style-policy', 'stylePolicy');
      } catch {
        this.report('invalid-style-policy', 'stylePolicy');
      }
      return;
    }
    if (
      !value ||
      !['inline', 'external'].includes(value.mode) ||
      (value.mode === 'external' &&
        (typeof value.href !== 'string' ||
          value.href.length > 2048 ||
          !/^(https?:\/\/|\/[^/]|\.\.?\/)/.test(value.href))) ||
      (value.mode === 'inline' &&
        value.nonce !== undefined &&
        (typeof value.nonce !== 'string' || value.nonce.length > 256))
    ) {
      this.report('invalid-style-policy', 'stylePolicy');
      return;
    }
    this.policy = Object.freeze({ ...value });
  }
  /**
   * Attaches the shadow root with this element's styles.
   *
   * An external stylesheet loads asynchronously, and until it applies the
   * shadow tree would render unstyled and shift the layout that the static
   * (server) markup reserved. So until it loads, the element keeps its static
   * presentation instead: it matches `:state(unstyled)`, which the static
   * rules treat like `:not(:defined)`; with `projectFallback` it renders its
   * light-DOM fallback through a leading slot and hides what it adds to its
   * shadow root; motion waits; and `whenStyled` work is deferred. A stylesheet
   * that fails to load leaves the static presentation in place.
   *
   * A loaded stylesheet applies before its `load` event, possibly a frame
   * earlier, and its `display` rules then override `hidden`. So the hold also
   * ends in the first animation frame that finds the stylesheet loaded.
   */
  protected attachStyledShadow(
    css: readonly string[],
    projectFallback: boolean,
  ): ShadowRoot {
    const root = this.attachShadow({ mode: 'open' });
    installStyles(root, css, this.policy);
    const link = root.lastElementChild;
    if (this.policy.mode !== 'external' || !link || Reflect.get(link, 'sheet'))
      return root;
    try {
      this.#internals ??= this.attachInternals();
      this.#internals.states.add('unstyled');
    } catch {
      // Without custom states the static rules cannot follow the element.
      return root;
    }
    const hold: Hold = {
      link,
      slot: undefined,
      observer: undefined,
      hidden: new Set(),
      deferred: [],
      frame: undefined,
      loaded: (event) => {
        if (event.target === link) this.#release();
      },
    };
    if (projectFallback) {
      const slot = node(this.ownerDocument, 'slot');
      root.append(slot);
      const hide = () => {
        for (const child of root.children)
          if (
            child !== link &&
            child !== slot &&
            !child.hasAttribute('hidden')
          ) {
            child.setAttribute('hidden', '');
            hold.hidden.add(child);
          }
      };
      hold.slot = slot;
      hold.observer = new MutationObserver(hide);
      hold.observer.observe(root, { childList: true });
    }
    // Capturing on the root runs before the elements' own load listeners,
    // which measure the styled tree.
    root.addEventListener('load', hold.loaded, true);
    this.#hold = hold;
    this.#watch();
    return root;
  }
  /** Runs `work` once the shadow stylesheet applies (now, if it has). */
  protected whenStyled(work: () => void): void {
    if (this.#hold) this.#hold.deferred.push(work);
    else work();
  }
  /** Checks each frame, while connected, whether the stylesheet has loaded. */
  #watch(): void {
    const hold = this.#hold;
    const win = this.ownerDocument.defaultView;
    if (!hold || !win || hold.frame !== undefined) return;
    hold.frame = win.requestAnimationFrame(() => {
      hold.frame = undefined;
      if (Reflect.get(hold.link, 'sheet')) this.#release();
      else if (this.isConnected) this.#watch();
    });
  }
  #release(): void {
    const hold = this.#hold;
    if (!hold) return;
    this.#hold = undefined;
    this.shadowRoot?.removeEventListener('load', hold.loaded, true);
    if (hold.frame !== undefined)
      this.ownerDocument.defaultView?.cancelAnimationFrame(hold.frame);
    hold.observer?.disconnect();
    hold.slot?.remove();
    for (const child of hold.hidden) child.removeAttribute('hidden');
    this.#internals?.states.delete('unstyled');
    for (const work of hold.deferred) work();
    this.forget();
    this.requestRender();
  }
  connectedCallback(): void {
    // A stylesheet can finish loading while the element is disconnected.
    if (this.#hold && Reflect.get(this.#hold.link, 'sheet')) this.#release();
    else this.#watch();
    const href = this.getAttribute('data-dotquilt-style-href');
    if (!this.shadowRoot && (href !== null || this.nonce))
      this.stylePolicy =
        href !== null
          ? { mode: 'external', href }
          : { mode: 'inline', nonce: this.nonce };
    this.forget();
    this.upgrade();
    this.resources = subscribe({
      host: this,
      changed: () => {
        this.forget();
        this.environmentChanged();
      },
    });
    this.#motionChanged();
  }
  protected abstract upgrade(): void;

  disconnectedCallback(): void {
    this.forget();
    this.resources?.release();
    this.resources = undefined;
    this.clearDeadline();
  }
  adoptedCallback(): void {
    if (this.resources) {
      this.disconnectedCallback();
      this.connectedCallback();
    }
  }
  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null,
  ): void {
    this.forget();
    if (
      name === 'motion' &&
      value !== null &&
      !['system', 'paused'].includes(value)
    )
      this.invalidOption('motion');
    if (name === 'mark' && value !== null && !marks.includes(value as Mark))
      this.invalidOption('mark');
    if (name === 'motion') this.#motionChanged();
    else this.requestRender();
  }
  protected environmentChanged(): void {
    this.requestRender();
  }
  protected clearDeadline(): void {
    clearTimeout(this.deadline);
    this.deadline = undefined;
  }
  protected arm(activity: Activity): void {
    this.clearDeadline();
    if (activity.started === undefined) activity.started = now(this);
    this.deadline = setTimeout(
      () => {
        this.deadline = undefined;
        this.requestRender();
      },
      remaining(this, activity),
    );
  }
  protected allowed(activity: Activity): boolean {
    // No motion on an unstyled shadow tree.
    if (this.#hold) return false;
    if (!this.resources?.eligible() || remaining(this, activity) <= 0)
      return false;
    this.#restricted ??= motionRestricted(this);
    return !this.#restricted;
  }

  /** The property names update() applies; subclasses add their own. */
  protected get optionNames(): readonly string[] {
    return ['motion', 'mark', 'stylePolicy', 'preset'];
  }
  /**
   * Applies the keys of `patch` that are options of this element. Any other
   * key is reported as `unknown-option` instead of being stored as an expando.
   */
  protected applyOptions(patch: object): void {
    const names = this.optionNames;
    for (const [key, value] of Object.entries(patch))
      if (names.includes(key)) Reflect.set(this, key, value);
      else this.report('unknown-option', key);
  }
  /** Reports a value outside an option's allowed set, by its property name. */
  protected invalidOption(attribute: string): void {
    this.report(
      'invalid-option',
      attribute.replace(/-([a-z])/g, (_, letter: string) =>
        letter.toUpperCase(),
      ),
    );
  }
  protected report(code: string, field: string): void {
    const key = `${code}:${field}`;
    if (this.#issues.has(key)) return;
    this.#issues.add(key);
    emit(this, 'dotquilt-error', { code, field });
  }
  protected requestRender(): void {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.resources) this.render();
    });
  }
  protected abstract render(): void;
}
export function refreshStyles(scope: ParentNode): void {
  const hosts = [
    ...scope.querySelectorAll(
      '[data-dotquilt-surface],dotquilt-region,dotquilt-text-loader',
    ),
  ];
  if (
    'matches' in scope &&
    (scope as Element).matches(
      '[data-dotquilt-surface],dotquilt-region,dotquilt-text-loader',
    )
  )
    hosts.push(scope as Element);
  for (const host of hosts) {
    (host as RefreshHost)[styleRefresh]?.();
    (host as ManagedElement & { refresh(): void }).refresh?.();
  }
}
