# Dotquilt for React

React 19 components for [Dotquilt](https://dotquilt.dev): loading placeholders that hold the shape of your content, then hand over to it. They are thin wrappers over the native Web Components in `dotquilt`. Server rendering is included: placeholders are in the first HTML at your content's size, and hydration keeps your content and focus.

> **Status:** pre-alpha and not yet published to npm. The package names are provisional.

## Install

```bash
npm install @dotquilt/react dotquilt
```

`react` and `react-dom` 19 are peer dependencies.

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

Your app owns the request; the region only needs to know whether the data is `pending`, `refreshing` (content stays visible and usable) or `ready`. Give each load a `cycle` so a stale answer can't settle a newer one. Use `delay` and `minDisplay` to keep fast loads from flickering.

## Components

| Component | Use it for |
| --- | --- |
| `LoadingRegion` | Wraps content: a placeholder while pending, a refresh cue while refreshing, a handoff when ready |
| `SkeletonBlock`, `SkeletonLine`, `SkeletonCircle`, `SkeletonText` | Images, lines, avatars and paragraphs |
| `TextLoader` | Numbers and short labels that take shape in marks, then hand over |
| `ChartLoader` | Line, bar and scatter charts; give it a `targetProvider` so marks glide onto your data |
| `TableLoader` | Tables: each cell's marks gather into its real text |
| `TypingDots` | A reply that is being written |

Each component is also available from its own entry (for example `@dotquilt/react/region`), so a page loads only what it uses. Animations come from `dotquilt/animations/<family>` and are passed as `animations={{ idle: scan() }}`.

## Server rendering and hydration

- Render the same `state` on the server and in the first client render, so hydration matches.
- Without JavaScript, or if it fails, a pending region keeps its still placeholder and your content stays visible and usable. To hide pending content instead, render it with `hidden` and `inert` yourself.
- **Next.js App Router:** import your client component from a server component as usual; don't turn off SSR. Keep custom animations, refs, callbacks and reveal targets in client code, because they can't cross the server boundary.

## Strict CSP

Choose a `stylePolicy` before the first render and pass it to every component:

- **`{ mode: 'inline' }`** (default) writes deterministic `<style>` elements. Allow them with CSP hashes of the exported strings in `@dotquilt/react/server` and `dotquilt/server`.
- **`{ mode: 'inline', nonce }`** applies your request's nonce. Keep the document's nonce for the whole visit, including client navigations.
- **`{ mode: 'external', href }`** points at a stylesheet you serve. Copy it from `@dotquilt/react/styles/*.css`.

Dotquilt never writes inline `style` attributes. With `style-src-attr 'none'`, theme it with classes and the `--dotquilt-*` custom properties in your own CSS.

## Docs

Guides, every option and live examples are at [dotquilt.dev](https://dotquilt.dev). You can also try every loader in the [playground](https://dotquilt.dev/playground/).

## License

MIT
