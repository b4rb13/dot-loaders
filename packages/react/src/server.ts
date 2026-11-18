import {
  staticSkeletonStyles,
  staticTextLoaderStyles,
} from '@dotquilt-internal/core/server';
export const reactTextStyles = staticTextLoaderStyles;

/** Static appearance only. These exact strings can be authorized by CSP hashes. */
export const reactSkeletonStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `${staticSkeletonStyles
      .join('\n')
      .replaceAll(
        'dotquilt-skeleton-block',
        'dotquilt-skeleton-block:not(:defined)',
      )}dotquilt-skeleton-block:not(:defined)[hidden]{display:none}`,
  ]);
export const reactRegionStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-region:not(:defined){display:flow-root;position:relative}dotquilt-region:not(:defined)[hidden]{display:none}dotquilt-region:not(:defined)>[data-dotquilt-react-slot]{position:absolute;inset:0;pointer-events:none}dotquilt-region:not(:defined):not([state=pending])>[slot=placeholder],dotquilt-region:not(:defined):not([state=refreshing])>[slot=refresh-indicator]{display:none}dotquilt-region:not(:defined)[state=pending][data-dotquilt-react-empty]::before{content:"";position:absolute;inset:0;min-height:1em;border:1px dotted currentColor}',
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
      .map((text) => text.replaceAll(tag, `${tag}:not(:defined)`))
      .concat(`${tag}:not(:defined)[hidden]{display:none}`),
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
