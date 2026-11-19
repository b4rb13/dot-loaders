---
name: Dotquilt
description: Loading placeholders drawn from small marks that hand over to the real content.
colors:
  bg: "#f4f5f7"
  surface: "#ffffff"
  subtle: "#f7f8fa"
  ink: "#1b2230"
  muted: "#5e6777"
  faint: "#8c94a2"
  line: "#e7eaef"
  line-2: "#d8dde4"
  accent: "#2f6f74"
  accent-ink: "#ffffff"
  accent-soft: "#eaf2f2"
  mark: "#6e7889"
  mark-glow: "#4f8f93"
  code-bg: "#1e2430"
  code-fg: "#e2e7ee"
  code-punct: "#8892a2"
typography:
  display:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  page-title:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 4.6vw, 3.4rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.2vw, 2.375rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "18.75px"
    fontWeight: 400
    lineHeight: 1.5
  page-lead:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "1.09375rem"
    fontWeight: 400
    lineHeight: 1.65
  title:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  body-small:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  figure:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "62px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  mono:
    fontFamily: "DM Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  code:
    fontFamily: "DM Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "9px"
  md: "12px"
  lg: "16px"
  full: "999px"
spacing:
  gutter: "clamp(1.25rem, 5.7vw, 82px)"
  section: "clamp(4rem, 10vw, 7rem)"
  section-header: "2.5rem"
  grid-gap: "20px"
  card-gap: "1rem"
  card-pad: "1.25rem"
  card-pad-lg: "1.375rem"
  row: "1.375rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 18px"
  button-primary-hero:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "58px"
    padding: "0 28px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 18px"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
  button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "34px"
    padding: "0 14px"
  filter-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: "34px"
    padding: "0 14px"
  filter-pill-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  choice-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 11px"
  choice-chip-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-pad}"
  metric-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "28px 32px 0"
    height: "178px"
  code-panel:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.code-fg}"
    rounded: "{rounded.md}"
    padding: "1.25rem 1.375rem"
  segmented:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "3px"
  nav-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
  nav-link-current:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
  pill:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Dotquilt

This file records the site as built: the homepage, the examples gallery, the playground, the header and the footer. It comes after two owner-locked sources and never overrides them: `design/SPEC.md` ("System, refined", including the homepage pick "The field becomes the page") and `design/tokens.css`. Every colour, radius, shadow and motion value below is a `--dq-*` token from tokens.css; use the token, not the literal. Starlight is mapped onto those tokens in `src/styles/theme.css`, and the shared pieces of the wide pages live in `src/styles/home.css`.

## Overview

**Creative North Star: "The Field Becomes the Page"**

The site is a loading screen caught mid-handoff. Its ground is one cool off-white plane carrying a sparse field of marks. Content sits on white hairline cards that look like the product screens Dotquilt loads into. The product proves itself before it explains itself: every loader on the site is a real, live Dotquilt element, never a picture of one. The only saturated colour is the muted teal of things that have arrived or act.

Density is calm. Sections are separated by generous vertical space rather than bands or rules. Headings are short plain sentences in Manrope 500. Motion is either a single brief arrival under four seconds that never repeats, or a handoff the visitor triggers; reduced motion shows the finished state. Nothing is decorative unless it is a mark: the field, the header and footer seams, the logo tile and the loaders carry all of the visual identity.

The world refuses the headline-over-screenshot SaaS hero, gradients, glass, section colour bands, eyebrows above headings, and any accent other than the one teal. SPEC.md's "no novelty" rule (no metaphors, textures, mascots or display fonts) stands. The field of marks is not a texture; it is the product's own placeholder grid.

**Key Characteristics:**
- One cool plane (`bg`), white hairline cards (`surface` + `line` + soft `--dq-shadow`), and dark code panels; no other surfaces.
- One muted teal, reserved for the arrived and the actionable; ink, not teal, marks a selected choice.
- Marks as the only ornament: sparse field, 9px seams, the Quilt tile.
- Manrope 500 for display and headline sentences, 600 for titles; DM Mono for code, timings and "uses" lines.
- Real loaders everywhere a loader is shown; captions say so when data is illustrative.
- One arrival per load, eased and under 4 s; reduced motion shows the finished state.

