// Example data for variant A: a small design studio's revenue, invoices,
// inbox and activity. None of it is real.

export type RangeKey = '7d' | '30d' | '90d';
export type Tone = 'good' | 'bad';

export interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly tone: Tone;
}
export interface Invoice {
  readonly id: string;
  readonly customer: string;
  readonly project: string;
  readonly date: string;
  readonly amount: string;
  readonly status: 'Paid' | 'Sent' | 'Open' | 'Overdue' | 'Draft';
}
export interface Range {
  readonly key: RangeKey;
  /** "the last 30 days", for status lines. */
  readonly span: string;
  readonly compare: string;
  readonly chartTitle: string;
  readonly kpis: readonly [Kpi, Kpi, Kpi];
  /** Revenue per day (per week for 90 days), in thousands. */
  readonly series: readonly number[];
  readonly axis: readonly [string, string, string];
  readonly count: number;
  readonly invoices: readonly Invoice[];
}

const daily = [
  0.97, 1.38, 1.14, 1.14, 1.38, 1.1, 1.04, 1.47, 1.5, 1.43, 1.52, 1.52, 1.41,
  1.19, 1.49, 1.66, 1.68, 1.43, 1.73, 1.44, 1.66, 1.86, 1.59, 1.78, 1.98, 1.91,
  1.7, 1.69, 2.08, 2.11,
];

export const ranges: Record<RangeKey, Range> = {
  '7d': {
    key: '7d',
    span: 'the last 7 days',
    compare: 'vs. prior 7 days',
    chartTitle: 'Revenue by day',
    kpis: [
      { label: 'Revenue', value: '$13,250', delta: '+6.4%', tone: 'good' },
      { label: 'Invoices paid', value: '21', delta: '+3', tone: 'good' },
      { label: 'Refund rate', value: '0.6%', delta: '−0.2 pts', tone: 'good' },
    ],
    series: daily.slice(-7),
    axis: ['Nov 14', 'Nov 17', 'Nov 20'],
    count: 26,
    invoices: [
      {
        id: 'INV-2093',
        customer: 'Marta Lopes',
        project: 'Spring catalogue',
        date: 'Nov 19',
        amount: '$2,480.00',
        status: 'Paid',
      },
      {
        id: 'INV-2091',
        customer: 'Ana Ribeiro',
        project: 'Logo refresh',
        date: 'Nov 18',
        amount: '$1,240.00',
        status: 'Sent',
      },
      {
        id: 'INV-2089',
        customer: 'Inês Costa',
        project: 'Phase two layouts',
        date: 'Nov 16',
        amount: '$960.00',
        status: 'Paid',
      },
      {
        id: 'INV-2088',
        customer: 'Rui Almeida',
        project: 'Menu cards',
        date: 'Nov 14',
        amount: '$395.00',
        status: 'Draft',
      },
    ],
  },
  '30d': {
    key: '30d',
    span: 'the last 30 days',
    compare: 'vs. prior 30 days',
    chartTitle: 'Revenue by day',
    kpis: [
      { label: 'Revenue', value: '$45,980', delta: '+8.2%', tone: 'good' },
      { label: 'Invoices paid', value: '88', delta: '+11', tone: 'good' },
      { label: 'Refund rate', value: '0.8%', delta: '−0.1 pts', tone: 'good' },
    ],
    series: daily,
    axis: ['Oct 22', 'Nov 6', 'Nov 20'],
    count: 104,
    invoices: [
      {
        id: 'INV-2071',
        customer: 'João Pereira',
        project: 'Annual report',
        date: 'Oct 30',
        amount: '$4,120.00',
        status: 'Paid',
      },
      {
        id: 'INV-2084',
        customer: 'Clara Mendes',
        project: 'Trade show stand',
        date: 'Nov 9',
        amount: '$3,400.00',
        status: 'Overdue',
      },
      {
        id: 'INV-2093',
        customer: 'Marta Lopes',
        project: 'Spring catalogue',
        date: 'Nov 19',
        amount: '$2,480.00',
        status: 'Paid',
      },
      {
        id: 'INV-2077',
        customer: 'Tomás Silva',
        project: 'Website audit',
        date: 'Nov 3',
        amount: '$2,115.50',
        status: 'Sent',
      },
    ],
  },
  '90d': {
    key: '90d',
    span: 'the last 90 days',
    compare: 'vs. prior 90 days',
    chartTitle: 'Revenue by week',
    kpis: [
      { label: 'Revenue', value: '$123,400', delta: '+14.9%', tone: 'good' },
      { label: 'Invoices paid', value: '247', delta: '+36', tone: 'good' },
      { label: 'Refund rate', value: '0.9%', delta: '+0.1 pts', tone: 'bad' },
    ],
    series: [
      7.2, 7.8, 7.5, 8.4, 8.1, 8.9, 9.6, 9.2, 10.1, 9.8, 10.6, 11.9, 13.3,
    ],
    axis: ['Aug 23', 'Oct 4', 'Nov 15'],
    count: 291,
    invoices: [
      {
        id: 'INV-2014',
        customer: 'Sofia Martins',
        project: 'Brand refresh',
        date: 'Sep 21',
        amount: '$6,250.00',
        status: 'Paid',
      },
      {
        id: 'INV-2042',
        customer: 'Duarte Faria',
        project: 'Packaging',
        date: 'Oct 12',
        amount: '$5,300.00',
        status: 'Overdue',
      },
      {
        id: 'INV-2071',
        customer: 'João Pereira',
        project: 'Annual report',
        date: 'Oct 30',
        amount: '$4,120.00',
        status: 'Paid',
      },
      {
        id: 'INV-2084',
        customer: 'Clara Mendes',
        project: 'Trade show stand',
        date: 'Nov 9',
        amount: '$3,400.00',
        status: 'Overdue',
      },
    ],
  },
};

