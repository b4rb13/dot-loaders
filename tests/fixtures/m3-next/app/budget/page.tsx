import { LoadingRegion, SkeletonBlock } from '@dotquilt-internal/react';
import { headers } from 'next/headers';
export default async function Budget({
  searchParams,
}: {
  searchParams: Promise<{ plain?: string }>;
}) {
  const request = await headers(),
    plain = (await searchParams).plain === '1';
  const policy = (family: string) =>
    request.get('x-style-mode') === 'external'
      ? { mode: 'external' as const, href: `/dotquilt/${family}.css` }
      : { mode: 'inline' as const, nonce: request.get('x-nonce') ?? '' };
  return (
    <main>
      <h1>Account cohort</h1>
      {['one', 'two', 'three', 'four', 'five', 'six'].map((id) => (
        <section key={id}>
          {plain ? (
            <p>Account {id} outcome</p>
          ) : (
            <LoadingRegion
              state="pending"
              cycle={id}
              stylePolicy={policy('region')}
              placeholder={['north', 'east', 'south', 'west'].map((slot) => (
                <SkeletonBlock key={slot} stylePolicy={policy('skeleton')} />
              ))}
            >
              <p>Account {id} outcome</p>
            </LoadingRegion>
          )}
        </section>
      ))}
    </main>
  );
}
