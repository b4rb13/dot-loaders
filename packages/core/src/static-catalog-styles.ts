import { dotGrid, lineHeight, restOpacity } from './internal/marks.js';

const staticDots = `${dotGrid()};opacity:${restOpacity}`;
const staticLineDots = `${dotGrid('0 0')};opacity:${restOpacity}`;
export const staticLineStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-line{display:block;width:100%;height:${lineHeight};position:relative;border-radius:999px;overflow:hidden}dotquilt-skeleton-line [data-dotquilt-static]{display:block;position:absolute;inset:0;${staticLineDots}}@media(forced-colors:active){dotquilt-skeleton-line [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);
export const staticCircleStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-circle{display:block;width:2.5rem;aspect-ratio:1;position:relative;border-radius:50%;overflow:hidden}dotquilt-skeleton-circle [data-dotquilt-static]{display:block;position:absolute;inset:0;${staticDots}}@media(forced-colors:active){dotquilt-skeleton-circle [data-dotquilt-static]{border:1px dotted CanvasText}}`,
  ]);
// While the external stylesheet loads (`:state(unstyled)`), a slot projects the
// fallback and sits between it and the host, so `gap: inherit` would not reach
// the host's gap; the fallback then uses the host's default gap directly.
export const staticTextStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `dotquilt-skeleton-text{display:grid;position:relative;gap:.5em}dotquilt-skeleton-text [data-dotquilt-static],dotquilt-skeleton-text [data-dotquilt-react-static]{display:grid;gap:inherit}dotquilt-skeleton-text:state(unstyled) [data-dotquilt-static],dotquilt-skeleton-text:state(unstyled) [data-dotquilt-react-static]{gap:.5em}dotquilt-skeleton-text [data-dotquilt-static-line]{display:block;height:${lineHeight};border-radius:999px;${staticLineDots}}@media(forced-colors:active){dotquilt-skeleton-text [data-dotquilt-static-line]{outline:1px dotted CanvasText}}`,
  ]);
export const staticTypingStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-typing-dots{display:inline-flex;align-items:center;height:1em}dotquilt-typing-dots [data-dotquilt-static]{display:inline-flex;align-items:center;gap:var(--dotquilt-dot-gap,4px)}dotquilt-typing-dots .dot{display:block;width:var(--dotquilt-dot-size,2px);height:var(--dotquilt-dot-size,2px);border-radius:50%;background:var(--dotquilt-color,currentColor);opacity:.35}@media(forced-colors:active){dotquilt-typing-dots .dot{background:CanvasText}}',
  ]);
