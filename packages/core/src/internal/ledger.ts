/**
 * One budget per document for everything loaders draw: dots, Canvas pixels and
 * Canvas command buffers. Every painter takes a lease and returns it on dispose.
 *
 * The budget lives on the document under a global key so tests and devtools can
 * inspect it.
 */
interface Ledger {
  users: number;
  dots: number;
  pixels?: number;
  bytes?: number;
}
type Kind = 'dots' | 'pixels' | 'bytes';
const key = Symbol.for('dotquilt.v1.dot-ledger');
/** [per surface, per document] */
const limits = {
  dots: [4096, 16384],
  pixels: [1048576, 4194304],
  bytes: [262144, 2097152],
} as const;

function read(doc: Document): Ledger | undefined {
  return (doc as Document & { [key]?: Ledger })[key];
}

/** Dots currently drawn in the document. */
export function documentDots(doc: Document): number {
  return read(doc)?.dots ?? 0;
}

export function lease(doc: Document, report: (code: string) => void) {
  let ledger = read(doc);
  if (!ledger) {
    ledger = { dots: 0, users: 0 };
    (doc as Document & { [key]?: Ledger })[key] = ledger;
  }
  const shared = ledger;
  shared.users++;
  const owned = { dots: 0, pixels: 0, bytes: 0 };
  let closed = false;
  const codes = new Set<string>();
  const issue = (code: string) => {
    if (!codes.has(code)) {
      codes.add(code);
      report(code);
    }
  };
  return {
    issue,
    /** Sets this lease's share of `kind`; false (and a report) past a limit. */
    set(kind: Kind, count: number): boolean {
      if (closed) return false;
      const [surface, document] = limits[kind];
      const total = (shared[kind] ?? 0) - owned[kind] + count;
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > surface ||
        total > document
      ) {
        issue(`${kind}-limit`);
        return false;
      }
      shared[kind] = total;
      owned[kind] = count;
      return true;
    },
    get(kind: Kind) {
      return owned[kind];
    },
    close() {
      if (closed) return;
      closed = true;
      for (const kind of ['dots', 'pixels', 'bytes'] as const)
        if (owned[kind]) shared[kind] = (shared[kind] ?? 0) - owned[kind];
      if (--shared.users === 0)
        delete (doc as Document & { [key]?: Ledger })[key];
    },
  };
}

/** Whether `count` more of `kind` would fit, crediting what a lease already holds. */
export function available(
  doc: Document,
  kind: Kind,
  count: number,
  credit = 0,
): boolean {
  const total = read(doc)?.[kind] ?? 0;
  const [surface, document] = limits[kind];
  return (
    Number.isSafeInteger(count) &&
    Number.isSafeInteger(credit) &&
    count >= 0 &&
    count <= surface &&
    credit >= 0 &&
    credit <= surface &&
    credit <= total &&
    total - credit + count <= document
  );
}
