// Same ledger as the lightweight SVG authoring path; compatible copies share admission.
interface Ledger {
  dots: number;
  users: number;
  pixels?: number;
  bytes?: number;
}
const key = Symbol.for('dotquilt.v1.dot-ledger');
const limits = {
  dots: [4096, 16384],
  pixels: [1048576, 4194304],
  bytes: [262144, 2097152],
} as const;
export function lease(doc: Document, report: (code: string) => void) {
  const ledger: Ledger = Reflect.get(doc, key) ?? {
    dots: 0,
    users: 0,
    pixels: 0,
    bytes: 0,
  };
  ledger.pixels ??= 0;
  ledger.bytes ??= 0;
  Reflect.set(doc, key, ledger);
  ledger.users++;
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
    set(kind: keyof typeof owned, count: number): boolean {
      if (closed) return false;
      const [surface, document] = limits[kind];
      const total = (ledger[kind] ?? 0) - owned[kind] + count;
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > surface ||
        total > document
      ) {
        issue(`${kind}-limit`);
        return false;
      }
      ledger[kind] = total;
      owned[kind] = count;
      return true;
    },
    get(kind: keyof typeof owned) {
      return owned[kind];
    },
    close() {
      if (closed) return;
      for (const kind of ['dots', 'pixels', 'bytes'] as const)
        ledger[kind] = (ledger[kind] ?? 0) - owned[kind];
      if (--ledger.users === 0) Reflect.deleteProperty(doc, key);
      closed = true;
    },
  };
}

// Choosing another renderer is not a rejected command; actual leases still validate and report.
export function available(
  doc: Document,
  kind: keyof typeof limits,
  count: number,
  credit = 0,
): boolean {
  const ledger = Reflect.get(doc, key) as Ledger | undefined;
  const [surface, document] = limits[kind];
  return (
    Number.isSafeInteger(count) &&
    Number.isSafeInteger(credit) &&
    count >= 0 &&
    count <= surface &&
    credit >= 0 &&
    credit <= surface &&
    credit <= (ledger?.[kind] ?? 0) &&
    (ledger?.[kind] ?? 0) - credit + count <= document
  );
}