## Colors

Cool greys at near-zero chroma, one muted teal accent, a slate mark family and a dark code palette; light and dark at parity through tokens.css.

### Primary
- **Arrived Teal** (`accent`): the primary button, the arrived chart line and its junction node, chart strokes and fills inside demos, inline action links ("Open in playground"), range-slider fills, the focus ring, and the current sidebar page (on `accent-soft`). Text on it is `accent-ink`. Dark theme swaps to #84babb via tokens.css.
- **Teal Wash** (`accent-soft`): background behind teal text (current docs page, avatar initials), the visitor's own chat bubble, and demo cover art. Never a section or card fill.

### Neutral
- **Cool Plane** (`bg`): the page ground everywhere, including behind the hero field. No section ever changes it.
- **Card White** (`surface`): cards, header bar, controls, secondary buttons, unpressed pills and chips.
- **Quiet Fill** (`subtle`): hover fill for buttons and nav links, the current nav link, status pills, avatar initials, incoming chat bubbles, track bars.
- **Ink** (`ink`): headings, values, strong text, the logo tile, and the fill of a pressed filter pill or checked choice chip.
- **Muted Slate** (`muted`): leads, body copy in sections, card labels, captions, unpressed chips, status lines.
- **Faint Slate** (`faint`): timestamps, axis and timeline ticks, the footer's license line, sidebar group labels.
- **Hairline** (`line`): card borders, ruled list rows, card-internal dividers (stage rules, the playground status bar), chip and pill borders, the footer rule.
- **Hairline Strong** (`line-2`): secondary-button border, step-number rings, filled track segments, field-like demo inputs. Only where hierarchy needs it.

### Code
- **Code Night** (`code-bg`), **Code Light** (`code-fg`), **Code Punctuation** (`code-punct`): the playground's code panel and Starlight code blocks. The panel's inner rule and selected tab are `code-fg` mixed at 12% and 10% into transparent; idle tabs and ghost buttons are `code-punct`. Syntax colours come from tokens.css's `--dq-code-*` set.

### Marks
- **Resting Mark** (`mark`): the loaders' resting slate (the runtime applies it at 37% opacity), the hero trail marks (0.95), and the hero's dissolving edge marks.
- **Glow** (`mark-glow`): only inside the idle glow and the lit mark of the Quilt logo tile.
- The sparse field draws its marks in `ink` (`--dotquilt-color: var(--dq-ink)`) and depends on its mask for strength. It never uses a hard-coded hex.

### Named Rules
**The Arrived Teal Rule.** Teal marks what has arrived or what acts: the finished chart line, the primary action, inline action links, focus, the current page. Placeholders, trail marks in flight, cards, headings and section fills are never teal. Use one teal primary button per group of actions; the other actions are hairline buttons.

**The Ink Selection Rule.** A pressed filter or checked option fills with `ink` and turns its text `surface`. Selection is not arrival, so it never takes teal.

**The One Plane Rule.** The page is one `bg` plane from header to footer. Depth comes from white cards and spacing, never from coloured bands, gradients or tinted sections.

## Typography

**Display Font:** Manrope (with Segoe UI, system-ui, sans-serif)
**Body Font:** Manrope
**Label/Mono Font:** DM Mono (with ui-monospace, Menlo), for code, timings, ticks and "uses" lines only

**Character:** One humanist grotesque at two weights does everything. Weight 500 in large sizes reads composed rather than loud, and 600 is kept for small titles that need to hold their own.

