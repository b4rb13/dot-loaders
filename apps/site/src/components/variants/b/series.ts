/**
 * Example data for variant B's first screen: three monthly series the
 * visitor can switch between, and the geometry shared by the server markup,
 * the real line and the ChartLoader's target provider, so the marks land
 * exactly where the line draws.
 */

export interface Series {
  readonly id: 'revenue' | 'signups' | 'latency';
  readonly name: string;
  /** A value as people read it, for labels and screen readers. */
  readonly unit: (value: number) => string;
  readonly values: readonly number[];
  /** The value range the line is drawn against. */
  readonly min: number;
  readonly max: number;
  /** Arrow-key step; Page Up and Page Down move five of them. */
  readonly step: number;
}

export const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
] as const;

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
] as const;

export const series: readonly Series[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    unit: (value) => `$${Math.round(value)}k`,
    values: [21, 27, 25, 34, 39, 37, 48, 56],
    min: 12,
    max: 60,
    step: 1,
  },
  {
    id: 'signups',
    name: 'Signups',
    unit: (value) => Math.round(value).toLocaleString('en-US'),
    values: [420, 610, 380, 720, 560, 980, 860, 1120],
    min: 240,
    max: 1200,
    step: 20,
  },
  {
    id: 'latency',
    name: 'Latency',
    unit: (value) => `${Math.round(value)} ms`,
    values: [262, 248, 271, 214, 196, 205, 168, 142],
    min: 120,
    max: 290,
    step: 2,
  },
];

/**
 * Where the line sits inside the field, as shares of its box. As in the
 * site's field image, it starts partway across: a short trail of marks runs
 * up into its first point from the field's dissolving lower left.
 */
export const frame = { left: 0.17, right: 0.94, top: 0.12, bottom: 0.8 };

/** Where the trail into the line starts, across, and how far below the first point. */
const trailStart = { x: 0.015, drop: 0.15 };

type Point = { x: number; y: number };

/** A value's place across (x) and down (y), each from 0 to 1. */
export function normalized(
  values: readonly number[],
  { min, max }: Pick<Series, 'min' | 'max'>,
): { x: number; y: number }[] {
  const span = Math.max(1, max - min);
  return values.map((value, i) => ({
    x:
      frame.left +
      (i / Math.max(1, values.length - 1)) * (frame.right - frame.left),
    y:
      frame.bottom -
      ((Math.min(max, Math.max(min, value)) - min) / span) *
        (frame.bottom - frame.top),
  }));
}

/** The value at a share of the field's height, the inverse of `normalized`. */
export function valueAt(
  share: number,
  { min, max }: Pick<Series, 'min' | 'max'>,
): number {
  const t = (frame.bottom - share) / (frame.bottom - frame.top);
  return Math.min(max, Math.max(min, min + t * (max - min)));
}

/** An SVG path through the points, in a 1000 × 1000 box stretched to fit. */
export function pathOf(points: readonly { x: number; y: number }[]): string {
  return points
    .map(
      ({ x, y }, i) =>
        `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(y * 1000).toFixed(1)}`,
    )
    .join(' ');
}

/**
 * The trail of marks into the line's first point: rising from the lower
 * left, the marks closing up and strengthening as they near the line, like
 * the field's marks on their way to it. Each has a place and an opacity.
 */
export function trailOf(first: Point, count = 9): (Point & { o: number })[] {
  const start = {
    x: trailStart.x,
    y: Math.min(0.97, first.y + trailStart.drop),
  };
  return Array.from({ length: count }, (_, k) => {
    // Spacing tightens towards the line; a slight sag keeps it a curve. The
    // last mark stops short of the junction, so the two never touch.
    const t = 0.88 * (1 - ((count - k) / (count + 0.6)) ** 1.25);
    return {
      x: start.x + (first.x - start.x) * t,
      y: start.y + (first.y - start.y) * t + 0.035 * Math.sin(Math.PI * t),
      o: 0.28 + 0.67 * t,
    };
  });
}

/**
 * The whole path the field's marks glide onto, trail and line, sampled at
 * even steps across so every column of the field has a place on it.
 */
export function glidePath(points: readonly Point[], samples = 48): Point[] {
  const first = points[0];
  if (!first) return [];
  const path = [...trailOf(first), ...points];
  const from = path[0]?.x ?? 0;
  const to = path.at(-1)?.x ?? 1;
  const out: Point[] = [];
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const x = from + ((to - from) * i) / (samples - 1);
    while (j < path.length - 2 && (path[j + 1]?.x ?? 1) < x) j++;
    const a = path[j] as Point;
    const b = (path[j + 1] ?? a) as Point;
    const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
    out.push({ x, y: a.y + (b.y - a.y) * Math.min(1, Math.max(0, t)) });
  }
  return out;
}

/** A sentence describing a series, for the chart's accessible name. */
export function describe(item: Series, values: readonly number[]): string {
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? 0;
  const trend = last > first ? 'rising' : last < first ? 'falling' : 'level';
  return `${item.name} by month, January to August, ${trend} from ${item.unit(first)} to ${item.unit(last)}. Example data.`;
}
