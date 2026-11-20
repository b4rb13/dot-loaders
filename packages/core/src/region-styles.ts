import {
  glowColor,
  markColor,
  markGap,
  markSize,
  peakOpacity,
  restOpacity,
} from './internal/marks.js';

import { regionCss } from './region-css.js';

export { regionCss };

// Its own module: LoadingRegion loads these styles without the skeleton
// stylesheets that styles.ts builds when it loads.
/**
 * The refresh cue: a row of whole marks just above the region's top edge
 * (`--dotquilt-refresh-gap` above it), and an accent copy of it (`.glow`)
 * that the glow drifts along. Forced colours draw a dotted line. Kept short:
 * it counts towards the 9 KB gate for a page's external stylesheets.
 */
const threadCss = `.thread{position:absolute;inset:auto 0 calc(100% + var(--dotquilt-refresh-gap,6px));height:var(--s);--s:${markSize};background:radial-gradient(circle closest-side,${markColor} 75%,#0000) 0/calc(var(--s) + ${markGap}) space no-repeat;opacity:${restOpacity}}.glow{--dotquilt-color:${glowColor};opacity:${peakOpacity};mask:linear-gradient(90deg,#0000,#000,#0000) -70%/40% no-repeat}@media(forced-colors:active){.thread{background:none;border-top:1px dotted;opacity:1}.glow{display:none}}`;
/**
 * Once ready or refreshing, the placeholder layer takes no space, so the
 * region is as tall as its content. It keeps its place through the handoff,
 * which reads it and draws from it.
 *
 * Size containment, not `display: none` or a clip: the placeholder stays laid
 * out at its own size and on screen, hidden, so its loaders neither see a
 * zero size nor mark themselves offscreen (which changes their attributes
 * before hydration, and lags when the next loading cycle shows them again).
 * A taller placeholder overflows the region, hidden, ending where the region
 * used to end.
 *
 * While the external stylesheet loads, the layers render as
 * `display: contents`, so the document rule hides the placeholder as the
 * server markup did.
 */
const settledCss =
  ':host([data-presentation=ready]) .p,:host([data-presentation=refreshing]) .p{contain:size}dotquilt-region:state(unstyled)[data-presentation=ready]::part(placeholder),dotquilt-region:state(unstyled)[data-presentation=refreshing]::part(placeholder){display:none}';
export const regionStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  regionCss + settledCss + threadCss,
]);
