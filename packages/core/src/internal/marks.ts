/**
 * Default marks, from design/SPEC.md ("System, refined"). Every stylesheet
 * takes its dot size, spacing, colours and opacity from here, so the static
 * look, the idle motion and the painters agree. Apps override them through the
 * `--dotquilt-*` custom properties.
 *
 * Colours follow the page's `color-scheme` through `light-dark()`. CSS cannot
 * switch a number between themes, so both use one resting opacity: the dark
 * mark is #A3AFC2, which at 37% on the dark surface matches the spec's #8E99AB
 * at 44%.
 */
export const markSize = 'var(--dotquilt-dot-size,4.4px)';
export const markGap = 'var(--dotquilt-dot-gap,4.6px)';
export const markColor = 'var(--dotquilt-color,light-dark(#6e7889,#a3afc2))';
export const glowColor =
  'var(--dotquilt-accent-color,light-dark(#4f8f93,#8dc4c5))';
/** Resting opacity of the marks. */
export const restOpacity = 0.37;
/** Opacity of the glow at its centre. */
export const peakOpacity = 0.9;

/**
 * TypingDots are larger than the field marks so they read as a status, not a
 * speck (the spec's mockup: 8 px dots, 6 px apart).
 */
export const typingSize = 'var(--dotquilt-dot-size,8px)';
export const typingGap = 'var(--dotquilt-dot-gap,6px)';

/** A line placeholder is two rows of marks tall, as in the spec's mockup. */
export const lineHeight = `calc(2*(${markSize} + ${markGap}))`;

/**
 * A grid of round marks painted with CSS, used by static and skeleton surfaces.
 * By default only whole marks are drawn (`space`): blocks and circles of any
 * size spread the leftover evenly instead of clipping half a row at an edge.
 * Lines, exactly two rows tall, pass `0 0` and repeat from the left so their
 * columns line up. The 1 px soft edge keeps small marks round at 1× density.
 */
export function dotGrid(position?: string): string {
  const place = position
    ? `${position}/var(--g) var(--g)`
    : 'center/var(--g) var(--g) space';
  return `--s:${markSize};--g:calc(var(--s) + ${markGap});background:radial-gradient(circle,${markColor} calc(var(--s)/2 - .5px),#0000 calc(var(--s)/2 + .5px)) ${place}`;
}

/**
 * The alternative marks (design/SPEC.md): width, height and the pitch across
 * and down. Squares are crisp at small sizes; dashes suit text lines and rows.
 */
export const shapes = {
  square: { width: 4, height: 4, across: 8.5, down: 8.5, radius: 1.1 },
  dash: { width: 9.4, height: 3.4, across: 13, down: 9.5, radius: 1.7 },
} as const;

/** A length in px, rounded so the CSS stays short. */
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

/**
 * One mask layer: a band between `from` and `to` px, with a 1 px soft edge.
 * Without an angle it runs down the tile.
 */
function band(from: number, to: number, angle = ''): string {
  return `linear-gradient(${angle}#0000 ${px(from - 0.5)},#000 ${px(from + 0.5)},#000 ${px(to - 0.5)},#0000 ${px(to + 0.5)})`;
}

interface Shape {
  readonly width: number;
  readonly height: number;
  readonly across: number;
  readonly down: number;
  readonly radius: number;
}

/**
 * A grid of `shape` marks painted with CSS masks, so it needs no image and
 * passes a strict CSP. A square is a horizontal band intersected with a
 * vertical one; a dash adds two round caps, so its ends are round.
 */
function maskGrid(
  mark: keyof typeof shapes,
  shape: Shape,
  place: { position: string; repeat: string },
  color: string,
): string {
  const { width, height, across, down } = shape;
  const x = (across - width) / 2,
    y = (down - height) / 2;
  const rows = band(y, y + height);
  const layers =
    mark === 'square'
      ? [rows, band(x, x + width, '90deg,')]
      : [
          ...[x + height / 2, x + width - height / 2].map(
            (cx) =>
              `radial-gradient(circle at ${px(cx)} ${px(down / 2)},#000 ${px(height / 2 - 0.5)},#0000 ${px(height / 2 + 0.5)})`,
          ),
          rows,
          band(x + height / 2, x + width - height / 2, '90deg,'),
        ];
  const composite = mark === 'square' ? 'intersect' : 'add,add,intersect';
  const size = `${px(across)} ${px(down)}`;
  // Every layer shares one tile. The fill carries it too, so code that reads
  // the grid from the background (the dissolve, the chart and table fields)
  // finds the same marks.
  return `background:${color} ${place.position}/${size} ${place.repeat};mask:${layers.join(',')};mask-size:${size};mask-position:${place.position};mask-repeat:${place.repeat};mask-composite:${composite}`;
}

/**
 * Squares or dashes for a skeleton or chart surface. `position` works like
 * dotGrid's: `space` (whole marks only) unless a position is given.
 */
export function shapeGrid(
  mark: keyof typeof shapes,
  position?: string,
): string {
  return maskGrid(
    mark,
    shapes[mark],
    position
      ? { position, repeat: 'repeat' }
      : { position: 'center', repeat: 'space' },
    markColor,
  );
}

