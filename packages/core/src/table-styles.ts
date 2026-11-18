import { markColor, markGap, markSize, restOpacity } from './internal/marks.js';
import { unstyledHold } from './internal/unstyled.js';
export const tableStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  `:host{display:grid;position:relative;width:100%;overflow:hidden}:host([hidden]){display:none}:host [data-table-static]{grid-area:1/1;display:block;width:100%;min-width:0;gap:${markGap};background-size:calc(${markSize} + ${markGap}) calc(${markSize} + ${markGap});stroke:${markColor};opacity:${restOpacity}}:host .f{display:grid;min-width:0;min-height:100%}:host .f > svg[data-dotquilt-painter]{grid-area:1/1;contain:size;display:block;width:100%;height:100%;pointer-events:none}:host([data-custom]) [data-table-static]{visibility:hidden}:host [data-dotquilt-react-static]{display:none}@media(forced-colors:active){:host [data-table-static]{visibility:visible;stroke:CanvasText}:host svg[data-dotquilt-painter]{display:none}}:host canvas[data-dotquilt-bitmap]{display:block;width:100%;height:100%;pointer-events:none}`,
  unstyledHold,
]);
// Static rules also apply while the element's external stylesheet loads
// (`:state(unstyled)`); browsers without custom states ignore that part.
export const staticTableStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `:where(dotquilt-table-loader:is(:not(:defined),:state(unstyled))){display:block;position:relative;width:100%;overflow:hidden}dotquilt-table-loader:is(:not(:defined),:state(unstyled))[hidden]{display:none}dotquilt-table-loader:is(:not(:defined),:state(unstyled)) [data-dotquilt-static]{display:block;width:100%;stroke:${markColor};opacity:${restOpacity}}@media(forced-colors:active){dotquilt-table-loader:is(:not(:defined),:state(unstyled)) [data-dotquilt-static]{stroke:CanvasText}}`,
  ]);
