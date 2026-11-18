import {
  type ForwardedRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import type { LoaderEvents } from './types.js';

const names = {
  'dotquilt-handoff-start': 'onHandoffStart',
  'dotquilt-handoff-end': 'onHandoffEnd',
  'dotquilt-handoff-cancel': 'onHandoffCancel',
  'dotquilt-error': 'onLoaderError',
} as const;
type Host = HTMLElement & { update(patch: object): void };
interface Bridge<E extends Host> {
  node: E;
  events: LoaderEvents;
  generation: number;
  listen(event: Event): void;
}
/** Commit-only property delivery. React owns its children; core owns presentation. */
export function useHost<E extends Host>(
  ref: ForwardedRef<E>,
  register: () => void,
  patch: object,
  events: LoaderEvents,
) {
  const node = useRef<E | null>(null);
  const bridge = useRef<Bridge<E> | undefined>(undefined);
  useLayoutEffect(() => {
    const host = node.current;
    if (!host) return;
    let current = bridge.current;
    if (!current || current.node !== host) {
      const value: Bridge<E> = {
        node: host,
        events,
        generation: 0,
        listen(event) {
          if (event.target !== host) return;
          const name = names[event.type as keyof typeof names];
          const callback = value.events[name] as
            | ((event: Event) => void)
            | undefined;
          callback?.(event);
        },
      };
      current = bridge.current = value;
      for (const name of Object.keys(names))
        host.addEventListener(name, value.listen);
    }
    current.events = events;
    const generation = ++current.generation;
    try {
      if (!host.ownerDocument.defaultView?.customElements.get(host.localName))
        for (const [key, value] of Object.entries(patch))
          Reflect.set(host, key, value);
      register();
      host.update(patch);
    } catch (error) {
      host.dispatchEvent(
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
    // Native disconnection emits cancellation synchronously during DOM removal.
    // Strict Mode setup invalidates this deferred detach without duplicating listeners.
    return () =>
      queueMicrotask(() => {
        if (current.generation !== generation) return;
        for (const name of Object.keys(names))
          host.removeEventListener(name, current.listen);
        if (bridge.current === current) bridge.current = undefined;
      });
  });
  useImperativeHandle(ref, () => node.current as E, []);
  return node;
}
