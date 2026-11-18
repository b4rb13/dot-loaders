import Link from 'next/link';
import { Suspense } from 'react';
import { Detail } from './detail';
import { Panel } from './panel';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <Panel
        key="home"
        name="Home account"
        initialState={params.state === 'pending' ? 'pending' : 'ready'}
      >
        <Suspense fallback={<p id="stream-fallback">Waiting for detail</p>}>
          <Detail />
        </Suspense>
      </Panel>
      <Link id="navigate" href="/other" prefetch={false}>
        Other account
      </Link>
    </>
  );
}
