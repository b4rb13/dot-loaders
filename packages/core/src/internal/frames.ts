// Loaded only by custom definitions. The engine owns all clients and their cancellation.
interface Frames {
  add(callback: () => void): () => void;
}
const key = Symbol.for('dotquilt.frames.v1');
export function frames(host: HTMLElement, callback: () => void): () => void {
  const doc = host.ownerDocument,
    win = doc.defaultView;
  if (!win) return () => {};
  let service = Reflect.get(doc, key) as Frames | undefined;
  if (!service) {
    const clients = new Set<() => void>();
    let raf = 0;
    let snapshot: readonly (() => void)[] | undefined;
    const tick = () => {
      raf = 0;
      // Membership changes invalidate the next tick, not the snapshot in progress.
      snapshot ??= [...clients];
      for (const fn of snapshot) if (clients.has(fn)) fn();
      if (clients.size && !raf) raf = win.requestAnimationFrame(tick);
    };
    service = {
      add(fn) {
        clients.add(fn);
        snapshot = undefined;
        if (!raf) raf = win.requestAnimationFrame(tick);
        return () => {
          clients.delete(fn);
          snapshot = undefined;
          if (!clients.size) {
            win.cancelAnimationFrame(raf);
            raf = 0;
            Reflect.deleteProperty(doc, key);
          }
        };
      },
    };
    Reflect.set(doc, key, service);
  }
  return service.add(callback);
}
