import {
  dotGrid,
  lineHeight,
  markColor,
  markLineHeights,
  markShapes,
  restOpacity,
  typingGap,
  typingSize,
} from './internal/marks.js';

const staticDots = `${dotGrid()};opacity:${restOpacity}`;
const staticLineDots = `${dotGrid('0 0')};opacity:${restOpacity}`;
export const staticLineStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-line{display:block;width:100%;height:${lineHeight};position:relative;border-radius:999px;overflow:hidden}dotquilt-skeleton-line [data-dotquilt-static]{display:block;position:absolute;inset:0;${staticLineDots}}${markShapes((mark) => `dotquilt-skeleton-line[mark=${mark}]`, '[data-dotquilt-static]', '0 0')}${markLineHeights((mark) => `dotquilt-skeleton-line[mark=${mark}]`)}@media(forced-colors:active){dotquilt-skeleton-line [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);
export const staticCircleStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-circle{display:block;width:2.5rem;aspect-ratio:1;position:relative;border-radius:50%;overflow:hidden}dotquilt-skeleton-circle [data-dotquilt-static]{display:block;position:absolute;inset:0;${staticDots}}${markShapes((mark) => `dotquilt-skeleton-circle[mark=${mark}]`, '[data-dotquilt-static]')}@media(forced-colors:active){dotquilt-skeleton-circle [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);
// While the external stylesheet loads (`:state(unstyled)`), a slot projects the
// fallback and sits between it and the host, so `gap: inherit` would not reach
// the host's gap; the fallback then uses the host's default gap directly.
export const staticTextStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-text{display:grid;position:relative;gap:.5em}dotquilt-skeleton-text [data-dotquilt-static],dotquilt-skeleton-text [data-dotquilt-react-static]{display:grid;gap:inherit}dotquilt-skeleton-text:state(unstyled) [data-dotquilt-static],dotquilt-skeleton-text:state(unstyled) [data-dotquilt-react-static]{gap:.5em}dotquilt-skeleton-text [data-dotquilt-static-line]{display:block;height:${lineHeight};border-radius:999px;${staticLineDots}}${markShapes((mark) => `dotquilt-skeleton-text[mark=${mark}]`, '[data-dotquilt-static-line]', '0 0')}${markLineHeights((mark) => `dotquilt-skeleton-text[mark=${mark}] [data-dotquilt-static-line]`)}@media(forced-colors:active){dotquilt-skeleton-text [data-dotquilt-static-line]{outline:1px dotted CanvasText}}`,
  ]);
export const staticTypingStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-typing-dots{display:inline-flex;align-items:center;height:1em}dotquilt-typing-dots [data-dotquilt-static]{display:inline-flex;align-items:center;gap:${typingGap}}dotquilt-typing-dots .dot{display:block;width:${typingSize};height:${typingSize};border-radius:50%;background:${markColor};opacity:.3}@media(forced-colors:active){dotquilt-typing-dots .dot{background:CanvasText}}`,
  ]);
