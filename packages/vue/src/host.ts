import type { HandoffDetail, LoaderErrorDetail, StylePolicy } from 'dotquilt';
import {
  wrapperNeedsMarkStyles,
  wrapperPolicyAttributes,
  wrapperStyleSlot,
} from 'dotquilt/wrapper';
import {
  h,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref,
  shallowRef,
  type VNode,
  watch,
} from 'vue';

/** Native events, and the Vue events they become. */
const events = {
  'dotquilt-handoff-start': 'handoffStart',
  'dotquilt-handoff-end': 'handoffEnd',
  'dotquilt-handoff-cancel': 'handoffCancel',
  'dotquilt-error': 'loaderError',
} as const;
/** A component's `emit`, whichever of the events above it declares. */
type Emit = (...args: never[]) => void;

/** Every component's events: `@handoff-start`, `@handoff-end`, … */
export const loaderEmits = {
  handoffStart: (_event: CustomEvent<HandoffDetail>) => true,
  handoffEnd: (_event: CustomEvent<HandoffDetail>) => true,
  handoffCancel: (_event: CustomEvent<HandoffDetail>) => true,
  loaderError: (_event: CustomEvent<LoaderErrorDetail>) => true,
};

/** Props every component takes. */
export const hostProps = {
  stylePolicy: Object as PropType<StylePolicy>,
  motion: String as PropType<'system' | 'paused'>,
};

export type Host = HTMLElement & { update(patch: object): void };

/**
 * Registers the element after mount (so it never changes markup Vue is
 * hydrating), then delivers every option through `update()` on mount and on
 * each change. Vue owns the children; the element owns its presentation.
 */
export function useHost<E extends Host>(
  register: () => void,
  patch: () => object,
  emit: Emit,
): Ref<E | undefined> {
  const send = emit as (name: string, event: Event) => void;
  const host = shallowRef<E>();
  let attached: E | undefined;
  const listen = (event: Event) => {
    if (event.target === attached)
      send(events[event.type as keyof typeof events], event);
  };
  const apply = (value: object) => {
    const node = host.value;
    if (!node) return;
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
  };
  onMounted(() => {
    attached = host.value;
    if (!attached) return;
    for (const name of Object.keys(events))
      attached.addEventListener(name, listen);
    apply(patch());
  });
  // Deep, so an array or object changed in place (`columns.push(…)`)
  // reaches the element too.
  watch(patch, apply, { flush: 'post', deep: true });
  // After removal, so the cancellation the element sends as it disconnects
  // still reaches the component.
  onUnmounted(() => {
    for (const name of Object.keys(events))
      attached?.removeEventListener(name, listen);
    attached = undefined;
  });
  return host;
}

/**
 * The light-DOM styles a loader needs before its element is defined. They
 * sit inside the host, so they never shift the page's own `:first-child` or
 * sibling selectors; a `slot` no slot matches keeps them out of the
 * element's content, and a stylesheet applies wherever it is.
 */
export function sheet(
  css: readonly string[],
  policy: StylePolicy,
  family: string,
): VNode {
  if (policy.mode === 'external')
    return h('link', {
      rel: 'stylesheet',
      href: policy.href,
      slot: wrapperStyleSlot,
      'data-dotquilt-wrapper-style': family,
    });
  return h('style', {
    ...wrapperPolicyAttributes(policy),
    slot: wrapperStyleSlot,
    'data-dotquilt-wrapper-style': family,
    innerHTML: css.join('\n'),
  });
}

/** The extra static rules for a square or dash mark, or nothing for dots. */
export function markSheet(
  css: () => readonly string[],
  policy: StylePolicy,
  family: string,
  mark: unknown,
): VNode | null {
  return wrapperNeedsMarkStyles(policy, mark)
    ? sheet(css(), policy, `${family}-marks`)
    : null;
}

/** The wrapper-owned node holding a loader's static drawing. */
export const staticDrawing = (children?: VNode[]): VNode =>
  h('span', { 'data-dotquilt-wrapper-static': '', 'aria-hidden': 'true' }, [
    h('span', { 'data-dotquilt-static': '' }, children),
  ]);
