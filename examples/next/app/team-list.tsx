'use client';
import { LoadingRegion, SkeletonCircle, SkeletonLine } from '@dotquilt/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Member {
  name: string;
  role: string;
}

type Result =
  | { status: 'loading' }
  | { status: 'done'; members: Member[] }
  | { status: 'failed' };

export function TeamList() {
  const [result, setResult] = useState<Result>({ status: 'loading' });
  const [cycle, setCycle] = useState(0);
  const latest = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    // Only the latest request may update the list.
    latest.current?.abort();
    const request = new AbortController();
    latest.current = request;
    setResult({ status: 'loading' });
    fetch('/api/team', { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<Member[]>;
      })
      .then((members) => setResult({ status: 'done', members }))
      .catch(() => {
        if (!request.signal.aborted) setResult({ status: 'failed' });
      });
  }, []);

  useEffect(() => {
    load();
    return () => latest.current?.abort();
  }, [load]);

  return (
    <section>
      <h2>Members</h2>
      <button
        type="button"
        onClick={() => {
          setCycle((n) => n + 1);
          load();
        }}
      >
        Reload
      </button>
      <LoadingRegion
        aria-label="Team members"
        state={result.status === 'loading' ? 'pending' : 'ready'}
        cycle={String(cycle)}
        // An error replaces the placeholder at once, without the handoff.
        timing={result.status === 'failed' ? { duration: 0 } : undefined}
        placeholder={[0, 1, 2].map((row) => (
          <div className="member-skeleton" key={row}>
            <SkeletonCircle />
            <SkeletonLine style={{ width: '45%' }} />
            <SkeletonLine style={{ width: '30%' }} />
          </div>
        ))}
      >
        {result.status === 'done' &&
          result.members.map((member) => (
            <div className="member" key={member.name}>
              <span className="avatar" />
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        {result.status === 'failed' && (
          <p role="alert">We couldn't load the team. Try again later.</p>
        )}
      </LoadingRegion>
    </section>
  );
}
