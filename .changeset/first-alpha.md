---
"@dotquilt-internal/core": minor
"@dotquilt-internal/react": minor
---

First alpha: dot-based loading placeholders that hold the shape of your content, then hand over to it.

- **Nine components**: SkeletonBlock, SkeletonLine, SkeletonCircle and SkeletonText, TextLoader, ChartLoader, TableLoader, TypingDots and LoadingRegion. They are native Web Components with no runtime dependencies, plus React 19 components with server rendering.
- **The handoff**: when the data arrives, the marks take your content's real shape (each line's length, the image, the avatar, the chart's line, a number's digits). Then the content wipes in as they leave, in about a second.
- **Calm by default**: the idle glow stops after four seconds. Reduced motion, a pause and forced colours are respected.
- **Dot, square and dash marks**, in light and dark, themed with `--dotquilt-*` custom properties.
- **For real apps**: `delay` and `min-display` against flicker, a refresh cue that keeps content usable, opt-in pointer lift, strict CSP (a nonce, hashes or external stylesheets) and an entry per component.