/** The invoices screen: fourteen invoices to filter and page through. */
export const ledger: readonly Invoice[] = [
  {
    id: 'INV-2093',
    customer: 'Marta Lopes',
    project: 'Spring catalogue',
    date: 'Nov 19',
    amount: '$2,480.00',
    status: 'Paid',
  },
  {
    id: 'INV-2092',
    customer: 'Sofia Martins',
    project: 'Newsletter',
    date: 'Nov 19',
    amount: '$780.00',
    status: 'Open',
  },
  {
    id: 'INV-2091',
    customer: 'Ana Ribeiro',
    project: 'Logo refresh',
    date: 'Nov 18',
    amount: '$1,240.00',
    status: 'Open',
  },
  {
    id: 'INV-2089',
    customer: 'Inês Costa',
    project: 'Phase two layouts',
    date: 'Nov 16',
    amount: '$960.00',
    status: 'Paid',
  },
  {
    id: 'INV-2087',
    customer: 'Duarte Faria',
    project: 'Label design',
    date: 'Nov 13',
    amount: '$1,615.00',
    status: 'Overdue',
  },
  {
    id: 'INV-2084',
    customer: 'Clara Mendes',
    project: 'Trade show stand',
    date: 'Nov 9',
    amount: '$3,400.00',
    status: 'Overdue',
  },
  {
    id: 'INV-2081',
    customer: 'Rui Almeida',
    project: 'Signage',
    date: 'Nov 7',
    amount: '$395.00',
    status: 'Paid',
  },
  {
    id: 'INV-2077',
    customer: 'Tomás Silva',
    project: 'Website audit',
    date: 'Nov 3',
    amount: '$2,115.50',
    status: 'Open',
  },
  {
    id: 'INV-2074',
    customer: 'Beatriz Nunes',
    project: 'Photo retouching',
    date: 'Nov 1',
    amount: '$1,050.00',
    status: 'Paid',
  },
  {
    id: 'INV-2071',
    customer: 'João Pereira',
    project: 'Annual report',
    date: 'Oct 30',
    amount: '$4,120.00',
    status: 'Paid',
  },
  {
    id: 'INV-2066',
    customer: 'Miguel Sousa',
    project: 'Business cards',
    date: 'Oct 26',
    amount: '$640.00',
    status: 'Overdue',
  },
  {
    id: 'INV-2062',
    customer: 'Ana Ribeiro',
    project: 'Logo concepts',
    date: 'Oct 22',
    amount: '$1,980.00',
    status: 'Paid',
  },
  {
    id: 'INV-2058',
    customer: 'Inês Costa',
    project: 'Phase one layouts',
    date: 'Oct 18',
    amount: '$2,760.00',
    status: 'Open',
  },
  {
    id: 'INV-2051',
    customer: 'Marta Lopes',
    project: 'Lookbook',
    date: 'Oct 14',
    amount: '$1,320.00',
    status: 'Paid',
  },
];

