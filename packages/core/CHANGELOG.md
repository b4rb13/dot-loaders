# dotquilt

## 0.1.2

### Patch Changes

- 51f4f5c: The handoff no longer draws marks for text you can't see. It measured text with `getClientRects()`, which ignores clipping, so a visually hidden table header (a 1 px box with `overflow: hidden`, `clip` or `clip-path: inset(50%)`) became a stray row of marks. Text and boxes are now clipped by their ancestors' `overflow`, `clip` and `clip-path` up to the region, and what shows less than 2 px isn't a target.
- 4bf062a: A region is as tall as its content once it has handed over, and while it refreshes. The placeholder used to keep its space after `ready`, so a placeholder taller than the content left blank space for good, including on error states (`state="ready"` with `timing.duration: 0`). The placeholder still keeps its place through the handoff, which reads it, and the region's presentation now goes from `pending` straight to `handoff`.
- e0ba90e: A pending TextLoader inside a line of text no longer makes the line taller. While its value was still empty and only the mask showed, the loader had no text baseline and sat on the line by its bottom edge, so a 42 px line at 28 px type grew to 53 px. Its layers now share one baseline, the mask's, so the line keeps its height.

## 0.1.1

### Patch Changes

- ca484b4: Chart handoffs keep their marks at full strength while they land on the line. A region with a chart placeholder used to fade its whole placeholder layer across the handoff, so the marks reached the line at half strength or less; now the layer holds until the chart's own marks have left, and lets go only in the last tenth of the handoff.

## 0.1.0

### Minor Changes

- c7dd5a8: First alpha: dot-based loading placeholders that hold the shape of your content, then hand over to it.
  
  - **Nine components**: SkeletonBlock, SkeletonLine, SkeletonCircle and SkeletonText, TextLoader, ChartLoader, TableLoader, TypingDots and LoadingRegion. They are native Web Components with no runtime dependencies, plus React 19 components with server rendering.
  - **The handoff**: when the data arrives, the marks take your content's real shape (each line's length, the image, the avatar, the chart's line, a number's digits). Then the content wipes in as they leave, in about a second.
  - **Calm by default**: the idle glow stops after four seconds. Reduced motion, a pause and forced colours are respected.
  - **Dot, square and dash marks**, in light and dark, themed with `--dotquilt-*` custom properties.
  - **For real apps**: `delay` and `min-display` against flicker, a refresh cue that keeps content usable, opt-in pointer lift, strict CSP (a nonce, hashes or external stylesheets) and an entry per component.
