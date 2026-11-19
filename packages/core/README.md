# Dotquilt

Loading placeholders that hold the shape of your content, then hand over to it. Marks wait where your content will be. When the data arrives they dim and drift away while the content settles in, in about a second.

Native Web Components with no runtime dependencies, for any framework or none. For React, see `@dotquilt-internal/react`.

> **Status:** pre-alpha and not yet published to npm. The package name is provisional.

## Install

```bash
npm install @dotquilt-internal/core
```

## Quick start

```html
<dotquilt-region state="pending" aria-label="Revenue">
  <dotquilt-skeleton-text slot="placeholder" lines="3"></dotquilt-skeleton-text>
  <p>Your content</p>
</dotquilt-region>

<script type="module">
  import { registerAll } from '@dotquilt-internal/core/register-all';

  registerAll();
  const region = document.querySelector('dotquilt-region');
  const data = await fetch('/api/revenue').then((response) => response.json());
  // …render your content, then:
  region.update({ state: 'ready' });
</script>
```

Register only what a page uses to keep it small. Each component has its own entry, for example `@dotquilt-internal/core/skeleton` with `registerSkeletonBlock()`.

## Components

| Element | Entry | Use it for |
| --- | --- | --- |
| `<dotquilt-region>` | `/region` | Wraps content: shows a placeholder while pending, keeps content usable while refreshing, and hands over when ready |
| `<dotquilt-skeleton-block>`, `-line`, `-circle`, `-text` | `/skeleton` | Images, lines, avatars and paragraphs |
| `<dotquilt-text-loader>` | `/text` | Numbers and short labels that lock into place |
| `<dotquilt-chart-loader>` | `/chart` | Line, bar and scatter charts: marks glide onto your real data |
| `<dotquilt-table-loader>` | `/table` | Tables: rows settle in one after another |
| `<dotquilt-typing-dots>` | `/typing` | A reply that is being written |

Animations live in `/animations/<family>` (for example `scan`, `cycle` and `morphWipe` for charts). Server rendering is in `/server` (`renderStatic`), and stylesheets are at `/styles/*.css` for strict CSP setups.

## What it takes care of

- **Accessibility.** Pending content is inert and hidden from assistive technology. Focus is kept. Reduced motion stills every loader, and forced-colours mode shows a clear outline.
- **Server rendering.** Placeholders are in the first HTML, at your content's size, so nothing jumps when JavaScript arrives.
- **Strict CSP.** No inline style attributes. Allow the stylesheets with a nonce or hashes, or serve them as files.
- **Calm by design.** The idle motion stops after four seconds. `delay` and `min-display` keep fast loads from flickering.
- **Cleanup.** Listeners and observers are released when a loader leaves the page.

## Docs

Guides, every option and live examples are at [dotquilt.dev](https://dotquilt.dev). You can also try every loader in the [playground](https://dotquilt.dev/playground/).

## License

MIT
