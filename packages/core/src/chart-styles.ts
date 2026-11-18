import { dotGrid, markGap, markShapes } from './internal/marks.js';
import { unstyledHold } from './internal/unstyled.js';

/**
 * The static field before upgrade: between the idle's faint floor and its
 * shaded area, so upgrading does not flash brighter or darker.
 */
const staticOpacity = 0.15;
export const chartStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  `:host{display:block;position:relative;width:100%;height:12rem;overflow:hidden}:host([hidden]){display:none}:host .surface{position:absolute;inset:0;gap:${markGap};${dotGrid('0 0')};opacity:${staticOpacity}}${markShapes((mark) => `:host([mark=${mark}])`, '.surface', '0 0')}:host > svg{position:relative;display:block;width:100%;height:100%;pointer-events:none}:host([data-custom]) .surface{visibility:hidden}:host [data-dotquilt-react-static]{display:none}@media(forced-colors:active){:host .surface{visibility:visible;border:1px dotted CanvasText}:host > svg{display:none}}:host canvas[data-dotquilt-bitmap]{display:block;width:100%;height:100%;pointer-events:none}`,
  unstyledHold,
]);
// Static rules also apply while the element's external stylesheet loads
// (`:state(unstyled)`); browsers without custom states ignore that part.
export const staticChartStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `:where(dotquilt-chart-loader:is(:not(:defined),:state(unstyled))){display:block;position:relative;width:100%;height:12rem;overflow:hidden}dotquilt-chart-loader:is(:not(:defined),:state(unstyled))[hidden]{display:none}dotquilt-chart-loader:is(:not(:defined),:state(unstyled)) [data-dotquilt-static]{position:absolute;inset:0;gap:${markGap};${dotGrid('0 0')};opacity:${staticOpacity}}@media(forced-colors:active){dotquilt-chart-loader:is(:not(:defined),:state(unstyled)) [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);

// A mark's rules ship only with markup that uses it (renderStatic), so pages
// without squares or dashes don't carry them.
export const staticChartMarkStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    markShapes(
      (mark) =>
        `dotquilt-chart-loader:is(:not(:defined),:state(unstyled))[mark=${mark}]`,
      '[data-dotquilt-static]',
      '0 0',
    ),
  ]);
