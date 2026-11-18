interface View {
  width: number;
  height: number;
  outerWidth: number;
  outerHeight: number;
  x: number;
  y: number;
  base: string;
  accent: string;
  dpr: number;
}
interface ViewService {
  add(host: HTMLElement): { read(): View; release(): void };
}
const key = Symbol.for('dotquilt.view.v1');
const refresh = Symbol.for('dotquilt.style-refresh.v1');
export function observeView(host: HTMLElement) {
  const doc = host.ownerDocument;
  let service = Reflect.get(doc, key) as ViewService | undefined;
  if (!service) {
    const win = doc.defaultView;
    if (!win) throw new TypeError('Detached document');
    const entries = new Map<
      HTMLElement,
      {
        dirty: boolean;
        refs: number;
        value?: View;
        prior: unknown;
        hook: () => void;
      }
    >();
    const invalidate = () => {
      for (const [host, entry] of entries) {
        entry.dirty = true;
        (host as HTMLElement & { refresh?: () => void }).refresh?.();
      }
    };
    const resize = new win.ResizeObserver(invalidate);
    const mutation = new win.MutationObserver(invalidate);
    mutation.observe(doc.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'dir'],
    });
    const forced = win.matchMedia('(forced-colors: active)'),
      dark = win.matchMedia('(prefers-color-scheme: dark)');
    forced.addEventListener('change', invalidate);
    dark.addEventListener('change', invalidate);
    win.addEventListener('resize', invalidate);
    doc.addEventListener('load', invalidate, true);
    service = {
      add(element) {
        let entry = entries.get(element);
        if (!entry) {
          entry = {
            dirty: true,
            refs: 0,
            prior: Reflect.get(element, refresh),
            hook: () => {
              const value = entries.get(element);
              if (value) value.dirty = true;
            },
          };
          Reflect.set(element, refresh, entry.hook);
          entries.set(element, entry);
          resize.observe(element);
        }
        entry.refs++;
        const current = entry;
        let released = false;
        return {
          read() {
            if (current.dirty || !current.value) {
              const css = win.getComputedStyle(element);
              const px = (v: string) => Number.parseFloat(v) || 0;
              const x = px(css.paddingLeft),
                y = px(css.paddingTop);
              current.value = {
                outerWidth: element.clientWidth,
                outerHeight: element.clientHeight,
                width: Math.max(
                  0,
                  element.clientWidth - x - px(css.paddingRight),
                ),
                height: Math.max(
                  0,
                  element.clientHeight - y - px(css.paddingBottom),
                ),
                x,
                y,
                base:
                  css.getPropertyValue('--dotquilt-color').trim() || css.color,
                accent:
                  css.getPropertyValue('--dotquilt-accent-color').trim() ||
                  css.color,
                dpr: Math.min(2, win.devicePixelRatio || 1),
              };
              current.dirty = false;
            }
            return current.value;
          },
          release() {
            if (released) return;
            released = true;
            if (--current.refs === 0) {
              if (Reflect.get(element, refresh) === current.hook) {
                if (current.prior) Reflect.set(element, refresh, current.prior);
                else Reflect.deleteProperty(element, refresh);
              }
              entries.delete(element);
              resize.unobserve(element);
            }
            if (!entries.size) {
              resize.disconnect();
              mutation.disconnect();
              forced.removeEventListener('change', invalidate);
              dark.removeEventListener('change', invalidate);
              win.removeEventListener('resize', invalidate);
              doc.removeEventListener('load', invalidate, true);
              Reflect.deleteProperty(doc, key);
            }
          },
        };
      },
    };
    Reflect.set(doc, key, service);
  }
  return service.add(host);
}
