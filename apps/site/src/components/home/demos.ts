// Example data for the home page's family, playground and closing. Every
// value here is illustrative and is captioned as example data where it
// appears.

/** The hero art's box, in its own units (its size at a 1440 px window). */
export const art = { width: 850, height: 450 } as const;

/**
 * The hero line: today's rising trail and chart line as one series, as
 * fractions of the art box (x across, y down).
 */
export const heroLine: readonly (readonly [number, number])[] = [
  [0.08, 0.9],
  [0.16, 0.829],
  [0.24, 0.792],
  [0.31, 0.723],
  [0.37, 0.674],
  [0.43, 0.599],
  [0.51, 0.525],
  [0.56, 0.476],
  [0.63, 0.466],
  [0.7, 0.368],
  [0.8, 0.357],
  [0.955, 0.18],
];

/** The hero's metric cards: what each holds, and an answer per load. */
export const heroMetrics = [
  {
    label: 'Revenue',
    mask: '$00,000',
    values: ['$48,210', '$51,094', '$47,862'],
  },
  { label: 'Customers', mask: '0,000', values: ['1,284', '1,312', '1,297'] },
  { label: 'Refund rate', mask: '0.0%', values: ['0.8%', '0.7%', '0.9%'] },
] as const;

/** Weekly revenue, in thousands: three answers the ChartLoader tile cycles through. */
export const series: readonly (readonly number[])[] = [
  [24, 28, 27, 31, 34, 33, 37, 40, 39, 43, 46, 49],
  [31, 29, 33, 36, 35, 39, 38, 42, 47, 45, 50, 54],
  [18, 22, 26, 25, 29, 34, 32, 36, 41, 40, 44, 47],
];

/** Values the TextLoader tile delivers, one per load. */
export const revenues = ['$48,210', '$51,094', '$47,862', '$52,330'] as const;

/** Each value's place in a `width` × `height` chart, with headroom on top. */
export function chartPoints(
  values: readonly number[],
  width: number,
  height: number,
): { x: number; y: number }[] {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

/** An SVG path through the same points. */
export function chartPath(
  values: readonly number[],
  width: number,
  height: number,
): string {
  return chartPoints(values, width, height)
    .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

export const invoices = [
  { customer: 'Northwind', amount: '$4,200', status: 'Paid' },
  { customer: 'Acme Labs', amount: '$1,870', status: 'Sent' },
  { customer: 'Globex', amount: '$9,640', status: 'Due' },
  { customer: 'Initech', amount: '$3,115', status: 'Paid' },
] as const;

/** New activity the refreshing feed receives, one per refresh. */
export const activity = [
  'Northwind paid $4,200',
  'Acme Labs opened invoice INV-2042',
  'Globex invoice is overdue',
  'Initech paid $3,115',
  'Ana Ribeiro signed the new quote',
  'Tomás Silva paid $2,480',
  'Rui Almeida opened invoice INV-2047',
] as const;

/**
 * Mark colours a visitor can try in the playground (the site playground's
 * set). Each is a value an app would put in its own CSS, so it is data here,
 * not page styling; '' keeps the runtime's default slate and glow.
 */
export const palettes = [
  { name: 'Slate', mark: '', glow: '', swatch: '#6e7889' },
  {
    name: 'Sage',
    mark: 'light-dark(#5f7a6c, #9db8aa)',
    glow: 'light-dark(#3f8a6e, #86c9ad)',
    swatch: '#5f7a6c',
  },
  {
    name: 'Ink',
    mark: 'light-dark(#56607e, #a6afcc)',
    glow: 'light-dark(#4b67b8, #9db3ec)',
    swatch: '#56607e',
  },
  {
    name: 'Clay',
    mark: 'light-dark(#87705f, #c6b1a1)',
    glow: 'light-dark(#b0714b, #e0a582)',
    swatch: '#87705f',
  },
  {
    name: 'Plum',
    mark: 'light-dark(#776479, #bba7bd)',
    glow: 'light-dark(#8e5a95, #c99bd0)',
    swatch: '#776479',
  },
] as const;

/**
 * Each value's place in a `width` × `height` chart that uses its whole
 * height: the lowest value sits `pad` above the bottom, the highest `pad`
 * below the top. The lead tile's line and its loader's targets share it.
 */
export function fitPoints(
  values: readonly number[],
  width: number,
  height: number,
  pad = 0.12,
): { x: number; y: number }[] {
  const low = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - low);
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height * (1 - pad - ((value - low) / span) * (1 - 2 * pad)),
  }));
}
