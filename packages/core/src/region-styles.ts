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
export const regionStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  regionCss + threadCss,
]);
