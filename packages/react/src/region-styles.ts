// Its own module, with nothing built at load time: the region component takes
// it without the skeleton and text styles that server.ts builds.
export const reactRegionStyles: readonly string[] =
  /* @__PURE__ */ Object.freeze([
    'dotquilt-region:is(:not(:defined),:state(unstyled)){display:flow-root;position:relative}dotquilt-region:is(:not(:defined),:state(unstyled))[hidden]{display:none}dotquilt-region:is(:not(:defined),:state(unstyled))>[data-dotquilt-react-slot]{position:absolute;inset:0;pointer-events:none}dotquilt-region:is(:not(:defined),:state(unstyled)):not([state=pending])>[slot=placeholder],dotquilt-region:is(:not(:defined),:state(unstyled)):not([state=refreshing])>[slot=refresh-indicator]{display:none}dotquilt-region:is(:not(:defined),:state(unstyled))[state=pending][data-dotquilt-react-empty]::before{content:"";position:absolute;inset:0;min-height:1em;border:1px dotted currentColor}',
  ]);
