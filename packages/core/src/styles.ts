import {
  dotGrid,
  glowColor,
  glowMask,
  markColor,
  markShapes,
  markSize,
  peakOpacity,
  restOpacity,
} from './internal/marks.js';
import { unstyledHold } from './internal/unstyled.js';

export const skeletonStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  `:host{display:block;width:100%;height:1em;position:relative;border-radius:var(--dotquilt-radius,.375rem);overflow:hidden}:host .surface{position:absolute;inset:0;${dotGrid()};opacity:${restOpacity}}:host .pulse{position:absolute;inset:0;--dotquilt-color:${glowColor};opacity:0;mask:${glowMask}}:host .pulse>.surface,:host .lift>.surface{opacity:1}:host .lift{position:absolute;inset:0;--dotquilt-color:${glowColor};opacity:0;mask:radial-gradient(circle 56px at var(--dotquilt-pointer-x,-999px) var(--dotquilt-pointer-y,-999px),#000,#0000);transition:opacity .32s cubic-bezier(.22,1,.36,1)}${markShapes((mark) => `:host([mark=${mark}])`, '.surface')}:host [data-dotquilt-dissolve] circle{r:calc(${markSize}/2)}:host [data-dotquilt-dissolve] pattern>rect{transform-box:fill-box;transform-origin:center}:host(dotquilt-skeleton-text) [data-dotquilt-dissolve] > svg{border-radius:999px}:host([hidden]){display:none}:host > svg{position:absolute;inset:0;width:100%;height:100%;fill:${markColor}}@media(forced-colors:none){:host([data-custom]) .surface{visibility:hidden}}@media(hover:hover) and (pointer:fine){:host([pointer-response=lift][data-pointer]) .lift{opacity:${peakOpacity}}}@media(forced-colors:active){:host .surface{border:1px dotted CanvasText}:host .pulse,:host .lift,:host > svg{display:none}}`,
  unstyledHold,
]);
export { regionCss, regionStyles } from './region-styles.js';

// Static markup never runs idle, pointer or custom-drawing effects.
export const staticSkeletonStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-block{display:block;width:100%;height:1em;position:relative;border-radius:var(--dotquilt-radius,.375rem);overflow:hidden}dotquilt-skeleton-block [data-dotquilt-static]{position:absolute;inset:0;${dotGrid()};opacity:${restOpacity}}@media(forced-colors:active){dotquilt-skeleton-block [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);

// A mark's rules ship only with markup that uses it (renderStatic), so pages
// without squares or dashes don't carry them.
export const staticSkeletonMarkStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    markShapes(
      (mark) => `dotquilt-skeleton-block[mark=${mark}]`,
      '[data-dotquilt-static]',
    ),
  ]);
