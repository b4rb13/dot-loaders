'use client';
import type { RevealTarget } from '@dotquilt-internal/core';
import { LoadingRegion, TableLoader } from '@dotquilt-internal/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Invoice, invoiceColumns } from './data';

async function fetchInvoices(signal: AbortSignal): Promise<Invoice[]> {
  const response = await fetch('/api/invoices', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function InvoiceTable() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rows, setRows] = useState<readonly RevealTarget[]>([]);
  const body = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const request = new AbortController();
    fetchInvoices(request.signal)
      .then(setInvoices)
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, []);

  // Hand each real row to the region, so rows settle in one after another.
  useLayoutEffect(() => {
    if (!invoices || !body.current) return;
    setRows(
      [...body.current.rows].map((element, i) => ({ id: `row-${i}`, element })),
    );
  }, [invoices]);

  // Ready once the rows are in place, or at once on an error.
  const ready = failed || (invoices !== null && rows.length > 0);

  return (
    <LoadingRegion
      aria-label="Invoices"
      state={ready ? 'ready' : 'pending'}
      timing={failed ? { duration: 0 } : undefined}
      revealTargets={rows}
      placeholder={
        <TableLoader rows={4} rowHeight={40} columns={invoiceColumns} />
      }
    >
      {failed ? (
        <p role="alert">We couldn't load invoices. Try again later.</p>
      ) : (
        <table className="invoices">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody ref={body}>
            {invoices?.map((invoice) => (
              <tr key={invoice.customer}>
                <td>{invoice.customer}</td>
                <td>{invoice.amount}</td>
                <td>{invoice.status}</td>
                <td>{invoice.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </LoadingRegion>
  );
}