/**
 * TextLoader's placeholder has 2 px dots at a 6 px pitch; squares and dashes
 * keep that weight. Dashes read as hatching here (design/SPEC.md), but an app
 * that asks for them still gets them.
 */
const textShapes = {
  square: { width: 2, height: 2, across: 6, down: 6, radius: 0.5 },
  dash: { width: 4.2, height: 1.6, across: 6, down: 6, radius: 0.8 },
} as const;

/**
 * Rules that draw TextLoader's placeholder with squares or dashes, in the
 * mark colour: the placeholder's own text is transparent, so `currentColor`
 * would draw nothing.
 */
export function textMarkShapes(
  host: (mark: keyof typeof shapes) => string,
  surface: string,
): string {
  return (['square', 'dash'] as const)
    .map(
      (mark) =>
        `${host(mark)} ${surface}{${maskGrid(mark, textShapes[mark], { position: '0 0', repeat: 'repeat' }, markColor)}}`,
    )
    .join('');
}

/**
 * TypingDots shapes, from the spec's mockup: a square is 90% of the dot size,
 * and a dash is 80% of it tall and 2.7 times as wide as it is tall.
 */
export function typingShapes(
  host: (mark: keyof typeof shapes) => string,
  dot: string,
): string {
  return `${host('square')} ${dot}{width:calc(${typingSize}*.9);height:calc(${typingSize}*.9);border-radius:calc(${typingSize}*.25)}${host('dash')} ${dot}{width:calc(${typingSize}*2.16);height:calc(${typingSize}*.8);border-radius:999px}`;
}

/** Rules that give a painted surface its mark's pitch, for the fields that read it. */
export function markPitches(
  host: (mark: keyof typeof shapes) => string,
  surface: string,
): string {
  return (['square', 'dash'] as const)
    .map(
      (mark) =>
        `${host(mark)} ${surface}{background-size:${shapes[mark].across}px ${shapes[mark].down}px}`,
    )
    .join('');
}

/**
 * A drawn mark: the public `Mark` type. It is spelled out here so build
 * scripts that read these styles from source don't load the element types.
 */
export type Mark = 'dot' | keyof typeof shapes;

/** The host's mark; a missing or unknown value draws dots. */
export function markOf(host: Element): Mark {
  const value = host.getAttribute('mark');
  return value === 'dash' || value === 'square' ? value : 'dot';
}

/** The default dot's radius. Painter commands give a radius; other marks scale from it. */
export const dotRadius = 2.2;

/**
 * The box a painter draws for a command of radius `r`: a circle for a dot,
 * and for squares and dashes the spec's shape scaled by `r` against the
 * default dot, so the default radius draws them at their spec size.
 */
export function markBox(
  mark: Mark,
  r: number,
): { width: number; height: number; radius: number } {
  if (mark === 'dot') return { width: 2 * r, height: 2 * r, radius: r };
  const shape = shapes[mark];
  const scale = r / dotRadius;
  return {
    width: shape.width * scale,
    height: shape.height * scale,
    radius: shape.radius * scale,
  };
}

/** Rules that draw `surface` with squares or dashes when `host(mark)` matches. */
export function markShapes(
  host: (mark: keyof typeof shapes) => string,
  surface: string,
  position?: string,
): string {
  return (['square', 'dash'] as const)
    .map((mark) => `${host(mark)} ${surface}{${shapeGrid(mark, position)}}`)
    .join('');
}

/** Line placeholders are two rows of the host's mark tall. */
export function markLineHeights(
  host: (mark: keyof typeof shapes) => string,
): string {
  return (['square', 'dash'] as const)
    .map((mark) => `${host(mark)}{height:${2 * shapes[mark].down}px}`)
    .join('');
}

/**
 * The idle glow's profile across the field: a Gaussian, exp(-d²) for d in
 * [-3.2, 3.2] standard deviations, in mask alpha. The mask is 128% of the
 * field wide, because one deviation is 20% of the field.
 */
export const glowMask =
  'linear-gradient(104deg,#0000 12.5%,#00000005 18.75%,#0000001b 26.56%,#0000005e 34.38%,#000000c7 42.19%,#000 50%,#000000c7 57.81%,#0000005e 65.63%,#0000001b 73.44%,#00000005 81.25%,#0000 87.5%) 0 0/128% 100% no-repeat';

/** Motion curves from the spec. */
export const curves = {
  /** Content entering and UI transitions: a long tail, no overshoot. */
  settle: 'cubic-bezier(.22,1,.36,1)',
  /** Opacity of revealed content. */
  fade: 'cubic-bezier(.33,0,.2,1)',
  /** Marks, the idle glow and chart glides. */
  sine: 'cubic-bezier(.37,0,.63,1)',
} as const;

/**
 * The handoff (design/SPEC.md): 1.1 s in all. Content fades in over 700 ms
 * while a 2 px blur clears, and rises 5 px over 910 ms. Marks dim, shrink by
 * 30% and drift up 3 px. An explicit `timing.duration` scales every part.
 */
export const handoff = {
  duration: 1100,
  contentFade: 700,
  contentRise: 910,
  risePx: 5,
  blurPx: 2,
  markShrink: 0.3,
  markDriftPx: 3,
} as const;
