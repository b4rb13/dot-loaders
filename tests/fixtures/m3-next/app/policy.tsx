'use client';
import type { StylePolicy } from '@dotquilt-internal/react';
import { createContext, type ReactNode, useContext, useState } from 'react';

const Policy = createContext<StylePolicy | null>(null);
/** Layout lifetime equals document lifetime. A navigation response cannot replace its CSP nonce. */
export function DocumentPolicy({
  value,
  children,
}: {
  value: StylePolicy;
  children: ReactNode;
}) {
  return <Policy value={value}>{children}</Policy>;
}
export function useDocumentPolicy() {
  const policy = useContext(Policy);
  if (!policy) throw new Error('Document policy is required');
  return policy;
}
export function PersistentCounter() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      id="layout-counter"
      onClick={() => setCount(count + 1)}
    >
      Layout count {count}
    </button>
  );
}
