# @dotquilt/react

## 0.1.2

### Patch Changes

- 6f01d44: `DotquiltStyle` accepts `--dotquilt-refresh-gap`, the distance between a refreshing region's top edge and its row of marks, as the theming and LoadingRegion docs describe.
- Updated dependencies [51f4f5c]
- Updated dependencies [4bf062a]
- Updated dependencies [e0ba90e]
  - dotquilt@0.1.2

## 0.1.1

### Patch Changes

- ca484b4: Chart handoffs keep their marks at full strength while they land on the line. A region with a chart placeholder used to fade its whole placeholder layer across the handoff, so the marks reached the line at half strength or less; now the layer holds until the chart's own marks have left, and lets go only in the last tenth of the handoff.
- Updated dependencies [ca484b4]
  - dotquilt@0.1.1

## 0.1.0

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