### Hierarchy
- **Display** (500, 72px, line-height 1, -0.03em, `text-wrap: balance`): the homepage first screen's two-line headline only. It clamps to clamp(52px, 6.1vw, 72px) below 1180px and clamp(40px, 11vw, 56px) below 900px. SPEC.md records this size.
- **Page title** (500, clamp(2.2rem, 4.6vw, 3.4rem), 1.1, -0.03em, centred): every other wide page's hero (examples, playground, pricing). It is SPEC.md's hero size.
- **Headline** (500, clamp(1.75rem, 3.2vw, 2.375rem), 1.1, -0.03em): every homepage section heading, written as a plain sentence ending in a full stop. The closing section uses a larger step, clamp(1.9rem, 4vw, 2.75rem).
- **Lead** (400, 18.75px, 1.5, `muted`, balanced, max 36rem; 17px below 900px): the one line under the display headline. The page-title lead is 17.5px / 1.65, max 40rem, centred.
- **Section intro** (400, 1rem, 1.65, `muted`, max 40rem): the paragraph under a headline.
- **Title** (600, 0.9375–1.0625rem): card and recipe titles, feature names, settings legends (0.8125rem), footer column heads (0.8125rem).
- **Body small** (400, 0.8125–0.875rem, 1.5–1.6, `muted`): card descriptions, footer copy, chat text, hints.
- **Figure** (500, -0.025em, tabular figures): metric values at 62px (clamp(40px, 5vw, 62px) in the middle band, 34px on phones), tile figures at 2.25rem, demo figures at 40px.
- **Card label** (500, 20.5px, 1.25, `muted`): the metric cards' labels.
- **Mono** (DM Mono 400): 0.75rem / 1.4 "uses" lines under recipes, 0.6875rem `faint` timeline ticks, 0.8125rem / 1.65 code.

### Named Rules
**The Sentence Heading Rule.** Headings are short sentences in Manrope 500 with no label above them. A section starts with its headline; there are no eyebrows, kickers or numbered section tags.

**The Two Weights Rule.** Use 500 for anything large (display, headlines, figures, labels) and 600 for small titles and the wordmark. 700 does not appear.

## Layout

Every wide page (any page with a hero: home, examples, playground, pricing) aligns to the homepage first screen's edges. The side padding is clamp(1.25rem, 5.7vw, 82px) (82px at 1440) and the content is at most 1276px wide, applied to Starlight's content panel through `data-has-hero`. Docs pages keep Starlight's grid with a 46rem content column (about 68ch of prose).

- **Section rhythm:** clamp(4rem, 10vw, 7rem) above and below each homepage section. A section's header block is at most 40rem wide with 2.5rem below it (1.25rem for gallery sub-sections). No dividers between sections; space separates them.
- **Page hero (non-home):** centred, max 44rem, clamp(2.5rem, 7vw, 4.5rem) above and 1rem below. The page's controls follow it centred (filter pills) or the work area starts directly under it.
- **Two-column sections** (handoff, get started): copy on the left and a live stage on the right, `minmax(0, 0.8–0.9fr) minmax(0, 1.1–1.2fr)` with a clamp(2rem, 5vw, 4.5rem) gap. They stack below 56rem.
- **Card grids:** three columns. The homepage component tiles use a 1rem gap, and the hero metrics and recipe cards use 20px. Tiles go to two columns below 64rem and recipes below 68rem; both go to one column below 40rem and 44rem respectively. An opened recipe spans the whole row as `minmax(0, 24rem) minmax(0, 1fr)`: demo left, code right.
- **Tool layout (playground):** a 19rem sticky settings card (top = nav height + 1rem) beside a column holding the stage card and the code panel, all 20px apart. Below 56rem it becomes one column in this order: stage, settings, code.
- **Ruled list:** rows have 1.375rem top and bottom padding. The title column is minmax(12rem, 18rem), the text runs up to 62ch, and the column gap is 2.5rem. One column below 40rem; max width 60rem.
- **First screen:** a 508px copy column with 185px top padding. The drawing fills the second column and bleeds to the window's right edge. The metric cards span the full width 57px below it, followed by a caption.

