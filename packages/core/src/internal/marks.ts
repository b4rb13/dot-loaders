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
