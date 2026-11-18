'use client';
import type { LoadingRegionProps } from '@dotquilt-internal/react';
import { LoadingRegion, SkeletonText } from '@dotquilt-internal/react';

/** One committed snapshot contains the app-owned state, outcome and settlement timing. */
export function Summary({
  state,
  cycle,
  children,
  immediate = false,
  onHandoffEnd,
}: Pick<LoadingRegionProps, 'state' | 'cycle' | 'children' | 'onHandoffEnd'> & {
  immediate?: boolean;
}) {
  return (
    <LoadingRegion
      className="summary"
      state={state}
      cycle={cycle}
      timing={immediate ? { duration: 0 } : undefined}
      stylePolicy={{ mode: 'external', href: '/styles/region.css' }}
      placeholder={
        <SkeletonText
          stylePolicy={{ mode: 'external', href: '/styles/skeleton-text.css' }}
          lines={3}
        />
      }
      refreshIndicator={<span>Updating</span>}
      onHandoffEnd={onHandoffEnd}
    >
      {children}
    </LoadingRegion>
  );
}
