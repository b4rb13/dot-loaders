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
  positive: "#2f7656"
  positive-soft: "#eaf4ef"
  negative: "#a84a3a"
  warning: "#85601e"
  warning-soft: "#f8f1e3"
  info: "#3c5f99"
  info-soft: "#edf2f9"
typography:
  display:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(44px, 5.4vw, 72px)"
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
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.2
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
    height: "52px"
    padding: "0 24px"
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
  app-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  frame-foot:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.muted}"
    padding: "0.5rem 1.25rem"
    height: "2.75rem"
  hold-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 1.125rem 0 0.5rem"
  hold-button-held:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
  hold-button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "34px"
    padding: "0 0.75rem 0 0.4375rem"
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
  segmented-track:
    backgroundColor: "{colors.subtle}"
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
  status-chip-paid:
    backgroundColor: "{colors.positive-soft}"
    textColor: "{colors.positive}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
  status-chip-sent:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
  status-chip-overdue:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
---

# Design System: Dotquilt

This file records the site as built: the homepage, the examples gallery, the playground, the header and the footer. It comes after two owner-locked sources and never overrides them: `design/SPEC.md` ("System, refined") and `design/tokens.css`. Every colour, radius, shadow and motion value below is a `--dq-*` token from tokens.css; use the token, not the literal. Starlight is mapped onto those tokens in `src/styles/theme.css`, and the shared pieces of the wide pages live in `src/styles/home.css`; the homepage's app screens and hold controls share `src/components/home/app.css` and `hold.css`.

The homepage is the owner's later pick, a "combination of variants A and C": A ("One real screen, loading") gives the first screen and the example screens, C ("You are the network") gives the hold-to-load controls and the last sections. SPEC.md's homepage line records this pick; the earlier one (2026-11-19) was "The field becomes the page".

## Overview

**Creative North Star: "One Real Screen, Loading"**

The site is a product screen caught while it loads. Its ground is one cool off-white plane carrying a sparse field of marks. On the first screen, a white app frame sits over that field and loads for real: three figures lock, a chart line draws from its own marks, and table rows settle; it rests, then loads the next range. Further down, the same kind of frame shows an inbox, invoices and an activity feed, and the visitor plays the network: press and hold keeps a demo loading, letting go delivers. The product proves itself before it explains itself: every loader on the site is a real, live Dotquilt element, never a picture of one. The only saturated colour is the muted teal of things that have arrived or act.

Density is calm. Sections are separated by generous vertical space rather than bands or rules. Headings are short plain sentences in Manrope 500. Every example section reads the same way: copy and controls on the left, the live result on the right. Motion is the first screen's loading loop (which waits whenever the visitor is busy with it, and can be paused), or a load the visitor holds and releases; reduced motion shows the finished state. Nothing is decorative unless it is a mark: the field, the header and footer seams, the logo tile and the loaders carry all of the visual identity.

The world refuses the headline-over-screenshot SaaS hero (the frame beside the headline is live, not a picture), gradients, glass, section colour bands, eyebrows above headings, and any accent other than the one teal. SPEC.md's "no novelty" rule (no metaphors, textures, mascots or display fonts) stands. The field of marks is not a texture; it is the product's own placeholder grid.

**Key Characteristics:**
- One cool plane (`bg`), white hairline cards (`surface` + `line` + soft `--dq-shadow`), 16px app frames on the raised shadow, and dark code panels; no other surfaces.
- One muted teal, reserved for the arrived and the actionable; ink, not teal, marks a selected choice and the hold control.
- Marks as the only ornament: sparse field, 9px seams, the Quilt tile.
- Manrope 500 for display and headline sentences, 600 for titles; DM Mono for code, timings and "uses" lines.
- Real loaders everywhere a loader is shown, inside realistic app frames; captions say so when data is illustrative.
- Copy and controls left, live result right; press and hold to keep loading, let go to deliver.
- Every handoff eased and under 4 s; reduced motion shows the finished state.

## Colors

Cool greys at near-zero chroma, one muted teal accent, a slate mark family, SPEC's semantic status colours for example data, and a dark code palette; light and dark at parity through tokens.css.

