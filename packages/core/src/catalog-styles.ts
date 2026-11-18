import {
  dotGrid,
  lineHeight,
  markColor,
  markLineHeights,
  markShapes,
  typingGap,
  typingShapes,
  typingSize,
} from './internal/marks.js';
import { unstyledHold } from './internal/unstyled.js';
import { skeletonStyles } from './styles.js';

export const skeletonLineStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ skeletonStyles.concat(
      `:host{height:${lineHeight};border-radius:999px}:host .surface{${dotGrid('0 0')}}${markShapes((mark) => `:host([mark=${mark}])`, '.surface', '0 0')}${markLineHeights((mark) => `:host([mark=${mark}])`)}`,
    ),
  );
export const skeletonCircleStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ skeletonStyles.concat(
      ':host{width:2.5rem;height:auto;aspect-ratio:1;border-radius:50%}',
    ),
  );
export const skeletonTextStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ skeletonStyles.concat(
      `:host{height:auto;overflow:visible;display:grid;gap:.5em;border-radius:0}:host .lines{display:grid;gap:inherit}:host .lines.pulse{position:absolute;inset:0}:host .line{box-sizing:border-box;height:${lineHeight};position:relative;border-radius:999px;overflow:hidden;${dotGrid('0 0')}}${markShapes((mark) => `:host([mark=${mark}])`, '.line', '0 0')}${markLineHeights((mark) => `:host([mark=${mark}]) .line`)}`,
    ),
  );
export const typingStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  `:host,dotquilt-typing-dots{display:inline-flex;position:relative;align-items:center;height:1em}:host .dot{display:inline-block;vertical-align:middle;width:${typingSize};height:${typingSize};border-radius:50%;background:${markColor};opacity:.3}:host .dot+.dot{margin-inline-start:${typingGap}}${typingShapes((mark) => `:host([mark=${mark}])`, '.dot')}:host([hidden]){display:none}@media(forced-colors:active){:host .dot{background:CanvasText}}`,
  unstyledHold,
]);
