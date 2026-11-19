// Example data for the homepage dashboard: a small design studio's month.

export const kpis = [
  {
    label: 'Revenue',
    value: '$48,210',
    mask: '$00,000',
    delta: '+8.2%',
    trend: 'up',
    at: 900,
  },
  {
    label: 'Active customers',
    value: '1,284',
    mask: '0,000',
    delta: '+3.1%',
    trend: 'up',
    at: 1300,
  },
  {
    label: 'Refund rate',
    value: '0.8%',
    mask: '0.0%',
    delta: '−0.2 pts',
    trend: 'down',
    at: 1700,
  },
] as const;

/** Weekly revenue, in thousands, for the last twelve weeks. */
export const weekly: readonly number[] = [
  24, 28, 27, 31, 34, 33, 37, 40, 39, 43, 46, 49,
];

export const customers = [
  { initials: 'AR', name: 'Ana Ribeiro', amount: '$6,420' },
  { initials: 'TS', name: 'Tomás Silva', amount: '$5,980' },
  { initials: 'IC', name: 'Inês Costa', amount: '$4,310' },
  { initials: 'RA', name: 'Rui Almeida', amount: '$3,775' },
] as const;

export const invoices = [
  {
    id: 'INV-2041',
    customer: 'Ana Ribeiro',
    due: 'Oct 24',
    amount: '$1,240.00',
    status: 'Paid',
  },
  {
    id: 'INV-2042',
    customer: 'Tomás Silva',
    due: 'Oct 26',
    amount: '$860.00',
    status: 'Sent',
  },
  {
    id: 'INV-2043',
    customer: 'Inês Costa',
    due: 'Oct 29',
    amount: '$2,115.50',
    status: 'Overdue',
  },
  {
    id: 'INV-2044',
    customer: 'Rui Almeida',
    due: 'Nov 2',
    amount: '$395.00',
    status: 'Draft',
  },
] as const;

/** When each card's data arrives, in ms after a load starts. */
export const arrivals = { customers: 2100, chart: 2500, invoices: 2900 };