### Primary
- **Arrived Teal** (`accent`): the primary button, the arrived chart line (with a `surface` end node ringed in teal), chart strokes and fills inside demos, inline action links ("Open in playground"), range-slider fills, the focus ring (`--dq-focus`), and the current sidebar page (on `accent-soft`). Text on it is `accent-ink`. Dark theme swaps to #84babb via tokens.css.
- **Teal Wash** (`accent-soft`): background behind teal text (current docs page, avatar initials), the visitor's own chat bubble, text selection inside the home sections, and demo cover art. Never a section or card fill.

### Neutral
- **Cool Plane** (`bg`): the page ground everywhere, including behind the first screen's field. No section ever changes it.
- **Card White** (`surface`): cards, app frames, header bar, controls, hold buttons, secondary buttons, unpressed pills and chips, the gliding pill of a segmented track.
- **Quiet Fill** (`subtle`): hover fill for buttons and nav links, the current nav link, a held hold button, app-frame foots, segmented tracks, status pills, avatar initials, incoming chat bubbles, track bars.
- **Ink** (`ink`): headings, values, strong text, the logo tile, the hold button's disc, a switch that is on, and the fill of a pressed filter pill, checked choice chip or chosen speed.
- **Muted Slate** (`muted`): leads, body copy in sections, card labels, captions, unpressed chips, status lines, timing readouts.
- **Faint Slate** (`faint`): timestamps, axis and timeline ticks, "uses" lines, the first screen's meta line, the footer's license line, sidebar group labels.
- **Hairline** (`line`): card and frame borders, frame bar and foot rules, ruled list rows, card-internal dividers (stage rules, the playground status bar), chart grid lines, chip and pill borders, the footer rule.
- **Hairline Strong** (`line-2`): secondary-button border, the pause key's border, the off switch track, step-number rings, filled track segments, field-like demo inputs. Only where hierarchy needs it.

### Status (example data only)
- **Positive** (`positive` on `positive-soft`), **Negative** (`negative`), **Warning** (`warning` on `warning-soft`), **Info** (`info` on `info-soft`): SPEC's semantic set. They appear only inside app frames, as data: KPI deltas (positive, or negative when a figure falls) and invoice status chips (Paid positive, Sent and Open info, Overdue warning). Site chrome, controls and headings never use them.

### Code
- **Code Night** (`code-bg`), **Code Light** (`code-fg`), **Code Punctuation** (`code-punct`): the playground's code panel, the homepage's Details proofs and Starlight code blocks. The panel's inner rule and selected tab are `code-fg` mixed at 12% and 10% into transparent; idle tabs and ghost buttons are `code-punct`. Syntax colours come from tokens.css's `--dq-code-*` set.

### Marks
- **Resting Mark** (`mark`): the loaders' resting slate (the runtime applies it at 37% opacity).
- **Glow** (`mark-glow`): only inside the idle glow and the lit mark of the Quilt logo tile.
- The sparse field draws its marks in `ink` (`--dotquilt-color: var(--dq-ink)`) and depends on its mask for strength. It never uses a hard-coded hex.

### Named Rules
**The Arrived Teal Rule.** Teal marks what has arrived or what acts: the finished chart line, the primary action, inline action links, focus, the current page. Placeholders, marks in flight, cards, headings, hold controls and section fills are never teal. Use one teal primary button per group of actions; the other actions are hairline buttons.

**The Ink Selection Rule.** A pressed filter, checked option or chosen speed fills with `ink` and turns its text `surface`. Selection is not arrival, so it never takes teal. A segmented track is the one exception in form, not colour: its choice is a white pill gliding on a `subtle` track, with `ink` text.

**The One Plane Rule.** The page is one `bg` plane from header to footer. Depth comes from white cards, frames and spacing, never from coloured bands, gradients or tinted sections.

## Typography

**Display Font:** Manrope (with Segoe UI, system-ui, sans-serif)
**Body Font:** Manrope
**Label/Mono Font:** DM Mono (with ui-monospace, Menlo), for code, timings, ticks and "uses" lines only

**Character:** One humanist grotesque at two weights does everything. Weight 500 in large sizes reads composed rather than loud, and 600 is kept for small titles that need to hold their own.

