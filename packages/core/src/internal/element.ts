import type { Motion, StylePolicy } from '../types.js';
import { BaseElement, emit, motionRestricted } from './dom.js';
import type { Preset, PresetKind } from './preset.js';
import { subscribe } from './services.js';
export interface Activity {
  started: number | undefined;
}

import { now, remaining } from './time.js';

export { now, remaining } from './time.js';
export abstract class ManagedElement<
  K extends PresetKind = 'skeleton',
> extends BaseElement {
  static observedAttributes = ['motion'];
  protected policy: StylePolicy = { mode: 'inline' };
  protected ownActivity: Activity = { started: undefined };
  protected resources: ReturnType<typeof subscribe> | undefined;
  protected deadline: ReturnType<typeof setTimeout> | undefined;
  #queued = false;
  #issues = new Set<string>();
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
    this.configurationChanged();
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
  /**
   * Configuration changed (attributes, preset, animations, reconnection):
   * problems already reported may be reported again if they recur.
   */
  protected configurationChanged(): void {
    this.#issues.clear();
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
  connectedCallback(): void {
    const href = this.getAttribute('data-dotquilt-style-href');
    if (!this.shadowRoot && (href !== null || this.nonce))
      this.stylePolicy =
        href !== null
          ? { mode: 'external', href }
          : { mode: 'inline', nonce: this.nonce };
    this.forget();
    this.configurationChanged();
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
    this.configurationChanged();
    if (
      name === 'motion' &&
      value !== null &&
      !['system', 'paused'].includes(value)
    )
      this.report('invalid-motion', 'motion');
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
    if (!this.resources?.eligible() || remaining(this, activity) <= 0)
      return false;
    this.#restricted ??= motionRestricted(this);
    return !this.#restricted;
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
    Reflect.get(host, Symbol.for('dotquilt.style-refresh.v1'))?.();
    (host as ManagedElement & { refresh(): void }).refresh?.();
  }
}
