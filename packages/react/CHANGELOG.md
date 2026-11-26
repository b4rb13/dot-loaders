# @dotquilt/react

## 0.2.1

Released: 2026-11-26

### Patch Changes

- efc0c00: Server-rendered loaders keep their layout until the elements register:
  
  - Your own classes now win over the static styles, as they do once the element is defined. The static rules matched the element at a higher specificity than a class, so a `SkeletonCircle` or `TextLoader` sized by a class (`.avatar { width: 48px }`) drew at its default size in the server HTML, then jumped when the element registered.
  - A pending `LoadingRegion` reserves its placeholder's space. The placeholder lay over the content, so a region whose content was still empty, or an empty list, was only as tall as that content (often 0 px) until the element registered. The placeholder is now in flow, with any content below it, as the server rendering guide describes.
- Updated dependencies
  - dotquilt@0.2.1

## 0.2.0

Released: 2026-11-21

### Patch Changes

- Updated dependencies [f4205bf]
- Updated dependencies [de635bb]
  - dotquilt@0.2.0

## 0.1.2

Released: 2026-11-20

### Patch Changes

- 6f01d44: `DotquiltStyle` accepts `--dotquilt-refresh-gap`, the distance between a refreshing region's top edge and its row of marks, as the theming and LoadingRegion docs describe.
- Updated dependencies [51f4f5c]
- Updated dependencies [4bf062a]
- Updated dependencies [e0ba90e]
  - dotquilt@0.1.2

## 0.1.1

Released: 2026-11-20

### Patch Changes

- ca484b4: Chart handoffs keep their marks at full strength while they land on the line. A region with a chart placeholder used to fade its whole placeholder layer across the handoff, so the marks reached the line at half strength or less; now the layer holds until the chart's own marks have left, and lets go only in the last tenth of the handoff.
- Updated dependencies [ca484b4]
  - dotquilt@0.1.1

## 0.1.0

Released: 2026-11-20

### Minor Changes

- c7dd5a8: First alpha: dot-based loading placeholders that hold the shape of your content, then hand over to it.
  
  - **Nine components**: SkeletonBlock, SkeletonLine, SkeletonCircle and SkeletonText, TextLoader, ChartLoader, TableLoader, TypingDots and LoadingRegion. They are native Web Components with no runtime dependencies, plus React 19 components with server rendering.
  - **The handoff**: when the data arrives, the marks take your content's real shape (each line's length, the image, the avatar, the chart's line, a number's digits). Then the content wipes in as they leave, in about a second.
  - **Calm by default**: the idle glow stops after four seconds. Reduced motion, a pause and forced colours are respected.
  - **Dot, square and dash marks**, in light and dark, themed with `--dotquilt-*` custom properties.
  - **For real apps**: `delay` and `min-display` against flicker, a refresh cue that keeps content usable, opt-in pointer lift, strict CSP (a nonce, hashes or external stylesheets) and an entry per component.

### Patch Changes

- Updated dependencies [c7dd5a8]
  - dotquilt@0.1.0
