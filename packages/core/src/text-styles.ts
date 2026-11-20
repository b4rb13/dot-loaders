import { markColor, textMarkShapes } from './internal/marks.js';
import { regionCss } from './region-css.js';
// The layers share one baseline, so the loader sits on the text's baseline
// even while its content is empty and only the mask has text: an empty first
// layer would otherwise put the baseline at its bottom edge and make the line
// taller.
export const textStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  regionCss +
    ':host{display:inline-grid;vertical-align:baseline;min-height:1em}:host [part]{align-self:baseline}:host .mask{display:block;min-height:1em;white-space:pre;opacity:.3;color:transparent;background:radial-gradient(circle,' +
    markColor +
    ' 1px,#0000 0) 0 0/6px 6px}' +
    textMarkShapes((mark) => `:host([mark=${mark}])`, '.mask') +
    ':host([data-dotquilt-waiting]) .mask,:host([data-dotquilt-waiting])>svg{visibility:hidden}:host ::slotted([slot=placeholder]){display:none}:host([data-custom][data-dotquilt-glyphs]) .mask{visibility:hidden}:host > svg{width:100%;height:100%;overflow:visible}@media(forced-colors:active){:host > svg{display:none}:host .mask{visibility:visible;border:1px dotted CanvasText}}',
]);
// Static rules also apply while the element's external stylesheet loads
// (`:state(unstyled)`); browsers without custom states ignore that part.
export const staticTextLoaderStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-text-loader:is(:not(:defined),:state(unstyled)){display:inline-grid;position:relative;min-height:1em}dotquilt-text-loader:is(:not(:defined),:state(unstyled))[hidden]{display:none}dotquilt-text-loader:is(:not(:defined),:state(unstyled))[state=pending]>:not([slot]){visibility:hidden}dotquilt-text-loader:is(:not(:defined),:state(unstyled))>[slot=placeholder]{grid-area:1/1;white-space:pre;color:transparent;opacity:.3;min-height:1em;background:radial-gradient(circle,' +
      markColor +
      ' 1px,#0000 0) 0 0/6px 6px}dotquilt-text-loader:is(:not(:defined),:state(unstyled)):not([state=pending])>[slot=placeholder]{display:none}dotquilt-text-loader:is(:not(:defined),:state(unstyled))>:not([slot]){grid-area:1/1}@media(forced-colors:active){dotquilt-text-loader:is(:not(:defined),:state(unstyled))>[slot=placeholder]{border:1px dotted CanvasText}}',
  ]);

// A mark's rules ship only with markup that uses it (renderStatic), so pages
// without squares or dashes don't carry them.
export const staticTextLoaderMarkStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    textMarkShapes(
      (mark) =>
        `dotquilt-text-loader:is(:not(:defined),:state(unstyled))[mark=${mark}]`,
      '>[slot=placeholder]',
    ),
  ]);