### Hierarchy
- **Display** (500, clamp(44px, 5.4vw, 72px), line-height 1, -0.03em, `text-wrap: balance`): the homepage first screen's two-line headline only. Below 960px it is clamp(40px, 9vw, 60px). The copy column is as wide as the headline's second line, `calc(var(--h1) * 6.62)`.
- **Page title** (500, clamp(2.2rem, 4.6vw, 3.4rem), 1.1, -0.03em, centred): every other wide page's hero (examples, playground, pricing). It is SPEC.md's hero size.
- **Headline** (500, clamp(1.75rem, 3.2vw, 2.375rem), 1.1, -0.03em, balanced): every homepage section heading, written as a plain sentence ending in a full stop. The closing section uses a larger step, clamp(1.9rem, 4vw, 2.75rem), and its two lines arrive through square-mark TextLoaders.
- **Lead** (400, 18.75px, 1.5, `muted`, balanced, max 26rem; 1.09375rem below 960px): the one line under the display headline. A `faint` 0.8125rem meta line (max 25rem) sits under the actions. The page-title lead is 17.5px / 1.65, max 40rem, centred.
- **Section intro** (400, 1rem, 1.65, `muted`, max 36–40rem): the paragraph under a headline.
- **Title** (600, 0.9375–1.0625rem): card and recipe titles, app-frame titles (1rem), Details claims (1rem), settings legends (0.8125rem), footer column heads (0.8125rem).
- **Body small** (400, 0.8125–0.875rem, 1.5–1.6, `muted`): card descriptions, frame content (0.875rem), table cells and frame-block heads (0.8125rem), footer copy, chat text, hints.
- **Control name** (500, 0.8125rem, `muted`): the name above a control group ("Show").
- **Figure** (500, -0.025em, tabular figures): in-frame KPI values at 1.75rem (18.75px in frames under 460px), Family tile figures at 2.25rem.
- **Small data** (0.75rem): table column heads, axis labels, KPI deltas (600), status chips (600).
- **Mono** (DM Mono 400): 0.75rem / 1.2 `muted` timing readouts ("Arrived after 1.4 s"), 0.75rem / 1.6 `faint` "uses" lines under section copy (0.75rem / 1.4 under recipes), 0.6875rem `faint` timeline ticks, 0.75–0.8125rem code.

### Named Rules
**The Sentence Heading Rule.** Headings are short sentences in Manrope 500 with no label above them. A section starts with its headline; there are no eyebrows, kickers or numbered section tags.

**The Two Weights Rule.** Use 500 for anything large (display, headlines, figures, labels) and 600 for small titles, chips, deltas and the wordmark. 700 does not appear.

## Layout

Every wide page (any page with a hero: home, examples, playground, pricing) aligns to the homepage first screen's edges. The side padding is clamp(1.25rem, 5.7vw, 82px) (82px at 1440) and the content is at most 1276px wide, applied to Starlight's content panel through `data-has-hero`. Docs pages keep Starlight's grid with a 46rem content column (about 68ch of prose).

