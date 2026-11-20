import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

/**
 * Social cards: the image a link to a page shows on X, LinkedIn, Facebook,
 * Slack, Discord, Telegram, WhatsApp, iMessage, Mastodon and Bluesky.
 *
 * One 1200×630 PNG per page, rendered at build time in the site's own style
 * (design/SPEC.md, dark theme): the Quilt tile and wordmark, the page's
 * section and title, and a band of marks that takes the shape of a chart
 * line and hands over to it, as the ChartLoader does.
 *
 * Every platform reads the same image, so the layout is centred: X trims
 * 2:1 (15 px top and bottom), and WhatsApp, Telegram and iMessage crop a
 * square from the middle in small previews, which keeps the tile and the
 * middle of the title.
 */

export const card = { width: 1200, height: 630, type: 'image/png' } as const;

/** Bump to make every platform fetch the cards again after a design change. */
const design = 1;

export interface Card {
  title: string;
  /** Small label above the title, such as "Components". */
  section?: string | undefined;
  description?: string | undefined;
  /** Varies the chart line from page to page. */
  seed: string;
}

/** The dark theme's colours (design/tokens.css). */
const colour = {
  bg: '#181d25',
  bgLift: '#1e242e',
  surface: '#1f2530',
  ink: '#e3e7ed',
  muted: '#9ca5b3',
  mark: '#8e99ab',
  glow: '#8dc4c5',
};

const require = createRequire(import.meta.url);
/** A font file from a Fontsource package (their exports hide /files). */
function font(pkg: string, file: string): Buffer {
  return readFileSync(
    join(dirname(require.resolve(`${pkg}/LICENSE`)), 'files', file),
  );
}

let fonts: Parameters<typeof satori>[1]['fonts'] | undefined;
function loadFonts() {
  fonts ??= [
    {
      name: 'Manrope',
      data: font('@fontsource/manrope', 'manrope-latin-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Manrope',
      data: font('@fontsource/manrope', 'manrope-latin-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'DM Mono',
      data: font('@fontsource/dm-mono', 'dm-mono-latin-500-normal.woff'),
      weight: 500,
      style: 'normal',
    },
  ];
  return fonts;
}

/** A short hash for `?v=`, so platforms that cache by URL fetch a new card. */
export function cardVersion(input: Card): string {
  return createHash('sha256')
    .update(JSON.stringify([design, input]))
    .digest('hex')
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Layout (satori takes React-element-like objects)

type Style = Record<string, string | number>;
interface Element {
  type: string;
  props: { style?: Style; children?: Child | Child[] };
}
type Child = Element | string;

const h = (type: string, style: Style, ...children: Child[]): Element => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

/** The Quilt tile in the dark theme: ink tile, surface marks, one lit. */
function tile(size: number): Element {
  const scale = size / 28;
  const mark = (cx: number, cy: number, fill: string) =>
    h('div', {
      position: 'absolute',
      left: (cx - 2.9) * scale,
      top: (cy - 2.9) * scale,
      width: 5.8 * scale,
      height: 5.8 * scale,
      borderRadius: 999,
      background: fill,
    });
  return h(
    'div',
    {
      display: 'flex',
      position: 'relative',
      width: size,
      height: size,
      borderRadius: 7.5 * scale,
      background: colour.ink,
    },
    mark(10, 10, colour.surface),
    mark(18, 10, colour.surface),
    mark(10, 18, colour.surface),
    mark(18, 18, colour.glow),
  );
}

function layout({ title, section, description }: Card): Element {
  // Short titles large; long ones smaller, on up to two lines (then the
  // description keeps to one).
  const size = title.length <= 22 ? 76 : title.length <= 30 ? 66 : 58;
  const long = title.length > 34;
  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: card.width,
      height: card.height,
      paddingTop: 70,
      fontFamily: 'Manrope',
      color: colour.ink,
    },
    h(
      'div',
      { display: 'flex', alignItems: 'center', gap: 16 },
      tile(46),
      h(
        'div',
        { fontSize: 34, fontWeight: 600, letterSpacing: -0.85 },
        'dotquilt',
      ),
    ),
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        width: 1000,
        paddingBottom: 150,
      },
      ...(section
        ? [
            h(
              'div',
              {
                fontFamily: 'DM Mono',
                fontWeight: 500,
                fontSize: 21,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: colour.muted,
                marginBottom: 18,
              },
              section,
            ),
          ]
        : []),
      h(
        'div',
        {
          display: 'block',
          fontSize: size,
          fontWeight: 600,
          letterSpacing: -0.03 * size,
          lineHeight: 1.08,
          textAlign: 'center',
          maxWidth: 980,
          lineClamp: 2,
        },
        title,
      ),
      ...(description
        ? [
            h(
              'div',
              {
                display: 'block',
                fontSize: 26,
                lineHeight: 1.42,
                color: colour.muted,
                textAlign: 'center',
                maxWidth: 860,
                marginTop: 22,
                lineClamp: long ? 1 : 2,
              },
              description,
            ),
          ]
        : []),
    ),
  );
}

