# Dotquilt design spec: "System, refined"

**Status:** locked by the owner on 2026-11-18. This is the reference for the visual rework (AUDIT.md Phase 4): the components' default look (4b), the docs (4c) and the website (4d). Review new visual work against this file, not against taste in the moment. Changing anything here is an owner decision.

**Source mockup:** [design/directions-v3/index.html](directions-v3/index.html) (use "Refined" on the compare switch). Earlier rounds in `design/directions/` and `design/directions-v2/` are history only.

Tokens as CSS: [tokens.css](tokens.css).

## Character

Composed and unhurried; data settles into place instead of snapping.
- **Cool greys, one accent.** A muted teal is used sparingly: primary actions, the current page, the idle glow and charts.
- **Loaders are judged in context.** The homepage and examples show them inside realistic product UI (dashboards, cards, tables, chat), not as isolated specimens.
- **Soft, not sharp.** Rounded shapes, light hairlines, gentle elevation.
- **Motion is long and eased.** Nothing quick, linear, flickering or snapping.
- **No novelty.** No metaphors, textures, mascots or display fonts.

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | #F4F5F7 | #181D25 | page canvas (dark is slate, never pure black) |
| `surface` | #FFFFFF | #1F2530 | cards, panels, nav |
| `subtle` | #F7F8FA | #252C38 | quiet fills, chips |
| `ink` | #1B2230 | #E3E7ED | primary text |
| `muted` | #5E6777 | #9CA5B3 | secondary text |
| `faint` | #8C94A2 | #747E8D | tertiary text, axis labels |
| `line` | #E7EAEF | #2B323E | hairlines |
| `line-2` | #D8DDE4 | #3A4351 | stronger dividers, table heads |
| `accent` | #2F6F74 | #84BABB | primary buttons, current nav, chart line, focus |
| `accent-ink` | #FFFFFF | #132324 | text on accent |
| `accent-soft` | #EAF2F2 | #24363A | accent backgrounds (avatars, selected) |
| `positive` / soft | #2F7656 / #EAF4EF | #7CC4A0 / #1E332A | positive deltas, status |
| `negative` | #A84A3A | #E8998A | negative deltas, errors |
| `warning` / soft | #85601E / #F8F1E3 | #DDB572 / #382F1F | warnings |
| `info` / soft | #3C5F99 / #EDF2F9 | #9DB8E8 / #243042 | informational status |

**Code blocks:**
- light-mode background #1E2430, dark-mode background #141920; foreground #E2E7EE
- keyword #9CC9CA, string #C6D6AE, type #A9C1E8, attribute #DCC9A2, punctuation #8892A2 (#7A8494 in dark)

## Marks (the loader dots)

- **Default mark:** a round dot, 4.4 px, on a 9 px grid (4.6 px gap).
- **Colour:**
  - light: slate #6E7889 at 37% resting opacity, up to 90% at peak
  - dark: #8E99AB at 44% resting, up to 92%
  - Placeholders must stay clearly visible on both themes. Treat these opacities as minimums when tuning.
- **Glow accent:** #4F8F93 (light) / #8DC4C5 (dark), only inside the idle glow.
- **Alternative marks** are a component option with the same positions and motion. Only the drawn shape and spacing change.
  - dash: 9.4 × 3.4 px, rounded caps, 13 × 9.5 px pitch. Best for text lines and table rows; on charts it follows the line. Avoid it for TextLoader glyphs and large fields, where it reads as hatching.
  - square: 4 × 4 px, 1.1 px corner radius, 8.5 px pitch. Crisp at small sizes; makes a clean pixel font for TextLoader.
- **Only whole marks** (2026-11-19). Blocks spread whole marks to their edges; lines end on their last whole mark (CSS `round()`, so older browsers keep the cut mark); a circle fades over its last few pixels, so marks its edge cuts read as soft, not as slivers.
- **TextLoader glyphs** sit on a 5 × 7 matrix with a square pitch that follows the line height, centred in each character, with marks about 70% of the pitch: distinct, LED-like marks that never touch. Squares are two thirds of the pitch; dashes span nearly all of it, like scanlines.
- Marks use only the text-adjacent slate plus the soft glow, so they sit inside any app without imposing a brand colour. Apps can override all of this through the component CSS variables.

## Typography

- **Faces:**
  - Manrope (Google Fonts, 400–700) for display and body.
  - DM Mono (400/500) for code, component names and keyboard hints.
- **Display headings:** weight 500, letter-spacing −0.03em, line-height 1.1. Hero is clamp(2.2rem, 4.6vw, 3.4rem); docs H1 is 34 px. The homepage's first screen is larger: 72 px at line-height 1 on wide screens (owner's pick, 2026-11-19).
- **Section headings and titles:** weight 600.
- **Large numbers (KPIs, TextLoader content):** weight 500, letter-spacing −0.025em, tabular figures.
- **Body:** 14.5 px / 1.65 in UI, 15 px in docs prose, 17.5 px lead text. Measure about 68ch.

## Shape, space, elevation

- **Radii:** 9 px for controls, 12 px for cards and panels, 16 px for large containers. Pills and avatars are fully round.
- **Control heights:** 34 px small, 40 px default, 44 px large.
- **Hairlines:** 1 px `line`; `line-2` only where hierarchy needs it.
- **Shadows:** soft and large-radius, never hard.
  - card: `0 1px 2px rgba(27,34,48,.04), 0 8px 24px -14px rgba(27,34,48,.14)`
  - raised: `0 2px 4px rgba(27,34,48,.03), 0 28px 56px -30px rgba(27,34,48,.22)`
  - dark mode uses the same shapes with rgba(6,9,15,…) at higher alpha (see tokens.css)
- **Page width:** 1280 px maximum, with a 16 px minimum side gutter.

