import type {
  HandoffDetail,
  LoaderErrorDetail,
  Mark,
  Motion,
  StylePolicy,
} from 'dotquilt';
import {
  wrapperNeedsMarkStyles,
  wrapperPolicyAttributes,
  wrapperStyleSlot,
} from 'dotquilt/wrapper';
import { onMount } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

/** Callbacks for the native events, as in `@dotquilt/react`. */
export interface LoaderEvents {
  onHandoffStart?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onHandoffEnd?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onHandoffCancel?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onLoaderError?: ((event: CustomEvent<LoaderErrorDetail>) => void) | undefined;
}

/** Props every component takes, besides any attribute for the host. */
export interface HostProps<E extends HTMLElement = HTMLElement>
  extends LoaderEvents,
    Omit<HTMLAttributes<E>, 'children'> {
  stylePolicy?: StylePolicy | undefined;
  motion?: Motion | undefined;
  /** The native element, once mounted (`bind:element`). */
  element?: E | undefined;
}
export interface MarkProps {
  /** The shape the loader draws. */
  mark?: Mark | undefined;
}

const names = {
  'dotquilt-handoff-start': 'onHandoffStart',
  'dotquilt-handoff-end': 'onHandoffEnd',
  'dotquilt-handoff-cancel': 'onHandoffCancel',
  'dotquilt-error': 'onLoaderError',
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
 * Registers the element after mount (so it never changes markup Svelte is
 * hydrating), then delivers every option through `update()` on mount and on
 * each change. Svelte owns the children; the element owns its presentation.
 */
export function useHost(
  host: () => HTMLElement | undefined,
  register: () => void,
  patch: () => object,
  events: () => LoaderEvents,
): void {
  onMount(() => {
    const node = host();
    if (!node) return;
    const listen = (event: Event) => {
      if (event.target !== node) return;
      const callback = events()[names[event.type as keyof typeof names]] as
        | ((event: Event) => void)
        | undefined;
      callback?.(event);
    };
    for (const name of Object.keys(names)) node.addEventListener(name, listen);
    // After removal, so the cancellation the element sends as it
    // disconnects still arrives.
    return () =>
      queueMicrotask(() => {
        for (const name of Object.keys(names))
          node.removeEventListener(name, listen);
      });
  });
  $effect(() => {
    const value = patch();
    const node = host() as Host | undefined;
    if (node) apply(node, register, value);
  });
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? '&quot;',
  );

/**
 * The light-DOM styles a loader needs before its element is defined, as HTML
 * for `{@html}` inside the host: they never shift the page's own
 * `:first-child` or sibling selectors, a `slot` no slot matches keeps them out
 * of the element's content, and a stylesheet applies wherever it is.
 */
export function sheet(
  css: readonly string[],
  policy: StylePolicy,
  family: string,
): string {
  const tag = `slot="${wrapperStyleSlot}" data-dotquilt-wrapper-style="${family}"`;
  if (policy.mode === 'external')
    return `<link rel="stylesheet" href="${escapeHtml(policy.href)}" ${tag}>`;
  const nonce = wrapperPolicyAttributes(policy).nonce;
  return `<style${nonce === undefined ? '' : ` nonce="${escapeHtml(nonce)}"`} ${tag}>${css.join('\n')}</style>`;
}

/** The extra static rules for a square or dash mark; nothing for dots. */
export function markSheet(
  css: () => readonly string[],
  policy: StylePolicy,
  family: string,
  mark: unknown,
): string {
  return wrapperNeedsMarkStyles(policy, mark)
    ? sheet(css(), policy, `${family}-marks`)
    : '';
}