// ---------------------------------------------------------------------------
// The band of marks along the bottom (plain SVG, drawn under the layout)

/** A seeded number in [0, 1) from a string. */
function seeded(seed: string, salt: number): number {
  const digest = createHash('sha256').update(`${seed}:${salt}`).digest();
  return digest.readUInt32BE(0) / 2 ** 32;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function band(seed: string): string {
  const pitch = 18;
  const radius = 3.6;
  const top = 456;
  const bottom = 624;
  // A rising line with two soft waves, different on every page.
  const phase = [seeded(seed, 1), seeded(seed, 2)];
  const rise = 0.42 + 0.18 * seeded(seed, 3);
  const value = (t: number) =>
    0.16 +
    rise * t +
    0.12 * Math.sin(2 * Math.PI * (1.1 * t + (phase[0] ?? 0))) +
    0.05 * Math.sin(2 * Math.PI * (2.6 * t + (phase[1] ?? 0)));
  const y = (x: number) =>
    bottom - 22 - value(x / card.width) * (bottom - top - 44);
  // Marks hand over to the line across this stretch.
  const from = 600;
  const to = 800;

  const marks: string[] = [];
  const dot = (x: number, cy: number, fill: string, opacity: number) => {
    if (opacity >= 0.02)
      marks.push(
        `<circle cx="${x.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius}" fill="${fill}" fill-opacity="${opacity.toFixed(3)}"/>`,
      );
  };
  for (let x = pitch / 2 + 3; x < card.width; x += pitch) {
    const line = y(x);
    // Fades in from the left edge, and out where the line takes over.
    const fade = smoothstep(-30, 150, x) * (1 - 0.92 * smoothstep(from, to, x));
    // The field under the line, denser towards the bottom; above it, a hint.
    for (let row = top + pitch / 2; row <= bottom; row += pitch) {
      if (Math.abs(row - line) < pitch * 0.6) continue;
      const depth = (row - line) / (bottom - line);
      const rise = smoothstep(top - 10, top + 70, row);
      dot(
        x,
        row,
        colour.mark,
        (row > line ? 0.2 + 0.18 * depth : 0.06) * fade * rise,
      );
    }
    // The line itself, in marks, until it hands over.
    dot(x, line, colour.glow, 0.95 * fade);
  }

  const points: string[] = [];
  for (let x = from - 40; x <= card.width + 4; x += 6)
    points.push(`${x},${y(x).toFixed(1)}`);
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${card.width + 4},${card.height} L${from - 40},${card.height} Z`;

  return [
    '<defs>',
    `<linearGradient id="dq-in" gradientUnits="userSpaceOnUse" x1="${from}" y1="0" x2="${to}" y2="0"><stop offset="0" stop-color="${colour.glow}" stop-opacity="0"/><stop offset="1" stop-color="${colour.glow}" stop-opacity="1"/></linearGradient>`,
    `<linearGradient id="dq-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colour.glow}" stop-opacity="0.2"/><stop offset="1" stop-color="${colour.glow}" stop-opacity="0"/></linearGradient>`,
    `<mask id="dq-reveal"><rect x="0" y="0" width="${card.width}" height="${card.height}" fill="url(#dq-in)"/></mask>`,
    '</defs>',
    marks.join(''),
    `<path d="${areaPath}" fill="url(#dq-area)" mask="url(#dq-reveal)"/>`,
    `<path d="${linePath}" fill="none" stroke="url(#dq-in)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('');
}

function background(): string {
  return [
    `<defs><radialGradient id="dq-bg" cx="50%" cy="36%" r="62%"><stop offset="0" stop-color="${colour.bgLift}"/><stop offset="1" stop-color="${colour.bg}"/></radialGradient></defs>`,
    `<rect width="${card.width}" height="${card.height}" fill="url(#dq-bg)"/>`,
  ].join('');
}

/** The card as a PNG. */
export async function renderCard(
  input: Card,
): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await satori(layout(input) as never, {
    width: card.width,
    height: card.height,
    fonts: loadFonts(),
  });
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${card.width}" height="${card.height}" viewBox="0 0 ${card.width} ${card.height}">${background()}${band(input.seed)}${inner}</svg>`;
  // A copy in a plain ArrayBuffer, which a Response body accepts.
  return new Uint8Array(
    new Resvg(full, { font: { loadSystemFonts: false } }).render().asPng(),
  );
}