export interface Message {
  readonly from: 'them' | 'you';
  readonly text: string;
  readonly time: string;
}

/** The support inbox: the open conversation, as it loads. */
export const thread: readonly Message[] = [
  {
    from: 'them',
    text: 'Hi! The invoice for the second phase says October 29. Could it be due on November 5 instead?',
    time: '10:40',
  },
  {
    from: 'you',
    text: 'Of course. I’ve moved the due date to November 5.',
    time: '10:41',
  },
  {
    from: 'them',
    text: 'Thank you. I’ll pay it this week.',
    time: '10:42',
  },
];

export const conversations = [
  {
    initials: 'IC',
    name: 'Inês Costa',
    preview: 'Thank you. I’ll pay it this week.',
    time: '10:42',
  },
  {
    initials: 'RA',
    name: 'Rui Almeida',
    preview: 'Can we move the review to Friday?',
    time: '09:15',
  },
  {
    initials: 'ML',
    name: 'Marta Lopes',
    preview: 'The final files look great.',
    time: 'Mon',
  },
] as const;

/** Quick replies the visitor can send, and what comes back. */
export const quickReplies = [
  {
    send: 'The updated invoice is attached.',
    reply: 'Got it, the new date shows. Thanks!',
  },
  {
    send: 'Would you like a receipt by email?',
    reply: 'Yes please, to the studio address.',
  },
  {
    send: 'Anything else I can help with?',
    reply: 'That’s all for now. Have a good week!',
  },
] as const;

/** Replies to anything else the visitor writes, in turn. */
export const fallbackReplies = [
  'Thanks, that makes sense.',
  'Perfect. I’ll check with the team and get back to you today.',
  'Great, thank you for the quick reply.',
] as const;

export interface Activity {
  readonly initials: string;
  readonly text: string;
}

export const activity: readonly (Activity & { readonly time: string })[] = [
  { initials: 'AR', text: 'Ana Ribeiro paid INV-2091', time: '2 min ago' },
  { initials: 'CM', text: 'Clara Mendes viewed INV-2084', time: '18 min ago' },
  { initials: 'ML', text: 'INV-2093 was sent to Marta Lopes', time: '1 h ago' },
  {
    initials: 'TS',
    text: 'Tomás Silva commented on “Phase two”',
    time: '3 h ago',
  },
];

/** What a refresh brings in, one or two at a time. */
export const incoming: readonly Activity[] = [
  { initials: 'IC', text: 'Inês Costa paid INV-2089' },
  { initials: 'DF', text: 'Duarte Faria viewed INV-2087' },
  { initials: 'JP', text: 'João Pereira downloaded a receipt' },
  { initials: 'SM', text: 'Sofia Martins accepted the estimate' },
  { initials: 'RA', text: 'Rui Almeida moved the review to Friday' },
  { initials: 'BN', text: 'Beatriz Nunes paid INV-2074' },
];