### Responsive bands
- **≥1180px:** the homepage comp at its authored size; the 850×600 drawing maps 1:1 to CSS px at 1440.
- **900–1180px:** the first screen's columns become `0.9fr 1fr`, the drawing scales with its container (container query units), the display and figures clamp down, and the metric cards lose their fixed height.
- **<900px:** one column: the copy (40px top padding), then the drawing as its own band capped at 560px wide and pinned right, then stacked metric cards (label left, value right). The hero buttons shrink to 50px tall.
- **<68rem / <64rem:** recipe and tile grids go to two columns.
- **<56rem:** two-column sections and the playground stack.
- **<50rem:** the header drops the main nav and the theme switch, keeping the brand and search.
- **<44rem / <40rem:** grids go to one column, and the ruled list stacks.
- **≥1920px:** content holds at 1276px centred; only the field bleeds.

## Elevation & Depth

Depth is a hybrid of hairlines and one very soft shadow. Every card carries a 1px `line` border and `--dq-shadow`; that is the resting elevation of anything that sits on the plane. `--dq-shadow-lg` appears in only two places: as the hover response on linked cards, and at rest on the one 16px app frame of the featured dashboard example. Code panels are flat: dark fill, no border, no shadow. Nothing else floats; there are no shadows on buttons, the header, the field or text.

### Shadow Vocabulary
- **Card** (`--dq-shadow`): every card at rest.
- **Raised** (`--dq-shadow-lg`): hovered component tiles (with a 2px lift) and the featured dashboard's app frame.

Exact light and dark values live in tokens.css.

### Named Rules
**The Hairline-Plus-Breath Rule.** A light card is a white surface, a 1px `line` border and the soft card shadow, all three, every time. Never a border alone on a card, never a shadow without the hairline, never a hard or offset shadow.

## Shapes

Radii are soft and small, from SPEC: 9px (`sm`) for buttons, choice chips, nav links, segmented controls, sidebar items and demo inputs; 12px (`md`) for cards, code panels and chat bubbles; 16px (`lg`) for large containers (the closing field, the dashboard app frame); fully round for filter pills, status pills, track bars, avatars, colour swatches and step numbers. A chat bubble drops the speaker's corner to 4px. Inner segment buttons use 6px so they nest inside the 9px control.

The recurring geometry is the mark: dots on a grid, squares in the pixel-font TextLoader, and the dash where text lines are drawn. The Quilt logo tile is a 28-unit ink square with a 7.5 radius holding four marks of radius 2.9; the bottom-right one is lit in `mark-glow`. The field and the seams are the mark grid at different pitches, never another pattern.

## Components

### Buttons
Quiet, softly rounded rectangular controls; the teal one is the only coloured element at rest.
- **Shape:** gently rounded (`sm`, 9px).
- **Primary:** `accent` fill, `accent-ink` text, transparent border, Manrope 500 at 0.875rem, 40px tall. On hover, 12% ink is mixed into the teal (`color-mix(in srgb, accent 88%, ink)`).
- **Secondary:** `surface` fill, 1px `line-2` border, `ink` text; the fill turns `subtle` on hover.
- **Small:** 34px tall, 0.8125rem, 0.875rem side padding. Used for in-card controls (Play, Load again, Code, Start loading / Reveal).
- **Hero size:** 58px tall, 28px side padding, 17px text, 24px apart (50px / 18px / 16px / 12px below 900px).
- **Text actions:** an inline teal link (500, 0.8125rem, underline offset 3px) for a card's onward action. A `muted` underlined text button for a reset; it turns `ink` on hover.
- **Focus:** 2px `accent` outline, 2px offset, on every interactive element. Transitions use `--dq-duration-ui` on `--dq-ease-settle`.

