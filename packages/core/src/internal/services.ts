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
    const notify = () => {
      for (const c of clients) {
        c.visible = undefined;
        c.changed();
      }
    };
    const media = win.matchMedia(
      '(prefers-reduced-motion: reduce), (forced-colors: active)',
    );
    const mutation = new win.MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.attributeName !== 'data-presentation' ||
            record.oldValue !==
              (record.target as Element).getAttribute('data-presentation'),
        )
      )
        notify();
    });
    mutation.observe(doc.documentElement, {
      attributes: true,
      attributeOldValue: true,
      subtree: true,
      attributeFilter: [
        'motion',
        'data-dotquilt-paused',
        'data-presentation',
        'hidden',
        'class',
        'style',
        'dir',
      ],
    });
    const resize = new win.ResizeObserver(notify);
    const intersection = new win.IntersectionObserver((entries) => {
      for (const entry of entries)
        entry.target.toggleAttribute(
          'data-dotquilt-offscreen',
          !entry.intersectionRatio,
        );
      notify();
    });
    media.addEventListener('change', notify);
    doc.addEventListener('visibilitychange', notify);
    add = (c) => {
      clients.add(c);
      const watched = new Set<Element>([c.host]);
      resize.observe(c.host);
      intersection.observe(c.host);
      return {
        watch(element) {
          watched.add(element);
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
          for (const element of watched) resize.unobserve(element);
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
