---
version: 1
slug: "src-components-home-hero-astro"
primary_target: "src/components/home/Hero.astro"
related_targets: ["src/content/docs/index.mdx"]
---

# Homepage: the field becomes the page

Mode: Persuade. Structure locked on the decision page: "The field becomes the page" (seed ee7c71ed, round 92f2a327). Build path: comp-led.

Approved comp: `.impeccable/mocks/decision/field.png` (1536×1024 = a 1440×960 viewport at 1.0667×; sidecar marked approved). Reference anchor: `.impeccable/mocks/ref/docs-chart.png`.

## The comp as a design system

- Ground: one cool off-white plane (#f7f7f9 sampled ≈ --dq-bg). No section bands, no gradients, no glass.
- Type: Manrope. Display 72px/1.0, weight 500, -0.03em, ink #161e2c (≈ --dq-ink). Lead 18–19px muted. Card labels 19–20px muted weight 500; card values ~62px weight 500, tabular.
- Corners: buttons ~6–9px, cards ~12px (--dq-radius-md). Line weight: 1px hairlines (--dq-line) only on cards and the outline button.
- Elevation: cards are white with a hairline and a very soft, low, offset shadow (--dq-shadow). Nothing else floats.
- Accent: one muted teal (--dq-accent, sampled #1f6e6f–#317277) on the primary button and the arrived chart line only.
- Marks: the field is slate marks (--dq-mark) on a ~22px grid, ~2.8px dots, opacity falling from ~0.45 at the top to ~0.1 at the bottom; a dissolving left edge of jittered, thinning marks; a few marks at peak near the top-left of the field.

## Inventory

| Ingredient | Comp (CSS px at 1440) | Medium |
| --- | --- | --- |
| Header, nav, search, theme, seam | existing site header | existing component, unchanged (owner-approved header B); the comp draws it ~27px taller, accepted |
| Headline "Loading states / that hand over." | left 82, cap top 197, 2 lines, 72px | semantic h1, Manrope 500 |
| Lead "Placeholders that hold the shape of your content, then become it." | baseline ~373, ~18.5px, one line | p |
| Primary action "Get started" | 148×58, teal fill, white text | a.home-button.primary, hero size |
| Secondary "See the components" | 217×58, white, hairline | a.home-button, hero size |
| Field grid | x 776→right edge, y 38→598; ~30×26 marks at 1440 (≈780 marks), denser/darker at top, fading down | real `dotquilt-skeleton-block` with --dotquilt-dot-size 2.8px / gap 19.2px, vertical mask; CSS grid fallback before upgrade |
| Dissolving left edge | x 590→776, ~60 jittered marks thinning leftward | authored SVG, deterministic PRNG |
| Lit marks | ~5 darker marks near the field's top-left | SVG, mark colour at peak |
| Rising trail | 16 marks, ~6.5px, from (663,562) to (956,432), spacing tightening toward the line | SVG circles |
| Arrived chart line | 2.5px teal polyline (973,421)→(1403,252), 7 points, junction node ~9px | SVG path; draws in on arrival |
| KPI cards ×3 | top 657, 178 tall, x 82→1358, gap ~20, white, radius 12 | `.home-card` grammar |
| KPI label | 19–20px muted | p |
| KPI value | "$48,210" ready; "1,284", "0.8%" shown pending in square marks | real `dotquilt-text-loader mark="square"` |

Signature: the chart line is the handoff itself — marks rise out of the field and become a solid line. It must stay the largest graphic in the first viewport.

## Motion (phase two)

One authored moment under 4 s on each homepage load, only when motion is allowed: the field's own idle glow drifts; the trail marks rise from rest to full strength in sequence toward the line (slate, never teal); the teal line draws in from the junction (1100 ms, ease-settle) as a 2px blur clears; the KPI values hand over at ~1.4 s, 2.0 s, 2.6 s through the real TextLoader. At rest and under reduced motion or without JavaScript: line drawn, values shown.

## Responsive

≥1180px: the comp. 900–1180: field and drawing scale down with the art column (container units), headline clamps. <900: copy, then the drawing as its own band, then the cards stacked.

## Not to literalize

The comp's oversized header, the slightly uneven card widths, and JPEG softness of the marks.