### Filters and choices
- **Filter pill:** 34px, fully round, 1px `line` border, `surface` fill, `muted` 500 0.8125rem, 6px apart and centred. When pressed (`aria-pressed`), it fills with `ink` and its text turns `surface`. The filter state is kept in the URL.
- **Choice chip (settings):** a 32px tall, 9px radius label wrapping a real radio, with a 1px `line` border, `muted` text, and an `ink` fill when checked. Chips wrap with 6px gaps.
- **Colour swatch:** a 26px circle with a 2px `surface` inset ring; the checked swatch gets a 2px `ink` border.
- **Range:** a native slider in `accent-color: accent`, with a tabular `muted` value right-aligned on the legend line.
- **Segmented control:** a `surface` bar with a 1px `line` border, 3px inset and 2px gaps, holding 28px segments. The selected segment is `subtle` with `ink` text and an inset `line` ring. Each option may lead with the mark swatch it selects (5px dot, 5px square at 1.4px radius, 11×4px dash).

### Cards / Containers
- **Corner Style:** `md` (12px).
- **Background:** `surface`.
- **Shadow Strategy:** card shadow at rest; linked tiles rise 2px into the raised shadow on hover.
- **Border:** 1px `line`.
- **Internal Padding:** 1.25rem for tiles and the settings card, 1.375rem for recipe cards, 1.5rem for stages, 28px 32px for metric cards.
- **Stage-card anatomy (tiles and recipes):** a live loader on a stage (8.5rem tall on tiles, at least 11rem on recipes), ruled off below by a 1px `line`, then a 600 title, one `muted` line and, on recipes, a DM Mono "uses" line. Recipe cards end with small buttons and a teal onward link pushed to the right. No inner frame and no screenshots.
- **Tool stage card:** a status bar (`muted` 0.8125rem live status on the left, small Start loading / primary Reveal buttons on the right) ruled off by a `line`, above a centred stage at least 22rem tall.
- **Metric card:** a 500 `muted` label, then a 62px tabular value rendered by a real `dotquilt-text-loader mark="square"` that hands over from square marks. A 13px `muted` caption under the group says the data is an example.

### Code panel
A flat `code-bg` block with a 12px radius. A tab bar sits on top (30px tabs and ghost buttons in `code-punct`; the selected tab and hover in `code-fg`), separated by a rule in `code-fg` at 12%. Below it is DM Mono 0.8125rem / 1.65 code at 1.25rem 1.375rem padding. On the gallery and homepage, code uses Starlight's code tabs, themed by the same tokens.

### Ruled list
Features are a list, not cards: rows are separated by 1px `line` rules (one at the top of each row, plus a closing rule), with a 600 title on the left and `muted` text on the right. No icons or glyphs on rows.

### Navigation
- **Header:** a `surface` bar with the Quilt tile and the "dotquilt" wordmark (600, 1.125rem, -0.025em) as a square-mark TextLoader. The links are Docs, Components, Guides, Examples, Playground and Pricing, in `muted` 500 0.875rem with a 9px radius; hover and the current page both get a `subtle` fill with `ink` text. Starlight search grows to fill the space, and the theme select sits at the end. The header's lower edge is a 9px row of paused marks (the seam).
- **Footer:** opens with the same 9px seam, then the brand with a one-line description and three link columns (600 0.8125rem heads, 0.875rem `muted` links that turn `ink` on hover), then the license line in `faint` 0.8125rem above a `line` rule.
- **Docs sidebar:** the current page is `accent` on `accent-soft`; group labels are 0.75rem 600 `faint`, not uppercase.

