'use client';
import {
  LoadingRegion,
  SkeletonCircle,
  SkeletonLine,
} from '@dotquilt-internal/react';
import { useEffect, useState } from 'react';

interface Member {
  name: string;
  role: string;
  bio: string;
}

async function fetchMember(id: string, signal: AbortSignal): Promise<Member> {
  const response = await fetch(`/api/members/${id}`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

type Result =
  | { status: 'loading' }
  | { status: 'done'; member: Member }
  | { status: 'failed' };

export function MemberCard({ id }: { id: string }) {
  const [result, setResult] = useState<Result>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    setResult({ status: 'loading' });
    fetchMember(id, request.signal)
      .then((member) => setResult({ status: 'done', member }))
      .catch(() => {
        if (!request.signal.aborted) setResult({ status: 'failed' });
      });
    // A newer id cancels this request, so a stale answer never shows.
    return () => request.abort();
  }, [id]);

  return (
    <LoadingRegion
      aria-label="Team member"
      state={result.status === 'loading' ? 'pending' : 'ready'}
      cycle={id}
      // An error replaces the placeholder at once, without the handoff.
      timing={result.status === 'failed' ? { duration: 0 } : undefined}
      placeholder={
        <div className="member-skeleton">
          <SkeletonCircle />
          <SkeletonLine />
          <SkeletonLine style={{ width: '60%' }} />
        </div>
      }
    >
      {result.status === 'done' && (
        <article className="member">
          <h3>{result.member.name}</h3>
          <p>{result.member.role}</p>
          <p>{result.member.bio}</p>
        </article>
      )}
      {result.status === 'failed' && (
        <p role="alert">We couldn't load this member. Try again later.</p>
      )}
    </LoadingRegion>
  );
}

// Use it like any other component; it loads again whenever `id` changes.
export function Team() {
  return <MemberCard id="ada" />;
}