- **Section rhythm:** clamp(4rem, 10vw, 7rem) above and below each homepage section. A section's header block is at most 40rem wide with 2.5rem below it (1.25rem for gallery sub-sections). No dividers between sections; space separates them.
- **Homepage order:** first screen, Inbox, Invoices, Activity, Family, Handoff, Playground, Details, Get started, Closing, then the site footer.
- **Page hero (non-home):** centred, max 44rem, clamp(2.5rem, 7vw, 4.5rem) above and 1rem below. The page's controls follow it centred (filter pills) or the work area starts directly under it.
- **Example sections (the split):** copy and controls on the LEFT, the live result on the RIGHT, in every section; sides never alternate. `.va-split` is `minmax(0, 0.78fr) minmax(0, 1.22fr)` with a clamp(2rem, 5vw, 4.5rem) gap, vertically centred (Handoff uses 0.9fr / 1.1fr, Get started 0.8fr / 1.2fr). Below 56rem it stacks with the controls above the result. Under the copy, `.va-controls` stacks the section's choices (a `muted` control name over its control), then the hold row (hold button and its readout), then the rest note, 0.875rem apart, starting 1.75rem below the copy; a `faint` mono "uses" line closes the column.
- **Card grids:** three columns at a 1rem gap. The Family grid's lead tile (the chart) spans two columns and two rows. Gallery tiles and recipe cards use 20px. Grids go to two columns below 64rem (recipes below 68rem) and one column below 40rem (recipes below 44rem). An opened recipe spans the whole row as `minmax(0, 24rem) minmax(0, 1fr)`: demo left, code right.
- **Tool layout (playground):** a sticky settings card beside a column holding the stage card and the code panel (19rem and 20px apart on the playground page; 17rem in the homepage section). Below 56rem it becomes one column.
- **Ruled list:** rows have 1.375rem top and bottom padding and a 1px `line` top rule. On the homepage (Details) each row is `minmax(0, 1fr) minmax(0, 24rem)`: the claim (title `minmax(10rem, 15rem)` beside its text) on the left and its proof on the right. The proof column drops under the claim below 64rem, and the claim stacks below 48rem.
- **First screen:** the copy column (headline, lead, actions, meta) on the left, vertically centred; on the right, a stage that bleeds to the window's right edge, carrying the field and the app frame. The frame is at most 1040px wide and runs 24px past the window edge so its right border never shows; the stage measures that bleed before paint so there is no horizontal scroll.

### Responsive bands
- **≥960px:** the first screen in two columns; the display clamps with the window.
- **<960px:** the first screen is one column: copy, then the stage 28px below with the frame full width and a shorter chart (clamp(120px, 26vw, 176px)).
- **Frame width (container queries):** under 720px the network control's name is kept for screen readers only; under 560px the table drops its Invoice and Project columns; under 460px the KPI strip stacks label over figure; under 340px the status column widens to fit "Overdue". The Invoices table steps down a size at the narrowest phones.
- **<68rem / <64rem:** recipe and tile grids go to two columns; the Details proof drops under its claim.
- **<56rem:** example sections, two-column sections and the playground stack, controls first.
- **<50rem:** the header drops the main nav and the theme switch, keeping the brand and search.
- **<44rem / <40rem:** grids go to one column, and the ruled list stacks. Every control in the homepage sections is at least 44px tall; the hero buttons share the row at 50px.
- **≥1920px:** content holds at 1276px centred; only the first screen's stage bleeds.

## Elevation & Depth

