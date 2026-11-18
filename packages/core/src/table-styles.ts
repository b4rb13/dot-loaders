export const tableStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  ':host{display:grid;position:relative;width:100%;overflow:hidden}:host([hidden]){display:none}:host [data-table-static]{grid-area:1/1;display:block;width:100%;min-width:0;gap:var(--dotquilt-dot-gap,4px);background-size:calc(var(--dotquilt-dot-size,2px) + var(--dotquilt-dot-gap,4px)) calc(var(--dotquilt-dot-size,2px) + var(--dotquilt-dot-gap,4px))}:host > svg[data-dotquilt-painter]{grid-area:1/1;contain:size;position:relative;display:block;width:100%;height:100%;min-width:0;min-height:0;pointer-events:none}:host([data-custom]) [data-table-static]{visibility:hidden}:host [data-dotquilt-react-static]{display:none}@media(forced-colors:active){:host [data-table-static]{visibility:visible;stroke:CanvasText}:host > svg[data-dotquilt-painter]{display:none}}:host canvas[data-dotquilt-bitmap]{display:block;width:100%;height:100%;pointer-events:none}',
]);
export const staticTableStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    ':where(dotquilt-table-loader:not(:defined)){display:block;position:relative;width:100%;overflow:hidden}dotquilt-table-loader:not(:defined)[hidden]{display:none}dotquilt-table-loader:not(:defined) [data-dotquilt-static]{display:block;width:100%}@media(forced-colors:active){dotquilt-table-loader:not(:defined) [data-dotquilt-static]{stroke:CanvasText}}',
  ]);
