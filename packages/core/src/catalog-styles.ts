import { skeletonStyles } from './styles.js';

export const skeletonLineStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ skeletonStyles.concat(
      ':host{height:.875em;border-radius:999px}',
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
      ':host{height:auto;overflow:visible;display:grid;gap:.5em;border-radius:0}:host .lines{display:grid;gap:inherit}:host .lines.pulse{position:absolute;inset:0}:host .line{box-sizing:border-box;height:.875em;position:relative;border-radius:999px;overflow:hidden}',
    ),
  );
export const typingStyles: readonly string[] = /* @__PURE__ */ Object.freeze([
  ':host,dotquilt-typing-dots{display:inline-flex;position:relative;align-items:center;height:1em}:host .dot{display:inline-block;vertical-align:middle;width:var(--dotquilt-dot-size,2px);height:var(--dotquilt-dot-size,2px);border-radius:50%;background:var(--dotquilt-color,currentColor);opacity:.35}:host .dot+.dot{margin-inline-start:var(--dotquilt-dot-gap,4px)}:host([hidden]){display:none}@media(forced-colors:active){:host .dot{background:CanvasText}}',
]);