Depth is a hybrid of hairlines and one very soft shadow. Every card carries a 1px `line` border and `--dq-shadow`; that is the resting elevation of anything that sits on the plane. `--dq-shadow-lg` appears in two places: as the hover response on linked cards, and at rest on app frames (the first screen's revenue frame, the Inbox, Invoices and Activity frames, and the featured dashboard example). Code panels are flat: dark fill, no border, no shadow. Hold buttons carry the card shadow at rest and drop it while held. Nothing else floats; there are no shadows on other buttons, the header, the field or text.

### Shadow Vocabulary
- **Card** (`--dq-shadow`): every card at rest, hold buttons at rest, the gliding pill of a segmented track, a switch's knob.
- **Raised** (`--dq-shadow-lg`): app frames at rest, and hovered component tiles (with a 2px lift).

Exact light and dark values live in tokens.css.

### Named Rules
**The Hairline-Plus-Breath Rule.** A light card or frame is a white surface, a 1px `line` border and a soft shadow, all three, every time. Never a border alone on a card, never a shadow without the hairline, never a hard or offset shadow.

## Shapes

Radii are soft and small, from SPEC: 9px (`sm`) for buttons, hold buttons, the pause key, choice chips, nav links, segmented controls, sidebar items and demo inputs; 12px (`md`) for cards, code panels and chat bubbles; 16px (`lg`) for app frames and large containers (the closing field); fully round for filter pills, status chips and pills, switches, track bars, avatars, colour swatches, step numbers and the hold button's disc. A chat bubble drops the speaker's corner to 4px. Inner segment buttons use 6px so they nest inside the 9px control.

The recurring geometry is the mark: dots on a grid, squares in the pixel-font TextLoader, and the dash where text lines are drawn. The Quilt logo tile is a 28-unit ink square with a 7.5 radius holding four marks of radius 2.9; the bottom-right one is lit in `mark-glow`. The hold control's key is a mark too: a disc (or a ring) with a core that grows while held. The field and the seams are the mark grid at different pitches, never another pattern.

## Components

### Buttons
Quiet, softly rounded rectangular controls; the teal one is the only coloured element at rest.
- **Shape:** gently rounded (`sm`, 9px).
- **Primary:** `accent` fill, `accent-ink` text, transparent border, Manrope 500 at 0.875rem, 40px tall. On hover, 12% ink is mixed into the teal (`color-mix(in srgb, accent 88%, ink)`).
- **Secondary:** `surface` fill, 1px `line-2` border, `ink` text; the fill turns `subtle` on hover.
- **Small:** 34px tall, 0.8125rem, 0.875rem side padding. Used for in-card controls (Retry, Previous / Next, Code, Start loading / Reveal).
- **Hero size:** 52px tall, 24px side padding, 1rem text, 14px apart (50px / 16px / 10px, sharing the row, below 40rem).
- **Press:** in the homepage sections buttons sink to 0.97 scale while pressed; a disabled pager button sits at 50% opacity.
- **Text actions:** an inline teal link (500, 0.8125rem, underline offset 3px, thickening to 2px on hover) for a card's onward action. A `muted` underlined text button for a reset; it turns `ink` on hover.
- **Focus:** 2px `accent` (`--dq-focus`) outline, 2px offset, on every interactive element. Transitions use `--dq-duration-ui` on `--dq-ease-settle`.

### Hold control (hold to load)
The homepage's one interaction: press and hold (pointer, or Space / Enter) keeps a demo loading; letting go delivers. It belongs to C, "You are the network".
- **Hold button:** 44px tall, at least 13.25rem wide so a label change never shifts it, `surface` fill, a 1px border of 28% ink in `line-2` (45% on hover), 9px radius, the card shadow, Manrope 500 0.875rem. It leads with the key: a 1.75rem `ink` disc holding a `surface` core at 0.6 scale. Labels: "Hold to load", "Let go to deliver", "Hold to load again" (sections may name their action, such as "Hold to refresh").
- **Held:** the button sinks 1px, its border turns `ink`, its fill `subtle`, its shadow drops away, the core grows to 1.25, and an 8% ink fill grows across the button over the idle's four seconds.
- **Small:** 34px, at least 10.5rem, 0.8125rem, no shadow; used beside a proof in Details. On phones every hold control is 44px.
- **Readout:** beside the button, DM Mono 0.75rem tabular `muted` timing ("Arrived after 1.4 s"). Under it, "Loaders rest after four seconds." in `muted` 0.8125rem appears only when it happens (fades in, rising 3px).
- **Hold surface:** a tile's stage or a proof card can itself be held. It says so with the same key at 0.875rem (a 1.6 stroke ring at 0.4 opacity around a core that grows from 0.55 to 1) and sinks to 0.99 scale while held.
- **Natural controls:** app-like controls inside or beside a demo (filters, pages, chips, a range) still load with a natural delay, which a hold can take over.
- **Accessibility:** each hold control has a screen-reader description of what holding does and a status line; forced colours outline the held button in `Highlight`. Reduced motion drops the sink and the transitions.

### App frame
An example screen, from A ("One real screen, loading"): a white `surface` frame with a 1px `line` border, a 16px radius and the raised shadow, in Manrope 0.875rem / 1.5.
- **Bar:** at least 3.5rem tall, ruled off by a `line`: a 600 1rem title led by a neutral workspace initial (a 1.5rem `subtle` square with a `line-2` border and a `muted` letter, not the Dotquilt logo), and the screen's own controls on the right (a range, a filter).
- **Blocks:** a 0.8125rem 600 block head with a `muted` 0.75rem note ("USD, example data"), then the content; blocks are ruled from each other.
- **Foot:** at least 2.75rem, `subtle` fill, `line` top rule, `muted` 0.8125rem: an "Example data" caption and a live status on the left, the screen's controls (pager, network, pause) on the right.
- **KPI strip:** three figures in a row, each a `muted` 0.8125rem label with its delta (600, 0.75rem, in a status colour) on the label's line, over a 1.75rem tabular value rendered by a real `dotquilt-text-loader mark="square"`. The delta settles in 520ms after its figure locks.
- **Chart:** a real `dotquilt-chart-loader` in a region, handing over to a 2.4px `accent` line with round caps and joins over three `line` grid rules, ending in a `surface` node ringed in `accent`; `muted` 0.75rem axis labels below.
- **Error and empty:** the frame shows "Couldn't load revenue." with a small Retry button, and the table an empty line, when the network is Offline.

### Tables in frames
Only rows load; column heads stay put.
- The column heads live OUTSIDE the loading region, in a separate `aria-hidden` header table sharing the same `colgroup`. The real table inside the region keeps a zero-height `thead` for screen readers. So the placeholder (one `dotquilt-table-loader` row per data row, dash marks, 36px rows) and the handover cover the rows alone. This applies to the first screen's table and the Invoices section.
- Heads are 0.75rem, 28px tall; rows 36px (44px in Invoices), 0.8125rem, tabular numbers right-aligned, ruled by `line`; the first column has no left padding.
- A table body keeps a fixed number of rows' height (five in Invoices), so a short page never moves the foot. Rows that arrive on a refresh settle in one after another (fade, plus a 5px rise, a `--dq-stagger-row` apart).
- **Status chip:** fully round, 0.125rem 0.5rem, 0.75rem 600, on a status soft fill in its status colour (Paid, Sent, Open, Overdue); neutral chips are `muted` on `subtle`.

### Filters and choices
- **Filter pill:** 34px, fully round, 1px `line` border, `surface` fill, `muted` 500 0.8125rem, 6px apart and centred. When pressed (`aria-pressed`), it fills with `ink` and its text turns `surface`. The filter state is kept in the URL.
- **Choice chip (settings):** a 32px tall, 9px radius label wrapping a real radio, with a 1px `line` border, `muted` text, and an `ink` fill when checked. Chips wrap with 6px gaps.
- **Colour swatch:** a 26px circle with a 2px `surface` inset ring; the checked swatch gets a 2px `ink` border.
- **Range:** a native slider in `accent-color: accent`, with a tabular `muted` value right-aligned on the legend line.
- **Segmented control (settings):** a `surface` bar with a 1px `line` border, 3px inset and 2px gaps, holding 28px segments. The selected segment is `subtle` with `ink` text and an inset `line` ring. Each option may lead with the mark swatch it selects (5px dot, 5px square at 1.4px radius, 11×4px dash).
- **Segmented track (app frames and section controls):** a `subtle` track with a 1px `line` border and 3px inset; a `surface` pill with an inset `line` ring and the card shadow glides (320ms, ease-settle) to the checked option, whose text turns `ink`. Used for Range (7 / 30 / 90 days), Network (Fast / Slow / Offline) and Show filters. 28px segments, 44px on phones.
- **Speed choice (Handoff):** three plain choices on a `surface` bar, 1× / ½× / ⅓× (1.1 / 2.2 / 3.3 s, all under the runtime's 4 s motion limit); the chosen one fills `ink` with `surface` text.
- **Switch:** a 2.125rem round `line-2` track with a 1rem `surface` knob on the card shadow; on, the track turns `ink`. Used for "Pause motion" in Details.
- **Pause key:** a 30px square, 9px radius, `line-2` border, `surface` fill, `muted` pause / play icon (`aria-pressed`) at the end of the first screen's foot. Reduced motion hides it, since nothing loops.

### Cards / Containers
- **Corner Style:** `md` (12px).
- **Background:** `surface`.
- **Shadow Strategy:** card shadow at rest; linked tiles rise 2px into the raised shadow on hover.
- **Border:** 1px `line`.
- **Internal Padding:** 1.25rem for tiles and the settings card, 1.375rem for recipe cards, 1.5rem for stages; Family tiles 0.5rem around a held stage.
- **Stage-card anatomy (tiles and recipes):** a live loader on a stage, ruled off below by a 1px `line`, then a 600 title, one `muted` line and, on recipes, a DM Mono "uses" line. On the homepage the stage is the hold surface and the foot carries its key and readout. Recipe cards end with small buttons and a teal onward link pushed to the right. No inner frame and no screenshots.
- **Tool stage card:** a status bar (`muted` 0.8125rem live status on the left, small Start loading / primary Reveal buttons on the right) ruled off by a `line`, above a centred stage at least 22rem tall.

### Code panel
A flat `code-bg` block with a 12px radius. A tab bar sits on top (30px tabs and ghost buttons in `code-punct`; the selected tab and hover in `code-fg`), separated by a rule in `code-fg` at 12%. Below it is DM Mono 0.8125rem / 1.65 code at 1.25rem 1.375rem padding. The homepage's Details proofs are a plainer panel: 12px radius, 1rem 1.125rem padding, DM Mono 0.75rem / 1.7, no tab bar. On the gallery and homepage, code uses Starlight's code tabs, themed by the same tokens.

### Ruled list
Claims and features are a list, not cards: rows are separated by 1px `line` rules (one at the top of each row, plus a closing rule), with a 600 title and `muted` text. On the homepage (Details) each row carries its proof on the right: the first three proofs are live and held (Calm: the card is the hold surface, and past 4 s it shows "Resting"; Out of reach: a small hold button, and while held the invoice's button is inert; Reduced motion: a figure card as hold surface plus the Pause motion switch), the last three are code panels. No icons or glyphs on rows.

### Navigation
- **Header:** a `surface` bar with the Quilt tile and the "dotquilt" wordmark (600, 1.125rem, -0.025em) as a square-mark TextLoader. The links are Docs, Components, Guides, Examples, Playground and Pricing, in `muted` 500 0.875rem with a 9px radius; hover and the current page both get a `subtle` fill with `ink` text. Starlight search grows to fill the space, and the theme select sits at the end. The header's lower edge is a 9px row of paused marks (the seam).
- **Footer:** opens with the same 9px seam, then the brand with a one-line description and three link columns (600 0.8125rem heads, 0.875rem `muted` links that turn `ink` on hover), then the license line in `faint` 0.8125rem above a `line` rule. On the homepage the closing field hands straight to the footer's seam.
- **Docs sidebar:** the current page is `accent` on `accent-soft`; group labels are 0.75rem 600 `faint`, not uppercase.

### Field of marks (signature)
The world's ground ornament, built from a real `dotquilt-skeleton-block`, never an image.
- **Grid:** `--dotquilt-dot-size: 2.8px`, `--dotquilt-dot-gap: 19.6px` (22.4px pitch), `--dotquilt-color: var(--dq-ink)`, square corners (`border-radius: 0`).
- **First-screen ground:** the field at `motion="paused"` fills the stage behind the app frame, showing above it and in a band to its left. A radial mask (150% 115% at 72% 0%) steps 0.85 → 0.52 (40%) → 0.22 (72%) → transparent, so it is strongest at the top right and gone before it reaches the words; dark theme uses 1 / 0.7 / 0.32.
- **Family variant:** the chart tile's plot keeps the field (14.8px gap) behind its line at rest, fading in from the left; while the chart loads it steps aside for the live ChartLoader field.
- **Closing variant:** the same grid filling a 16px-radius container, with a radial mask that is clear behind the words and fades at the edges (transparent at 30%, 0.6 at 60%, transparent at 96%). The pointer lifts nearby marks in `ink`, never teal.
- **Seam variant:** a 9px-tall single row of default marks at `motion="paused"`, along the header's lower edge and the footer's top edge.

### Motion
- **First screen (motion allowed only):**
  - An inline script sets the frame's loaders pending before paint. The frame fades in (`--dq-duration-fade`) while rising 14px over `--dq-duration-rise` on ease-settle; the field fades in over 1600ms.
  - First load: the three figures lock at 560, 700 and 840ms, the chart hands over at 1060ms, the rows at 1300ms. A range change: 420 / 540 / 660, 820 and 1080ms. The Slow network stretches these; Offline shows the error and empty states.
  - The loop: once loaded, the frame rests about 4.2 s, then loads the next range from its placeholders (30 → 90 → 7 days), and so on. It waits while the pointer is over the frame, keyboard focus is inside it, it is off screen, the tab is hidden, the network is Offline, or the visitor has paused it. Range and network stay the visitor's to change; there is no "Load again" button.
  - Reduced motion shows the frame loaded, with no loop and no pause key. Without the components after 6 s, the data shows instead of marks.
- **Hold to load:** a held demo stays loading; the runtime's idle glow rests after its 4 s (`idleLimit` 4000ms), which the readout and rest note say. Letting go delivers through the runtime's handoff (`--dq-duration-handoff`, 1.1 s). Each demo's first load starts as it scrolls into view.
- **Section demos:** Inbox: holding sends the next quick reply and keeps the customer typing (TypingDots) until let go. Invoices: the table returns to its placeholder on a new filter; turning a page keeps the rows readable while the next ones load. Activity: holding refreshes (region state "refreshing", a thread of marks); the feed has a fixed 15.25rem height, scrolls inside with a soft bottom fade, keeps 12 items, and so never moves the page. Handoff: the chosen speed slows the handoff and a three-phase timeline fills in `ink` as it plays. Closing: the heading takes shape in square marks as it comes into view while the field joins and its glow drifts once.
- **Header arrival:** on the first visit of a session, the wordmark locks in from square marks after 1.2 s and the glow drifts once along the seam. On the homepage the header rests (the first screen is the one focal motion) and the visit counts as arrived. Later pages show it at rest.
- **Visitor-triggered handoffs elsewhere:** examples and the playground replay loaders only on request (Load again, Start loading / Reveal), using the runtime's own handoff.
- **UI transitions:** 320ms on ease-settle for background, colour, border, shadow, scale and lift. The curves and durations are SPEC's; nothing is linear or snapping, and nothing loops except the first screen under the conditions above.

## Do's and Don'ts

### Do:
- **Do** use the `--dq-*` tokens from `design/tokens.css`; when SPEC.md and this file disagree, SPEC.md wins and this file is updated.
- **Do** show real, live Dotquilt elements wherever a loader appears, inside realistic app frames, and label illustrative data as example data.
- **Do** build light cards as `surface` + 1px `line` + `--dq-shadow` at a 12px radius, app frames the same at 16px on `--dq-shadow-lg`, and separate sections with clamp(4rem, 10vw, 7rem) of space.
- **Do** keep teal to the arrived line, the primary action, inline onward links, focus and the current page (The Arrived Teal Rule); mark selection with `ink` (The Ink Selection Rule).
- **Do** put copy and controls on the left and the live result on the right in every example section, stacking controls first on narrow windows.
- **Do** let a demo be held: press and hold keeps it loading, letting go delivers, with a DM Mono readout of the timing.
- **Do** keep column heads outside a table's loading region, and give a loading list or table a fixed height so a load never moves the page.
- **Do** reuse the field at 2.8px / 19.6px in `var(--dq-ink)` under a mask when a surface needs ground ornament, and the 9px seam for horizontal edges.
- **Do** align every wide page to the clamp(1.25rem, 5.7vw, 82px) gutter and the 1276px maximum.
- **Do** keep tool and filter state in the URL, so a view can be shared.
- **Do** gate every authored motion on reduced motion before paint, keep each handoff under 4 s, and make the at-rest state the finished state.

### Don't:
- **Don't** put a label, kicker or eyebrow above a heading.
- **Don't** colour placeholders, marks in flight, cards, hold controls, selected chips or section backgrounds teal, or add a second accent hue; status colours stay inside example data.
- **Don't** use gradients, glass, coloured section bands or textures on the plane; the only pattern is the mark grid.
- **Don't** use hard, offset or dark shadows, or a light card without its hairline.
- **Don't** hard-code mark colours; use `--dq-ink`, `--dq-mark` or `--dq-mark-glow`.
- **Don't** use screenshots or static images of loaders where a live element can render.
- **Don't** decorate list rows or features with icons or glyphs; mark swatches appear only where they select a mark shape.
- **Don't** alternate the sides of example sections.
- **Don't** loop anything but the first screen, and never loop it while the visitor is pointing at it, focused in it, away from it, offline or has paused it; never animate linearly or with overshoot.
- **Don't** fabricate metrics, testimonials or logos; example values are captioned as examples.
