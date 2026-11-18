// One document subscription set and an on-demand animation frame loop.
interface Client {
  host: HTMLElement;
  changed(): void;
  visible?: boolean | undefined;
}
interface Subscription {
  eligible(invalidate?: boolean): boolean;
  watch(element: Element): void;
  release(): void;
}
const services = new WeakMap<Document, (client: Client) => Subscription>();
export function subscribe(client: Client): Subscription {
  const doc = client.host.ownerDocument;
  let add = services.get(doc);
  if (!add) {
    const win = doc.defaultView;
    if (!win) return { eligible: () => false, watch() {}, release() {} };
    const clients = new Set<Client>();
    // Elements each client watches for size changes (its host, plus extras).
    const watchers = new Map<Element, Set<Client>>();
    // Clients are notified once per microtask, and only when a change can
    // affect them: their own size or visibility, an attribute on the host or
    // one of its ancestors, or a document-wide motion/visibility change.
    const pending = new Set<Client>();
    const flush = () => {
      for (const c of pending) {
        pending.delete(c);
        if (!clients.has(c)) continue;
        c.visible = undefined;
        c.changed();
      }
    };
    const queue = (c: Client) => {
      if (!pending.size) queueMicrotask(flush);
      pending.add(c);
    };
    const notify = () => {
      for (const c of clients) queue(c);
    };
    const notifyWatchers = (element: Element) => {
      for (const c of watchers.get(element) ?? []) queue(c);
    };
    /** True when `target` is the host or one of its ancestors, across shadow roots. */
    const affects = (targets: Set<Node>, host: Node) => {
      for (let n: Node | null = host; n; ) {
        if (targets.has(n)) return true;
        n = n.parentNode ?? (n as ShadowRoot).host ?? null;
      }
      return false;
    };
    const media = win.matchMedia(
      '(prefers-reduced-motion: reduce), (forced-colors: active)',
    );
    const mutation = new win.MutationObserver((records) => {
      const targets = new Set<Node>();
      for (const record of records)
        if (
          record.attributeName !== 'data-presentation' ||
          record.oldValue !==
            (record.target as Element).getAttribute('data-presentation')
        )
          targets.add(record.target);
      if (!targets.size) return;
      for (const c of clients) if (affects(targets, c.host)) queue(c);
    });
    mutation.observe(doc.documentElement, {
      attributes: true,
      attributeOldValue: true,
      subtree: true,
      attributeFilter: [
        'motion',
        'slot',
        'data-dotquilt-disabled',
        'data-dotquilt-paused',
        'data-presentation',
        'hidden',
        'class',
        'style',
        'dir',
      ],
    });
    const resize = new win.ResizeObserver((entries) => {
      for (const entry of entries) notifyWatchers(entry.target);
    });
    const intersection = new win.IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute(
          'data-dotquilt-offscreen',
          !entry.intersectionRatio,
        );
        notifyWatchers(entry.target);
      }
    });
    media.addEventListener('change', notify);
    doc.addEventListener('visibilitychange', notify);
    const observe = (element: Element, c: Client) => {
      const set = watchers.get(element) ?? new Set<Client>();
      watchers.set(element, set);
      set.add(c);
    };
    add = (c) => {
      clients.add(c);
      const watched = new Set<Element>([c.host]);
      observe(c.host, c);
      resize.observe(c.host);
      intersection.observe(c.host);
      return {
        watch(element) {
          watched.add(element);
          observe(element, c);
          resize.observe(element);
        },
        eligible(invalidate) {
          // Invalidation is write-only: geometry is measured by the queued render.
          if (invalidate) {
            c.visible = undefined;
            return false;
          }
          if (doc.hidden || media.matches) return false;
          if (c.visible === undefined) {
            const { width, height } = c.host.getBoundingClientRect();
            c.visible =
              width > 0 &&
              height > 0 &&
              win.getComputedStyle(c.host).visibility !== 'hidden';
          }
          return c.visible;
        },
        release() {
          clients.delete(c);
          pending.delete(c);
          for (const element of watched) {
            const set = watchers.get(element);
            set?.delete(c);
            if (!set?.size) {
              watchers.delete(element);
              resize.unobserve(element);
            }
          }
          watched.clear();
          intersection.unobserve(c.host);
          if (!clients.size) {
            mutation.disconnect();
            resize.disconnect();
            intersection.disconnect();
            media.removeEventListener('change', notify);
            doc.removeEventListener('visibilitychange', notify);
            services.delete(doc);
          }
        },
      };
    };
    services.set(doc, add);
  }
  return add(client);
}
