'use client';
import { TextLoader } from '@dotquilt/react';
import { useEffect, useState } from 'react';

async function fetchTotal(month: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(`/api/revenue/${month}/total`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const { total } = await response.json();
  return total;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type Result =
  | { status: 'loading' }
  | { status: 'done'; total: number }
  | { status: 'failed' };

export function RevenueTotal({ month }: { month: string }) {
  const [result, setResult] = useState<Result>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    setResult({ status: 'loading' });
    fetchTotal(month, request.signal)
      .then((total) => setResult({ status: 'done', total }))
      .catch(() => {
        if (!request.signal.aborted) setResult({ status: 'failed' });
      });
    return () => request.abort();
  }, [month]);

  return (
    <p className="kpi">
      <TextLoader
        aria-label="Revenue this month"
        // The mask is the shape of the answer: the placeholder shows it in marks.
        mask="$00,000"
        state={result.status === 'loading' ? 'pending' : 'ready'}
        cycle={month}
        timing={result.status === 'failed' ? { duration: 0 } : undefined}
      >
        {result.status === 'done'
          ? money.format(result.total)
          : result.status === 'failed'
            ? 'Unavailable'
            : ''}
      </TextLoader>
    </p>
  );
}

// Loads again whenever `month` changes.
export function Dashboard() {
  return <RevenueTotal month="2026-11" />;
}
