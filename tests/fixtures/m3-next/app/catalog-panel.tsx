'use client';
import type { LoadingState } from '@dotquilt-internal/react';
import type { ReactNode } from 'react';
import { Catalog } from './catalog';
import { useDocumentPolicy } from './policy';
export function CatalogPanel({
  state,
  children,
}: {
  state: LoadingState;
  children: ReactNode;
}) {
  return (
    <Catalog
      initialState={state}
      policy={useDocumentPolicy()}
      cssPrefix="/dotquilt"
      extra={children}
    />
  );
}