### Field of marks (signature)
The world's ground ornament and the hero's drawing, built from a real `dotquilt-skeleton-block`, never an image.
- **Grid:** `--dotquilt-dot-size: 2.8px`, `--dotquilt-dot-gap: 19.6px` (22.4px pitch), `--dotquilt-color: var(--dq-ink)`, square corners (`border-radius: 0`).
- **Hero fade:** a vertical mask stepping 0.81 → 0.55 (14%) → 0.33 (30%) → 0.19 (47%) → 0.16 (70%) → 0.13 (92%) → transparent, so the field is strongest at the top.
- **Dissolving edge:** a band of loose SVG marks (r 1.4) in `mark` to the left of the grid, thinning leftward at 0.1–0.38 opacity, with a few at 0.9 as marks at their peak.
- **Trail and line:** 16 `mark` marks (r 3.2, 0.95) rising with tightening spacing into a 2.6px `accent` polyline (round caps and joins). The line starts at an `accent` junction node of radius 4.4 and is the largest graphic in the first viewport.
- **Closing variant:** the same grid filling a 16px-radius container, with a radial mask that is clear behind the words and fades at the edges (transparent at 30%, 0.55 at 60%, transparent at 96%).
- **Seam variant:** a 9px-tall single row of default marks at `motion="paused"`, along the header's lower edge and the footer's top edge.

### Motion
- **Arrival (homepage first screen, motion allowed only):**
  - Trail marks brighten from 0.2 to rest in sequence (700ms, ease-settle, starting at 200ms plus 45ms per mark).
  - The junction appears at 850ms (fade duration, scaling up from 0.4).
  - The line draws from the junction at 900ms over `--dq-duration-handoff` (1.1s) while a 2px blur clears.
  - The metric values hand over at 1.2 s, 1.9 s and 2.6 s through the TextLoader.
  - Everything is done before 4 s.
- **Header arrival:** on the first visit of a session, the wordmark locks in from square marks after 1.2 s and the glow drifts once along the seam. Later pages show it at rest.
- **Visitor-triggered handoffs:** examples and the playground replay loaders only on request (Load again, Start loading / Reveal), using the runtime's own handoff.
- **Gating:** an inline script arms the arrival before paint, and only when `prefers-reduced-motion` is not set. Reduced motion and no-JavaScript show the finished state: line drawn, values in place.
- **UI transitions:** 320ms on ease-settle for background, colour, border, shadow and lift. The curves and durations are SPEC's; nothing is linear, snapping or looping.

## Do's and Don'ts

### Do:
- **Do** use the `--dq-*` tokens from `design/tokens.css`; when SPEC.md and this file disagree, SPEC.md wins and this file is updated.
- **Do** show real, live Dotquilt elements wherever a loader appears, on the card itself, and label illustrative data as example data.
- **Do** build light cards as `surface` + 1px `line` + `--dq-shadow` at a 12px radius, and separate sections with clamp(4rem, 10vw, 7rem) of space.
- **Do** keep teal to the arrived line, the primary action, inline onward links, focus and the current page (The Arrived Teal Rule); mark selection with `ink` (The Ink Selection Rule).
- **Do** reuse the field at 2.8px / 19.6px in `var(--dq-ink)` under a mask when a surface needs ground ornament, and the 9px seam for horizontal edges.
- **Do** align every wide page to the clamp(1.25rem, 5.7vw, 82px) gutter and the 1276px maximum.
- **Do** keep tool and filter state in the URL, so a view can be shared.
- **Do** gate every authored motion on reduced motion before paint, keep it under 4 s, and make the at-rest state the finished state.

### Don't:
- **Don't** put a label, kicker or eyebrow above a heading.
- **Don't** colour trail marks, placeholders, cards, selected chips or section backgrounds teal, or add a second accent hue.
- **Don't** use gradients, glass, coloured section bands or textures on the plane; the only pattern is the mark grid.
- **Don't** use hard, offset or dark shadows, or a light card without its hairline.
- **Don't** hard-code mark colours; use `--dq-ink`, `--dq-mark` or `--dq-mark-glow`.
- **Don't** use screenshots or static images of loaders where a live element can render.
- **Don't** decorate list rows or features with icons or glyphs; mark swatches appear only where they select a mark shape.
- **Don't** loop or replay the arrival unasked, or animate anything linearly or with overshoot.
- **Don't** fabricate metrics, testimonials or logos; example values are captioned as examples.
