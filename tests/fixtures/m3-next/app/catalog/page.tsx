import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogPanel } from '../catalog-panel';
import { Detail } from '../detail';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <CatalogPanel
        key="catalog-home"
        state={
          params.state === 'pending'
            ? 'pending'
            : params.state === 'refreshing'
              ? 'refreshing'
              : 'ready'
        }
      >
        <Suspense
          fallback={<p id="catalog-stream-fallback">Loading server detail</p>}
        >
          <Detail />
        </Suspense>
      </CatalogPanel>
      <Link id="catalog-navigate" href="/catalog/other" prefetch={false}>
        Other catalog
      </Link>
    </>
  );
}
