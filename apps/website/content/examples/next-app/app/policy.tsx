'use client';
import type { StylePolicy } from '@dotquilt-internal/react/region';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { Example } from './example';

const Context = createContext<StylePolicy | null>(null);
export function DocumentPolicy({
  value,
  children,
}: {
  value: StylePolicy;
  children: ReactNode;
}) {
  // Client navigation receives another response, but this document keeps its CSP.
  const [policy] = useState(value);
  return <Context value={policy}>{children}</Context>;
}
export function Account({
  initialState,
  children,
}: {
  initialState: 'ready' | 'pending';
  children: ReactNode;
}) {
  const policy = useContext(Context);
  if (!policy) throw new Error('Missing document style policy');
  return (
    <Example initialState={initialState} policy={policy}>
      {children}
    </Example>
  );
}
