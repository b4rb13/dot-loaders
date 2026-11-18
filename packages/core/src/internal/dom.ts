import { LoaderRegistrationError, type StylePolicy } from '../types.js';
import { implementationVersion as version } from './version.js';

const implementation = Symbol.for('dotquilt.implementation');
export const BaseElement = (globalThis.HTMLElement ??
  class {}) as typeof HTMLElement;
export function register(
  name: string,
  elementClass: CustomElementConstructor,
): void {
  if (typeof customElements === 'undefined')
    throw new Error('Registration requires a browser');
  const old = customElements.get(name) as
    | (CustomElementConstructor & { [implementation]?: string })
    | undefined;
  if (old) {
    if (!Object.hasOwn(old, implementation) || old[implementation] !== version)
      throw new LoaderRegistrationError(name);
    return;
  }
  Object.defineProperty(elementClass, implementation, { value: version });
  customElements.define(name, elementClass);
}
export function node<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  for (const key of Object.keys(attrs))
    el.setAttribute(key, attrs[key] as string);
  return el;
}
export function installStyles(
  root: ShadowRoot,
  css: readonly string[],
  policy: StylePolicy,
): void {
  if (policy.mode === 'external')
    root.append(
      node(root.ownerDocument, 'link', {
        rel: 'stylesheet',
        href: policy.href,
      }),
    );
  else
    for (const text of css) {
      const style = node(root.ownerDocument, 'style');
      if (policy.nonce) style.setAttribute('nonce', policy.nonce);
      style.textContent = text;
      root.append(style);
    }
}
export function upgradeProperties(
  host: HTMLElement,
  keys: readonly string[],
): void {
  for (const key of keys)
    if (Object.hasOwn(host, key)) {
      const value = Reflect.get(host, key);
      Reflect.deleteProperty(host, key);
      Reflect.set(host, key, value);
    }
}
export function emit(host: HTMLElement, type: string, detail: object): void {
  const Event = host.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
  host.dispatchEvent(
    new Event(type, {
      detail: Object.freeze(detail),
      bubbles: true,
      composed: true,
    }),
  );
}
export function composedParent(node: Node): Node | null {
  return (
    (node as Element).assignedSlot ??
    node.parentNode ??
    (node as ShadowRoot).host ??
    null
  );
}
export function motionRestricted(host: HTMLElement): boolean {
  return [host, ...ancestors(host)].some((element) =>
    element.matches(
      '[hidden],[data-dotquilt-offscreen],[data-dotquilt-disabled],[data-dotquilt-paused],[motion]:not([motion=system])',
    ),
  );
}
export function ancestors(host: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  let parent = composedParent(host);
  while (parent) {
    if (parent.nodeType === 1) result.push(parent as HTMLElement);
    parent = composedParent(parent);
  }
  return result;
}
export function activeWithin(host: HTMLElement): boolean {
  let active = host.ownerDocument.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return (
    !!active &&
    (active === host || ancestors(active as HTMLElement).includes(host))
  );
}

const mediaQueries = new WeakMap<Window, Map<string, MediaQueryList>>();
/** Whether a media query matches, reusing one MediaQueryList per window and query. */
export function media(win: Window | null | undefined, query: string): boolean {
  if (!win) return false;
  const queries = mediaQueries.get(win) ?? new Map<string, MediaQueryList>();
  mediaQueries.set(win, queries);
  let list = queries.get(query);
  if (!list) {
    list = win.matchMedia(query);
    queries.set(query, list);
  }
  return list.matches;
}