## Motion

**Curves:**
- **Settle** `cubic-bezier(.22, 1, .36, 1)`: content entering, UI transitions, panels and tabs. Long tail, no overshoot.
- **Fade** `cubic-bezier(.33, 0, .2, 1)`: opacity of revealed content.
- **Sine in-out:** marks, the idle glow and chart glides.

**Durations:**
- UI transitions: 320 ms.
- Handoff total: 1.1 s.
- Content fade-in: 700 ms.
- Content rise: 910 ms (1.3× the fade).
- Row stagger 80 ms, cell stagger 28 ms. Staggers are capped so the whole handoff stays within its total.

**Idle (pending):** a soft glow drifts across each placeholder every 2.8 s on a sine curve, with a wide Gaussian edge so marks brighten and dim gradually. The whole field also breathes ±7% every 3.2 s. There are no hard bands and no on/off flicker.

**Handoff (ready): take shape, then hand over** (owner's direction, 2026-11-19: every reveal at the level of the chart's):
- **Take shape (first ~55%).** Each mark travels in a wave, on the sine curve, to where the real content is: skeleton lines grow or shrink to the length and place of each real text line (two rows of marks per line, more for large figures), blocks and circles reshape to the real image or avatar, typing dots unroll into the message's lines, a TableLoader's marks gather into each cell's text, and a placeholder card or bubble grows to the real one's width and height (settle curve). Marks the content doesn't need fold into the nearest line and fade.
- **Lit while travelling.** A moving mark takes the teal accent, as if the idle glow carried it, and settles to ink (62%) on arrival. Teal stays brief and sparing.
- **Hand over (from ~46%).** The content wipes in along a soft 36 px front at the idle glow's 104° angle, so lower lines follow a little later; right-to-left text wipes from the right. Marks leave exactly where the front passes them, and the placeholder's own shapes (a bubble) give way along the same front.
- Total 1.1 s, as before. It must never jump at the end.
- `dissolve()` (marks dim, shrink and drift up; content rises 5 px as a 2 px blur clears) stays available as an alternative.

**Chart:** the field glides onto the real line over about 570 ms, then the line draws in over about 570 ms. This is the reference the other handoffs follow.

**TextLoader:** while pending, characters cross-fade every 280 ms. On handoff the dot-matrix marks slide into the real characters' shapes, lit while they travel, then the value wipes in left to right as they leave.

**Pointer lift (opt-in, `pointer-response="lift"`):** on devices with a fine pointer, the marks within 56 px of the pointer light up in the accent, strongest at the pointer and fading linearly to nothing at the edge, over the resting marks. Marks never move or grow. Every loader draws it the same way (2026-11-19).

**Reduced motion / pause:**
- No idle glow or breathing.
- The handoff becomes a 240 ms fade with no rise or blur.
- The visitor's pause setting has the same effect.
- The runtime's existing reduced-motion and pause behaviour stays.

## Website and docs

- **Homepage (owner's pick, 2026-11-19: "The field becomes the page"):** beside the headline and actions, a field of marks rises into a solid teal chart line, and three metric cards below it hand over from square marks. Teal appears only on the arrived line and the primary action. The live dashboard moved to the examples page.
- **Docs:** left navigation, a reading column of about 68ch, an on-page table of contents and a live preview with Start loading / Reveal. Code tabs cover React and native. API tables list type, default and description per prop.
- **Copy:** plain user-facing language only. No milestones, freezes or "provisional" wording.
- **Themes:** light and dark at parity, following the system setting, with a manual switch.
- **Dependencies:** Google Fonts are the only external dependency.

## How marks map onto the runtime (decided in 4b, 2026-11-19)

The defaults live in `packages/core/src/internal/marks.ts`; each family adopts them as its 4b slice lands (see AUDIT.md). Apps override them with these custom properties:

| Property | Default | Notes |
| --- | --- | --- |
| `--dotquilt-dot-size` | 4.4px | mark diameter |
| `--dotquilt-dot-gap` | 4.6px | space between marks; pitch = size + gap = 9 px |
| `--dotquilt-color` | `light-dark(#6E7889, #A3AFC2)` | resting mark colour |
| `--dotquilt-accent-color` | `light-dark(#4F8F93, #8DC4C5)` | the idle glow |

- **Theme switching:** colours follow the page's `color-scheme`. An app with a dark theme sets `color-scheme: dark` on it (or on the loaders) to get the dark marks.
- **One resting opacity:** CSS can't switch a number between themes, so both use 37%. The dark mark #A3AFC2 at 37% matches #8E99AB at 44% on the dark surface. The glow peaks at 90% in both.
- **Lines:** a line placeholder (SkeletonLine and each SkeletonText line) is two rows of marks tall, 18 px by default.
- **Alternative marks:** `mark="dash"` or `mark="square"` draws the shapes above at their fixed size and pitch. The size and gap properties apply to dots only. Lines stay two rows tall: 17 px with squares, 19 px with dashes. TypingDots squares are 90% of the dot size, and dashes are 80% of it tall and 2.7 times as wide.

## Brand (decided by the owner, 2026-11-19)

- **Logo:** "Quilt", a rounded ink tile of four marks with one lit in the glow colour, beside the lowercase wordmark "dotquilt" (Manrope 600, −0.025em). The tile follows the theme's ink and glow colours; the favicon is the same tile.
- **Header arrival:** on a first visit the wordmark is a TextLoader in square marks that takes the name's shape and hands over to it, and the glow drifts once along the row of marks under the header. Later pages and reduced motion show it at rest.

## Open details (decide during 4b–4d, then record here)

- Spacing scale and the exact docs grid.
- Icon set.
- Default mark per component, if it should differ from the global dot (e.g. dash for SkeletonText and TableLoader).
