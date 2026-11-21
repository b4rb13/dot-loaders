import { staticSkeletonStyles, staticTextLoaderStyles } from 'dotquilt/server';

/**
 * The element while it's undefined or waiting for its stylesheet, at zero
 * specificity: the page's own classes win over these rules, as they do over
 * the element's shadow styles once it's defined.
 */
const beforeUpgrade = (tag: string) =>
  `:where(${tag}:is(:not(:defined),:state(unstyled)))`;

/** Lowers the element selectors in TextLoader rules, which core already scopes. */
function textLoaderLowered(css: readonly string[]): readonly string[] {
  return Object.freeze(
    css.map((text) =>
      text.replaceAll(
        'dotquilt-text-loader:is(:not(:defined),:state(unstyled))',
        beforeUpgrade('dotquilt-text-loader'),
      ),
    ),
  );
}
export const reactTextStyles = /* @__PURE__ */ textLoaderLowered(
  staticTextLoaderStyles,
);

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
        beforeUpgrade('dotquilt-skeleton-block'),
      )}${beforeUpgrade('dotquilt-skeleton-block')}[hidden]{display:none}`,
  ]);
export { reactRegionStyles } from './region-styles.js';

import {
  staticCircleStyles,
  staticLineStyles,
  staticTextStyles,
  staticTypingStyles,
} from 'dotquilt/server';

function beforeDefinition(
  css: readonly string[],
  tag: string,
): readonly string[] {
  return Object.freeze(
    css
      .map((text) => text.replaceAll(tag, beforeUpgrade(tag)))
      .concat(`${beforeUpgrade(tag)}[hidden]{display:none}`),
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
} from 'dotquilt/server';

import {
  staticChartMarkStyles,
  staticCircleMarkStyles,
  staticLineMarkStyles,
  staticSkeletonMarkStyles,
  staticTextLoaderMarkStyles,
  staticTextMarkStyles,
  staticTypingMarkStyles,
} from 'dotquilt/server';

/**
 * Static rules for squares and dashes. A component adds them only when it
 * draws one, so pages that keep the default dot don't carry them.
 */
function marksBeforeDefinition(
  css: readonly string[],
  tag: string,
): readonly string[] {
  return Object.freeze(
    css.map((text) => text.replaceAll(tag, beforeUpgrade(tag))),
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
// This already applies only before definition, to the chart's own drawing.
export const reactChartMarkStyles = staticChartMarkStyles;
export const reactTextMarkStyles = /* @__PURE__ */ textLoaderLowered(
  staticTextLoaderMarkStyles,
);
