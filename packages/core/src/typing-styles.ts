import {
  markColor,
  typingGap,
  typingShapes,
  typingSize,
} from './internal/marks.js';
import { unstyledHold } from './internal/unstyled.js';

// Its own module, so TypingDots loads none of the skeleton stylesheets.
export const typingStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  `:host,dotquilt-typing-dots{display:inline-flex;position:relative;align-items:center;height:1em}:host .dot{display:inline-block;vertical-align:middle;width:${typingSize};height:${typingSize};border-radius:50%;background:${markColor};opacity:.3}:host .dot+.dot{margin-inline-start:${typingGap}}${typingShapes((mark) => `:host([mark=${mark}])`, '.dot')}:host([hidden]){display:none}@media(forced-colors:active){:host .dot{background:CanvasText}}`,
  unstyledHold,
]);
