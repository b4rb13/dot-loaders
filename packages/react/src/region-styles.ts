// Its own module, with nothing built at load time: the region component takes
// it without the skeleton and text styles that server.ts builds.
// The region while it's undefined or waiting for its stylesheet, at zero
// specificity, so the page's own classes win.
const region = ':where(dotquilt-region:is(:not(:defined),:state(unstyled)))';
/**
 * A region's slots. While pending, the placeholder is in flow, with any
 * content below it, so the first HTML reserves its space (and without
 * JavaScript the content stays visible under it). The refresh cue lies over
 * the content.
 */
export const reactRegionStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    `${region}{display:flow-root;position:relative}${region}[hidden]{display:none}${region}>[data-dotquilt-react-slot]{position:absolute;inset:0;pointer-events:none}${region}[state=pending]>[slot=placeholder]{position:relative}${region}:not([state=pending])>[slot=placeholder],${region}:not([state=refreshing])>[slot=refresh-indicator]{display:none}${region}[state=pending][data-dotquilt-react-empty]::before{content:"";position:absolute;inset:0;min-height:1em;border:1px dotted currentColor}`,
  ]);
