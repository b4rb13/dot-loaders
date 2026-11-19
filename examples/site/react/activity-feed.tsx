'use client';
import { LoadingRegion, SkeletonText } from '@dotquilt-internal/react';
import { useCallback, useEffect, useRef, useState } from 'react';

async function fetchActivity(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/activity', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function ActivityFeed() {
  const [items, setItems] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    // Only the latest request may update the feed.
    latest.current?.abort();
    const request = new AbortController();
    latest.current = request;
    return fetchActivity(request.signal).then(
      (next) => {
        if (latest.current === request) setItems(next);
      },
      (error) => {
        // A newer request replaced this one; that is not a failure.
        if (!request.signal.aborted) throw error;
      },
    );
  }, []);

  useEffect(() => {
    load().catch(() => setFailed(true));
    return () => latest.current?.abort();
  }, [load]);

  function refresh() {
    setRefreshing(true);
    // A failed refresh keeps the feed you already have.
    load()
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }

  return (
    <section>
      <button type="button" onClick={refresh} disabled={refreshing}>
        Refresh
      </button>
      <LoadingRegion
        aria-label="Recent activity"
        // Pending hides the content; refreshing keeps it visible and usable.
        state={
          items === null && !failed
            ? 'pending'
            : refreshing
              ? 'refreshing'
              : 'ready'
        }
        timing={failed && items === null ? { duration: 0 } : undefined}
        placeholder={<SkeletonText lines={3} />}
      >
        {failed && items === null ? (
          <p role="alert">We couldn't load activity. Try again later.</p>
        ) : (
          <ul>
            {items?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </LoadingRegion>
    </section>
  );
}
