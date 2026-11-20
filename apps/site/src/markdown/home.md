# Dotquilt

> Skeleton loaders (loading placeholders) for the web, made of dots. They hold the shape of your content while it loads, then hand over to it. Native Web Components with no runtime dependencies, and React 19 components with server rendering. Free and open source under the MIT license.

When your data arrives, the placeholder's marks travel to the content's real shape: each skeleton line grows or shrinks to the length of its text, a number's marks take the shape of its digits, and a chart's marks glide onto the line. Then the content wipes in as they leave, in about a second.

## Install

```sh
npm install dotquilt
```

For React 19:

```sh
npm install @dotquilt/react dotquilt
```

## Quick start

```tsx
'use client';
import { LoadingRegion, SkeletonText } from '@dotquilt/react';

export function Summary({ data }: { data: Revenue | null }) {
  return (
    <LoadingRegion
      aria-label="Revenue"
      state={data ? 'ready' : 'pending'}
      placeholder={<SkeletonText lines={3} />}
    >
      {data && <RevenueCard data={data} />}
    </LoadingRegion>
  );
}
```

Without React:

```html
<dotquilt-region state="pending" aria-label="Revenue">
  <dotquilt-skeleton-text slot="placeholder" lines="3"></dotquilt-skeleton-text>
  <article>…your content…</article>
</dotquilt-region>
<script type="module">
  import { registerLoadingRegion } from 'dotquilt/region';
  import { registerSkeletonText } from 'dotquilt/skeleton';
  registerLoadingRegion();
  registerSkeletonText();
  // When the data arrives: document.querySelector('dotquilt-region').update({ state: 'ready' });
</script>
```

## Components

- [LoadingRegion](https://dotquilt.dev/docs/components/loading-region.md): the area that switches from placeholder to content (pending, refreshing, ready) and owns the handoff.
- [Skeleton](https://dotquilt.dev/docs/components/skeleton.md): blocks, lines, circles and paragraphs of marks for images, text and avatars.
- [TextLoader](https://dotquilt.dev/docs/components/text-loader.md): a number or short label that takes shape in marks.
- [ChartLoader](https://dotquilt.dev/docs/components/chart-loader.md): a field of marks that glides onto your real line, bars or points.
- [TableLoader](https://dotquilt.dev/docs/components/table-loader.md): rows of marks shaped like your columns.
- [TypingDots](https://dotquilt.dev/docs/components/typing-dots.md): a reply that is being written.

## What it takes care of

- **Accessibility:** pending content is inert and hidden from assistive technology, focus is kept, reduced motion swaps content in at once, and forced-colours mode shows a clear outline.
- **Server rendering:** placeholders are in the first HTML at your content's size, so nothing jumps when JavaScript arrives.
- **Strict CSP:** no inline style attributes; allow the stylesheets with a nonce or hashes, or serve them as files.
- **Calm by default:** the idle glow stops after four seconds; `delay` and `min-display` keep fast loads from flickering.
- **Only what you use:** every component has its own entry point.

## For agents

- To add Dotquilt to a project, follow the setup prompt: https://dotquilt.dev/setup-prompt.md
- Every docs page as Markdown: https://dotquilt.dev/llms.txt (index) and https://dotquilt.dev/llms-full.txt (all in one file)
- Source and issues: https://github.com/b4rb13/dot-loaders
- Packages: https://www.npmjs.com/package/dotquilt and https://www.npmjs.com/package/@dotquilt/react
