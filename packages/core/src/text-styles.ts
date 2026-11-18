import { regionCss } from './styles.js';
export const textStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  regionCss +
    ':host{display:inline-grid;vertical-align:baseline;min-height:1em}:host .mask{display:block;min-height:1em;white-space:pre;opacity:.3;color:transparent;background:radial-gradient(circle,var(--dotquilt-color,currentColor) 1px,#0000 0) 0 0/6px 6px}:host ::slotted([slot=placeholder]){display:none}:host([data-custom][data-dotquilt-glyphs]) .mask{visibility:hidden}:host > svg{width:100%;height:100%;overflow:visible}@media(forced-colors:active){:host > svg{display:none}:host .mask{visibility:visible;border:1px dotted CanvasText}}',
]);
export const staticTextLoaderStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-text-loader:not(:defined){display:inline-grid;position:relative;min-height:1em}dotquilt-text-loader:not(:defined)[hidden]{display:none}dotquilt-text-loader:not(:defined)[state=pending]>:not([slot]){visibility:hidden}dotquilt-text-loader:not(:defined)>[slot=placeholder]{grid-area:1/1;white-space:pre;color:transparent;opacity:.3;min-height:1em;background:radial-gradient(circle,var(--dotquilt-color,currentColor) 1px,#0000 0) 0 0/6px 6px}dotquilt-text-loader:not(:defined):not([state=pending])>[slot=placeholder]{display:none}dotquilt-text-loader:not(:defined)>:not([slot]){grid-area:1/1}@media(forced-colors:active){dotquilt-text-loader:not(:defined)>[slot=placeholder]{border:1px dotted CanvasText}}',
  ]);
