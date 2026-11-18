import {
  staticSkeletonStyles,
  staticTextLoaderStyles,
} from '@dotquilt-internal/core/server';
export const reactTextStyles = staticTextLoaderStyles;

/**
 * Static appearance only. These exact strings can be authorized by CSP hashes.
 * They apply before definition and while the host's external stylesheet loads
 * (`:state(unstyled)`); browsers without custom states ignore that part.
 */
export const reactSkeletonStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `${staticSkeletonStyles
      .join('\n')
      .replaceAll(
        'dotquilt-skeleton-block',
        'dotquilt-skeleton-block:is(:not(:defined),:state(unstyled))',
      )}dotquilt-skeleton-block:is(:not(:defined),:state(unstyled))[hidden]{display:none}`,
  ]);
export const reactRegionStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-region:is(:not(:defined),:state(unstyled)){display:flow-root;position:relative}dotquilt-region:is(:not(:defined),:state(unstyled))[hidden]{display:none}dotquilt-region:is(:not(:defined),:state(unstyled))>[data-dotquilt-react-slot]{position:absolute;inset:0;pointer-events:none}dotquilt-region:is(:not(:defined),:state(unstyled)):not([state=pending])>[slot=placeholder],dotquilt-region:is(:not(:defined),:state(unstyled)):not([state=refreshing])>[slot=refresh-indicator]{display:none}dotquilt-region:is(:not(:defined),:state(unstyled))[state=pending][data-dotquilt-react-empty]::before{content:"";position:absolute;inset:0;min-height:1em;border:1px dotted currentColor}',
  ]);

import {
  staticCircleStyles,
  staticLineStyles,
  staticTextStyles,
  staticTypingStyles,
} from '@dotquilt-internal/core/server';

function beforeDefinition(
  css: readonly string[],
  tag: string,
): readonly string[] {
  return Object.freeze(
    css
      .map((text) =>
        text.replaceAll(tag, `${tag}:is(:not(:defined),:state(unstyled))`),
      )
      .concat(
        `${tag}:is(:not(:defined),:state(unstyled))[hidden]{display:none}`,
      ),
  );
}
export const reactLineStyles = /* @__PURE__ */ beforeDefinition(
  staticLineStyles,
  'dotquilt-skeleton-line',
);
export const reactCircleStyles = /* @__PURE__ */ beforeDefinition(
  staticCircleStyles,
  'dotquilt-skeleton-circle',
);
export const reactTextSkeletonStyles = /* @__PURE__ */ beforeDefinition(
  staticTextStyles,
  'dotquilt-skeleton-text',
);
export const reactTypingStyles = /* @__PURE__ */ beforeDefinition(
  // The inert React-owned wrapper must not introduce a second inline baseline.
  /* @__PURE__ */ staticTypingStyles.concat(
    'dotquilt-typing-dots [data-dotquilt-react-static]{display:contents}',
  ),
  'dotquilt-typing-dots',
);

export {
  staticChartStyles as reactChartStyles,
  staticTableStyles as reactTableStyles,
} from '@dotquilt-internal/core/server';

import {
  staticChartMarkStyles,
  staticCircleMarkStyles,
  staticLineMarkStyles,
  staticSkeletonMarkStyles,
  staticTextLoaderMarkStyles,
  staticTextMarkStyles,
  staticTypingMarkStyles,
} from '@dotquilt-internal/core/server';

/**
 * Static rules for squares and dashes. A component adds them only when it
 * draws one, so pages that keep the default dot don't carry them.
 */
function marksBeforeDefinition(
  css: readonly string[],
  tag: string,
): readonly string[] {
  return Object.freeze(
    css.map((text) =>
      text.replaceAll(tag, `${tag}:is(:not(:defined),:state(unstyled))`),
    ),
  );
}
export const reactSkeletonMarkStyles = /* @__PURE__ */ marksBeforeDefinition(
  staticSkeletonMarkStyles,
  'dotquilt-skeleton-block',
);
export const reactLineMarkStyles = /* @__PURE__ */ marksBeforeDefinition(
  staticLineMarkStyles,
  'dotquilt-skeleton-line',
);
export const reactCircleMarkStyles = /* @__PURE__ */ marksBeforeDefinition(
  staticCircleMarkStyles,
  'dotquilt-skeleton-circle',
);
export const reactTextSkeletonMarkStyles =
  /* @__PURE__ */ marksBeforeDefinition(
    staticTextMarkStyles,
    'dotquilt-skeleton-text',
  );
export const reactTypingMarkStyles = /* @__PURE__ */ marksBeforeDefinition(
  staticTypingMarkStyles,
  'dotquilt-typing-dots',
);
// These already apply only before definition.
export const reactChartMarkStyles = staticChartMarkStyles;
export const reactTextMarkStyles = staticTextLoaderMarkStyles;
