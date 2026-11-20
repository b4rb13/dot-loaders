'use client';
import { TextLoader } from '@dotquilt/react';
import { useEffect, useState } from 'react';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function RevenueTotal() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const request = new AbortController();
    fetch('/api/revenue', { signal: request.signal })
      .then((response) => response.json() as Promise<{ total: number }>)
      .then(({ total }) => setTotal(total))
      .catch(() => {});
    return () => request.abort();
  }, []);

  return (
    <p className="kpi">
      <TextLoader
        aria-label="Revenue this month"
        // The mask is the shape of the answer: the placeholder shows it in marks.
        mask="$00,000"
        state={total === null ? 'pending' : 'ready'}
      >
        {total === null ? '' : money.format(total)}
      </TextLoader>
    </p>
  );
}
