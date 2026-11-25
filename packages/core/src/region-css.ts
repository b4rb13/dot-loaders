// Plain CSS with nothing built at load time, so TextLoader takes it without
// the region's refresh cue.
// The layers are slots (`display: contents` until styled), so they need boxes.
// The `:state(unstyled)` rules apply in the document while a region's external
// stylesheet loads, mirroring the layer visibility below.
// The frame (`.f`) fills a host taller than its layers with `height: 100%`,
// not `min-height`: WebKit resolves a grid item's percentage min-height
// against the row's previous size, so a placeholder that stops taking space
// (`contain: size` once ready) left the region at its pending height.
export const regionCss = `dotquilt-region:state(unstyled)::part(placeholder),dotquilt-region:state(unstyled)::part(refresh-indicator){visibility:hidden;pointer-events:none}dotquilt-region:state(unstyled)[data-presentation=pending]::part(placeholder),dotquilt-region:state(unstyled)[data-presentation=handoff]::part(placeholder),dotquilt-region:state(unstyled)[data-presentation=refreshing]::part(refresh-indicator){visibility:inherit}dotquilt-region:state(unstyled)[data-presentation=pending]::part(content){visibility:hidden}:host{display:grid;position:relative}:host(:focus){outline:none}:host(:focus-visible:not([data-dotquilt-focus=pointer])),:host([data-dotquilt-focus=""]:focus){outline:2px solid currentColor;outline-offset:3px}:host .f{display:grid;min-width:0;height:100%}:host [part]{display:block;grid-area:1/1;min-width:0}:host .p,:host .r{visibility:hidden;pointer-events:none}:host([data-presentation=pending]) .p,:host([data-presentation=handoff]) .p,:host([data-presentation=refreshing]) .r{visibility:inherit}:host([data-presentation=pending]) .c{visibility:hidden}:host([hidden]){display:none}:host > svg{position:absolute;inset:0;pointer-events:none}:host .fallback{display:block;min-height:1em;border:1px dotted currentColor}:host([data-dotquilt-waiting]) .p{visibility:hidden}`;
