import {
  afterRenderEffect,
  CSP_NONCE,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  type OutputEmitterRef,
  output,
  untracked,
} from '@angular/core';
import type {
  HandoffDetail,
  LoaderErrorDetail,
  Mark,
  Motion,
  StylePolicy,
} from 'dotquilt';
import { wrapperPolicy, wrapperPolicyAttributes } from 'dotquilt/wrapper';

const names = {
  'dotquilt-handoff-start': 'handoffStart',
  'dotquilt-handoff-end': 'handoffEnd',
  'dotquilt-handoff-cancel': 'handoffCancel',
  'dotquilt-error': 'loaderError',
} as const;
type Host = HTMLElement & { update(patch: object): void };

function apply(node: Host, register: () => void, value: object) {
  try {
    if (!node.ownerDocument.defaultView?.customElements.get(node.localName))
      for (const [key, option] of Object.entries(value))
        Reflect.set(node, key, option);
    register();
    node.update(value);
  } catch (error) {
    node.dispatchEvent(
      new CustomEvent('dotquilt-error', {
        bubbles: true,
        composed: true,
        detail: {
          code:
            error && typeof error === 'object' && 'code' in error
              ? error.code
              : 'registration-failed',
          field: 'registration',
        },
      }),
    );
  }
}

/**
 * What every component shares: the native element is the component's own
 * host, the style policy, motion, and the four events. Subclasses add their
 * options and call `connect()` from their constructor.
 */
@Directive()
export abstract class Loader<E extends HTMLElement = HTMLElement> {
  /** How the element adds its styles; defaults to the app's `CSP_NONCE`. */
  readonly stylePolicy = input<StylePolicy>();
  readonly motion = input<Motion>();
  /** The handoff from the placeholder to the content begins. */
  readonly handoffStart: OutputEmitterRef<CustomEvent<HandoffDetail>> =
    output();
  /** The handoff finished; `detail.reason` says how. */
  readonly handoffEnd: OutputEmitterRef<CustomEvent<HandoffDetail>> = output();
  /** A newer state or cycle replaced the handoff. */
  readonly handoffCancel: OutputEmitterRef<CustomEvent<HandoffDetail>> =
    output();
  /** An option was invalid or an animation failed. */
  readonly loaderError: OutputEmitterRef<CustomEvent<LoaderErrorDetail>> =
    output();
  /** The native element. */
  readonly element: E = inject<ElementRef<E>>(ElementRef).nativeElement;
  readonly #nonce = inject(CSP_NONCE, { optional: true });
  #policy: StylePolicy | undefined;

  /** The style policy from the first render; the element keeps it. */
  protected policy(): StylePolicy {
    this.#policy ??= wrapperPolicy(
      this.stylePolicy() ??
        (this.#nonce ? { mode: 'inline', nonce: this.#nonce } : undefined),
    );
    return this.#policy;
  }
  /** The host attributes that carry the policy, for host bindings. */
  protected policyAttribute(name: 'nonce' | 'data-dotquilt-style-href') {
    return wrapperPolicyAttributes(this.policy())[name] ?? null;
  }

  /**
   * Registers the element in the browser after rendering, then delivers
   * every option through `update()` whenever an input changes. Angular owns
   * the children; the element owns its presentation.
   */
  protected connect(register: () => void, options: () => object): void {
    const host = this.element as unknown as Host;
    let listening = false;
    let destroyed = false;
    const listen = (event: Event) => {
      if (event.target !== host || destroyed) return;
      const name = names[event.type as keyof typeof names];
      (this[name] as OutputEmitterRef<Event>).emit(event);
    };
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      for (const name of Object.keys(names))
        host.removeEventListener(name, listen);
    });
    afterRenderEffect({
      write: () => {
        // Read the inputs tracked, so a change runs this again.
        const value = {
          ...options(),
          motion: this.motion(),
          stylePolicy: this.stylePolicy() ?? this.policy(),
        };
        untracked(() => {
          // Listening before the first update(), which can already report
          // an invalid option; and untracked, so signals an output handler
          // reads don't become this effect's dependencies.
          if (!listening) {
            listening = true;
            for (const name of Object.keys(names))
              host.addEventListener(name, listen);
          }
          apply(host, register, value);
        });
      },
    });
  }
}

/** For loaders that draw marks. */
@Directive()
export abstract class MarkLoader<
  E extends HTMLElement = HTMLElement,
> extends Loader<E> {
  /** The shape of each mark. */
  readonly mark = input<Mark>();
}

/** Remembers the first value: the first render's attributes stay put. */
export function first<T>(make: () => T): () => T {
  let value: { readonly v: T } | undefined;
  return () => {
    value ??= { v: make() };
    return value.v;
  };
}
