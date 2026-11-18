import Link from 'next/link';
import { Suspense } from 'react';
import { Detail } from './detail';
import { Account } from './policy';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === 'nonce' ? 'nonce' : 'external';
  return (
    <main>
      <h1>Next.js loading boundary</h1>
      <p>
        Suspense streams server detail. The application separately owns loading
        and readiness.
      </p>
      <Account initialState={params.state === 'pending' ? 'pending' : 'ready'}>
        <Suspense fallback={<p>Waiting for server detail</p>}>
          <Detail />
        </Suspense>
      </Account>
      <Link id="navigate" href={`/other?mode=${mode}`} prefetch={false}>
        Open another account
      </Link>
      <a id="recovery" href={`/?mode=${mode}`}>
        Open the available server content
      </a>
      <noscript>
        <p>
          Loading controls require JavaScript. The server content link works
          without it.
        </p>
      </noscript>
    </main>
  );
}
