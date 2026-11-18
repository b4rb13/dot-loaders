import {
  LoaderConfigurationError,
  type StylePolicy,
} from '@dotquilt-internal/core';
import {
  createElement,
  useId,
  useRef,
  useSyncExternalStore,
  version,
} from 'react';
export function initialPolicy(value: StylePolicy | undefined): StylePolicy {
  const policy = value ?? { mode: 'inline' };
  if (
    !policy ||
    (policy.mode !== 'inline' && policy.mode !== 'external') ||
    (policy.mode === 'inline' &&
      policy.nonce !== undefined &&
      (typeof policy.nonce !== 'string' || policy.nonce.length > 256)) ||
    (policy.mode === 'external' &&
      (typeof policy.href !== 'string' ||
        policy.href.length > 2048 ||
        !/^(https?:\/\/|\/[^/]|\.\.?\/)/.test(policy.href)))
  )
    throw new LoaderConfigurationError(
      'invalid-style-policy',
      'Invalid style policy',
    );
  return Object.freeze({ ...policy });
}
export function policyAttributes(
  policy: StylePolicy,
  nonce: string | undefined,
) {
  return policy.mode === 'external'
    ? { 'data-dotquilt-style-href': policy.href }
    : { nonce };
}
// React 19.0–19.2 compare the visible nonce attribute during hydration.
// CSP hides that attribute while preserving HTMLElement.nonce. Match the actual
// attribute for hydration, then restore the real prop through the store snapshot.
// No DOM is mutated here and no hydration warning is suppressed.
const legacyNonce = /^19\.[012]\./.test(version);
const subscribe = () => () => {};
export function useStyleNonce(
  policy: StylePolicy,
  family: string,
): string | undefined {
  const nonce = policy.mode === 'inline' ? policy.nonce : undefined;
  return useSyncExternalStore(
    subscribe,
    () => nonce,
    () => {
      if (legacyNonce && nonce && typeof document !== 'undefined') {
        const style = [
          ...document.querySelectorAll<HTMLStyleElement>(
            `style[data-dotquilt-react-style="${family}"]`,
          ),
        ].find((element) => element.nonce === nonce);
        return style?.getAttribute('nonce') ?? nonce;
      }
      return nonce;
    },
  );
}
export function sheet(
  css: readonly string[],
  policy: StylePolicy,
  family: string,
  nonce: string | undefined,
) {
  return policy.mode === 'external'
    ? createElement('link', {
        key: family,
        rel: 'stylesheet',
        href: policy.href,
        'data-dotquilt-react-style': family,
      })
    : createElement(
        'style',
        { key: family, nonce, 'data-dotquilt-react-style': family },
        css.join('\n'),
      );
}

/** Match native-owned attributes after an early upgrade, then leave them native-owned.
 * The immutable snapshot never rewrites later presentation changes on React commits.
 */
export function useUpgradeAttributes(
  fields: readonly string[],
  initial: Readonly<Record<string, string | null>> = {},
): Readonly<Record<string, string | null>> {
  const id = useId();
  const captured = useRef<Readonly<Record<string, string | null>> | undefined>(
    undefined,
  );
  const snapshot = () => {
    if (!captured.current) {
      const host =
        typeof document === 'undefined'
          ? undefined
          : [...document.querySelectorAll('[data-dotquilt-react-host]')].find(
              (node) => node.getAttribute('data-dotquilt-react-host') === id,
            );
      captured.current = Object.freeze(
        Object.fromEntries(
          fields.map((field) => [
            field,
            (host ? host.getAttribute(field) : initial[field]) ?? null,
          ]),
        ),
      );
    }
    return captured.current;
  };
  return {
    'data-dotquilt-react-host': id,
    ...useSyncExternalStore(subscribe, snapshot, snapshot),
  };
}

/** Capture one primitive native-owned value without constructing a field map. */
export function useCustomAttribute(): Readonly<Record<string, string | null>> {
  const id = useId();
  const captured = useRef<string | null | undefined>(undefined);
  const snapshot = () => {
    if (captured.current === undefined) {
      captured.current = null;
      if (typeof document !== 'undefined')
        for (const host of document.querySelectorAll(
          '[data-dotquilt-react-host]',
        )) {
          if (host.getAttribute('data-dotquilt-react-host') === id) {
            captured.current = host.getAttribute('data-custom');
            break;
          }
        }
    }
    return captured.current;
  };
  return {
    'data-dotquilt-react-host': id,
    'data-custom': useSyncExternalStore(subscribe, snapshot, snapshot),
  };
}
