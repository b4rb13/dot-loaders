---
name: Dotquilt Guide and Workbench
description: Quiet documentation and controls that leave the real loading handoff visible.
colors:
  paper: "#f8f8f4"
  ink: "#252a24"
  muted: "#586154"
  rule: "#d7dcd2"
  accent: "#3e573c"
  soft: "#eaf0e5"
  content-ink: "#475342"
  white: "#fff"
  control-hover-border: "#82947a"
  control-pressed: "#dfe8d9"
  accent-pressed: "#2d432b"
  selection: "#d6e3cd"
  inline-code: "#e9ede4"
  code-surface: "#eff1ea"
  code-scrollbar: "#8a9781"
  preview-heading: "#f0f2eb"
  preview-dots: "#61795a"
  docs-paper: "#080808"
  docs-ink: "#f1f1f0"
  docs-muted: "#a9a9a9"
  docs-rule: "#343434"
  docs-accent: "#f1f1f0"
  docs-soft: "#191919"
  docs-content: "#c7c7c7"
  docs-specimen: "#101010"
  docs-control-border: "#686868"
  docs-control-hover: "#888"
  docs-control-pressed: "#292929"
  docs-primary-hover: "#d8d8d8"
  docs-selection: "#ddd"
  docs-inline-code: "#242424"
  docs-code-surface: "#161616"
  docs-scrollbar: "#777"
  docs-preview-dots: "#b6b6b6"
  docs-preview-accent: "#f1f1f0"
  homepage-paper: "#080808"
  homepage-ink: "#f1f1f0"
  homepage-muted: "#a9a9a9"
  homepage-rule: "#343434"
  homepage-accent: "#f1f1f0"
  homepage-soft: "#191919"
  homepage-band: "#161616"
  homepage-navigation: "#b6b6b6"
  homepage-secondary: "#c7c7c7"
  homepage-white: "#fff"
  homepage-primary-hover: "#d8d8d8"
  homepage-selection: "#ddd"
  homepage-control-rule: "#626262"
  homepage-sample: "#e0e0e0"
typography:
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "2.9rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.65
  lead:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.2rem"
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.82rem"
    lineHeight: 1.65
  code:
    fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace'
    fontSize: "0.84rem"
    lineHeight: 1.7
  brand:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.65
    letterSpacing: "-0.02em"
  homepage-display:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "clamp(58px, 4.62vw, 74px)"
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: "-0.025em"
  homepage-headline:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "clamp(38px, 4vw, 60px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  homepage-section-title:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  homepage-body:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "18px"
    lineHeight: 1.65
  homepage-lead:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "22px"
    lineHeight: 1.5
  homepage-label:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "13px"
    lineHeight: 1.65
  homepage-action:
    fontFamily: '"Zalando Sans", sans-serif'
    fontSize: "17px"
    lineHeight: 1.65
  homepage-specimen:
    fontFamily: '"Gallery Punctuation", "Zalando Sans", sans-serif'
    fontSize: "30.6cqw"
    fontWeight: 700
    lineHeight: 0.85
rounded:
  inline-code: "3px"
  control: "6px"
  preview: "8px"
  homepage-action: "7px"
  homepage-replay: "24px"
  homepage-flat: "0"
spacing:
  "0.4": "0.4rem"
  "0.5": "0.5rem"
  "0.7": "0.7rem"
  "0.8": "0.8rem"
  "1": "1rem"
  "1.25": "1.25rem"
  "2": "2rem"
  "3": "3rem"
  homepage-icon-gap: "10px"
  homepage-action-gap: "14px"
  homepage-pair-gap: "26px"
  homepage-header-gap: "44px"
  homepage-mobile-gutter: "24px"
  homepage-desktop-gutter: "5.2%"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  button-hover:
    backgroundColor: "{colors.soft}"
  button-active:
    backgroundColor: "{colors.control-pressed}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-pressed}"
    textColor: "{colors.white}"
  select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  preview:
    backgroundColor: "{colors.white}"
    rounded: "0 0 8px 8px"
    padding: "2rem"
  preview-heading:
    backgroundColor: "{colors.preview-heading}"
    textColor: "{colors.muted}"
    rounded: "8px 8px 0 0"
    padding: "0.7rem 1.25rem"
  code-block:
    backgroundColor: "{colors.code-surface}"
    typography: "{typography.code}"
    padding: "1.15rem"
  notice:
    backgroundColor: "{colors.soft}"
    padding: "1rem"
  docs-button:
    backgroundColor: "{colors.docs-paper}"
    textColor: "{colors.docs-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  docs-button-hover:
    backgroundColor: "{colors.docs-soft}"
  docs-button-active:
    backgroundColor: "{colors.docs-control-pressed}"
  docs-button-primary:
    backgroundColor: "{colors.docs-accent}"
    textColor: "{colors.docs-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  docs-button-primary-hover:
    backgroundColor: "{colors.docs-primary-hover}"
    textColor: "{colors.docs-paper}"
  docs-select:
    backgroundColor: "{colors.docs-paper}"
    textColor: "{colors.docs-ink}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.85rem"
  docs-preview:
    backgroundColor: "{colors.docs-specimen}"
    textColor: "{colors.docs-ink}"
    rounded: "0 0 8px 8px"
    padding: "2rem"
  docs-preview-heading:
    backgroundColor: "{colors.docs-soft}"
    textColor: "{colors.docs-muted}"
    rounded: "8px 8px 0 0"
    padding: "0.7rem 1.25rem"
  docs-code-block:
    backgroundColor: "{colors.docs-code-surface}"
    typography: "{typography.code}"
    padding: "1.15rem"
  docs-notice:
    backgroundColor: "{colors.docs-soft}"
    padding: "1rem"
  homepage-primary:
    backgroundColor: "{colors.homepage-ink}"
    textColor: "{colors.homepage-paper}"
    typography: "{typography.homepage-action}"
    rounded: "{rounded.homepage-action}"
    padding: "10px 22px"
  homepage-primary-hover:
    backgroundColor: "{colors.homepage-primary-hover}"
    textColor: "{colors.homepage-paper}"
  homepage-replay:
    backgroundColor: "transparent"
    textColor: "{colors.homepage-ink}"
    rounded: "{rounded.homepage-replay}"
    padding: "3px 14px"
  homepage-replay-hover:
    backgroundColor: "{colors.homepage-soft}"
  homepage-docs:
    textColor: "{colors.homepage-secondary}"
    typography: "{typography.homepage-action}"
    padding: "12px 0"
  homepage-band:
    backgroundColor: "{colors.homepage-band}"
    rounded: "{rounded.homepage-flat}"
    padding: "34px 5.2% 32px"
  homepage-example-play:
    backgroundColor: "transparent"
    textColor: "{colors.homepage-muted}"
    typography: "{typography.homepage-label}"
    rounded: "{rounded.homepage-flat}"
    padding: "0"
---

# Design System: Dotquilt Guide and Workbench

## Overview

This record preserves the original Guide/Workbench foundation and two scoped appearances. Unprefixed frontmatter tokens retain the warm-paper foundation in `app/globals.css`; `docs-` tokens record the current default monochrome appearance of `/docs`, its component references and `/playground`, including component playgrounds. The `homepage-` tokens and subsections apply only to the Dot Gallery at `/`. The original foundation extraction below predates the Quickstart route move; its original values, descriptive decisions and build provenance are retained. The owner-authorized docs palette extension does not carry homepage typography or composition into the Guide/Workbench.

**Creative North Star: "Guide and Workbench"**

Near-black paper, near-white type, neutral states and thin rules support a quiet technical reading surface. System typography keeps the Guide familiar; nearby controls and visible code make the Workbench practical. The package's real idle-to-content handoff provides the authored motion.

This is a scan of the implemented private M5 foundation with its owner-authorized 2026-10-22 monochrome palette extension. It records existing choices rather than establishing a new visual identity. The original warm-paper, charcoal and sage values remain as foundation/fallback tokens and historical extraction; the current dark roles come from the scoped stylesheet and the appended owner direction in `surface-brief.md` and `catalog-brief.md`. System typography, layout, controls and motion remain the incumbent Guide/Workbench treatment.

**Key Characteristics:**

- Readable articles with compact navigation and a restrained type hierarchy.
- Flat surfaces separated by rules, spacing and subtle tones.
- Native controls with clear hover, current-page and keyboard-focus states.
- Still website chrome around a real, explicitly operated package preview.

Extraction provenance, relative to this app: [app/globals.css](app/globals.css) supplies the authored tokens and responsive/state rules; [components/shell.tsx](components/shell.tsx) supplies the navigation and reading frame; [components/workbench.tsx](components/workbench.tsx) supplies the real preview, settings and code disclosures; [components/motion.tsx](components/motion.tsx) supplies visitor pause authority; [app/layout.tsx](app/layout.tsx), [app/page.tsx](app/page.tsx) and [app/playground/page.tsx](app/playground/page.tsx) supply the skip link and Guide/Workbench composition. [PRODUCT.md](PRODUCT.md) and [surface-brief.md](surface-brief.md) establish the existing scope and visual authority. The extracted declarations were cross-checked against `.next/static/css/367389ab6a141eeb.css`; generated filenames are build-specific and are not the source of truth. There is no separate Tailwind configuration, theme object or token file in this app. Tailwind provides reset/utilities; the unlayered authored stylesheet determines the documented body and component styling.

Current palette provenance: [app/docs-theme.css](app/docs-theme.css), imported after `globals.css` and `catalog.css` by [app/layout.tsx](app/layout.tsx), applies only when the document contains the shared page grid. Its root palette selector is `:root:has(.page-grid)` and its component rules use `body:has(.page-grid)`, inside `@media (forced-colors: none)`. This is the default static CSS appearance before JavaScript and under either OS color preference; no theme toggle or theme persistence is introduced. If that stylesheet or selector is unavailable, the retained foundation supplies the fallback. Forced colors exclude the dark override and retain the existing system-color rules. The homepage has no shared page grid and keeps its separate CSS/font authority.

### Homepage: The Dot Gallery

**Creative North Star: "The Dot Gallery"**

An elegant black, white and gray field gives a dot-built word room to become real content. Neutral grotesk lettering, precise circular dots, quiet rules and a pale primary action carry the owner-approved world. Flat continuous bands and generous space keep the specimens legible; the surrounding chrome stays still.

This is a scoped scan of the implemented homepage, grounded in the selected first monochrome concept, not a replacement of the Guide/Workbench record. The owner selected “i like first one, 'dot gallery'” on 2026-10-21; the approved visual authority is `.impeccable/mocks/decision/homepage-dark-gallery.png` (surface seed `d3c6befc`). Surface strategy and composition remain in `homepage-brief.md` and the registered surface brief.

**Key Characteristics:**

- A neutral black/white/gray palette with tonal bands and thin rules.
- Local Zalando Sans for homepage lettering, with a period-only face for the round terminal mark.
- Circular code-native geometry and a bounded dot-to-content specimen.
- Quiet links and controls around explicitly replayed package behavior.

Extraction sources, relative to this app: `app/homepage.css`; `components/gallery-home.tsx`, `gallery-demos.tsx`, `gallery-art.tsx` and `motion.tsx`; `lib/gallery-animation.ts` and `gallery-dots.json`; and `app/page.tsx`. The current source and `.impeccable/review/comp-native.png` were inspected after the terminal-period correction. The screenshot is review evidence, not a shipped raster plate. The source paths and hashes are retained in the sidecar. The existing Guide's `app/globals.css` remains its source of truth.

## Colors

The current docs/playground palette is monochrome. The warm neutrals and single sage accent below preserve the original foundation/fallback; `docs-` roles supersede their appearance on the shared Guide/Workbench pages outside forced colors. Frontmatter values are normative; this prose describes their roles.

### Primary

- **Sage** (`accent`): primary loading action, brand dots, active navigation, hover links, focus outlines and feedback.
- **Deep sage** (`accent-pressed`): the primary action's hover and pressed background.
- **Preview sage** (`preview-dots`): the actual loading region's `--dotquilt-color` in this example; it is a caller-owned preview setting, not a runtime theme change.

### Neutral

- **Warm paper** (`paper`): page and default control background.
- **Charcoal** (`ink`): main text and default control labels.
- **Muted olive** (`muted`): navigation group labels, captions, status and private-version information.
- **Reading olive** (`content-ink`): lead and illustrative article text.
- **Quiet rule** (`rule`): borders, dividers and the contents rail.
- **Soft sage** (`soft`): hovered controls, pressed pause control and notices.
- **White** (`white`): preview canvas and primary action text.
- The remaining extracted colors serve specific hover/pressed, selection, code or preview-heading treatments. They are not a secondary palette or a tonal scale.

**The One Accent Rule.** In the retained light foundation/fallback, reuse sage for existing action and state roles. Do not infer another brand accent from the utility surface colors.

### Docs and playground: default monochrome roles

- **Reading black** (`docs-paper`) and **near-white ink** (`docs-ink`): the page/control field and main text. **Pale action** (`docs-accent`) supplies brand dots, current navigation, focus and the primary action; primary action text uses `docs-paper`.
- **Readable gray** (`docs-muted`) and **secondary reading gray** (`docs-content`): metadata, placeholders and table captions; lead and preview article copy respectively.
- **Graphite rule** (`docs-rule`) and **soft graphite** (`docs-soft`): separators, disabled boundaries, notices, preview headings and hover/pause surfaces.
- **Specimen black** (`docs-specimen`), **code graphite** (`docs-code-surface`) and **inline-code graphite** (`docs-inline-code`): distinct readable specimen and code fields without elevation.
- **Control boundary** (`docs-control-border`), **hover boundary** (`docs-control-hover`), **pressed graphite** (`docs-control-pressed`) and **primary hover gray** (`docs-primary-hover`): enabled control boundaries and action feedback.
- **Selection gray** (`docs-selection`) and **scrollbar gray** (`docs-scrollbar`): selected text with dark ink and scrollbars on page/code fields.
- **Specimen gray** (`docs-preview-dots`) and **specimen near white** (`docs-preview-accent`): caller-owned package preview color properties; these change website specimens only, not the frozen runtime theme.

**The Docs Monochrome Rule.** Use the scoped neutral palette for docs and playground, including static HTML under an OS light preference; let forced colors retain system authority. Preserve the foundation fallback and the homepage's separate typography and composition.

### Homepage: monochrome roles

Frontmatter keys beginning `homepage-` preserve the neutral source values. `homepage-paper` is the near-black canvas; `homepage-ink` is the main lettering and primary action fill. `homepage-muted` carries explanations and captions; `homepage-navigation` and `homepage-secondary` support navigation and secondary controls. `homepage-rule` divides flat regions; `homepage-band` is the continuous specimen/closing field; `homepage-soft` is the replay hover surface. The white, sample, hover, selection and control-rule tokens describe their observed states, not additional brand accents. Homepage custom properties are scoped to the homepage root; their documentation keys are prefixed to avoid changing the incumbent light system.

**The Homepage Monochrome Rule.** Keep the homepage within the observed neutral black/white/gray world; do not import the Guide's sage action color into it.

## Typography

**Display and body font:** `system-ui, sans-serif`.

**Code font:** `ui-monospace, "SFMono-Regular", Consolas, monospace`; the manual-copy textarea uses the shorter `ui-monospace, monospace` stack.

The system stack is the sanctioned treatment for this Read/Operate slice. Headings are compact and slightly tightened; prose has a relaxed line height. Sizes are assigned by role rather than a uniform mathematical scale.

- **Display:** page heading; balanced wrapping and the frontmatter display role. At the narrow breakpoint it becomes (2.1rem).
- **Headline:** section heading; at the narrow breakpoint it becomes (1.3rem).
- **Title:** preview article heading.
- **Body:** reading text with a maximum measure of (72ch).
- **Lead:** introduction, using `docs-content` in the current scoped palette and `content-ink` in the foundation fallback; becomes (1.08rem) on narrow layouts.
- **Label:** side rails, captions and the motion control. Primary navigation is (0.9rem); preview/version metadata is (0.75rem). Metadata does not need a display weight.
- **Code:** block code uses the frontmatter role; inline code uses (0.83em). Keep long code inside its scrollable panel, while inline code may wrap anywhere.

### Homepage: local grotesk and round punctuation

Homepage text uses the self-hosted variable **Zalando Sans** face (normal, weights 200–900, `font-display: swap`) with a sans-serif fallback. Both the headline and body inherit this face only inside the homepage. The real semantic `ready.` target uses the specimen token's font stack: **Gallery Punctuation** is an alias for self-hosted Alef Bold, constrained by `unicode-range: U+002E` to the terminal period. All letters remain Zalando Sans. This narrow punctuation treatment preserves the approved circular terminal silhouette in both the static lattice and real native reveal.

Fonts and licenses are `public/fonts/ZalandoSans-Variable.ttf`, `OFL-ZalandoSans.txt`, `Alef-Bold.ttf` and `OFL-Alef.txt`. These are local source assets, not network font dependencies. The 1,225-point font-outline lattice is static bounded data in `lib/gallery-dots.json`; it is not a raster word image or an alternate runtime renderer.

The display token records the wide-desktop override. The base heading is (71px), becomes `clamp(42px, 4.62vw, 71px)` at the intermediate breakpoint, and becomes `clamp(36px, 7.2vw, 50px)` with line height (1.15) on mobile. Body explanation uses the homepage-body role; introductory copy uses the lead role, with separate responsive values in Layout. Captions remain subordinate; the specimen's type scales to its own container rather than the viewport.

**The Homepage Round Terminal Rule.** Keep the terminal period circular in both the dot specimen and semantic content; the punctuation-only face must not become the homepage body or display face.

## Layout

The shared Guide/Workbench shell is centered with a maximum width of (1440px). Desktop horizontal padding is (3rem). Its three columns are a (170px) documentation rail, a flexible article capped at (750px), and a (150px) contents rail, with a (3rem) gap. At widths of at least (1600px), the gap increases to (4rem).

At widths up to (1200px), the contents rail disappears and the grid becomes a (150px) navigation rail beside a flexible article, with a (2rem) gap. At widths up to (800px), the layout becomes one column with (1.25rem) side gutters. Desktop documentation navigation gives way to a native collapsible disclosure; the primary links wrap onto their own header row. The pause button stays in the header. Footer content stacks at this breakpoint.

The Guide leads with reading and setup; the playground brings the same live preview and controls forward. Both routes currently share the same grid. The playground's `workbench-layout` marker has no separate CSS rule and must not be read as an implemented wider layout.

Sections use (3.5rem) top separation, reducing to (2.8rem) on narrow screens. The preview has (2rem) padding and a (235px) minimum height; narrow screens use (1.2rem) padding and a (270px) minimum height so the illustrative content can reflow. Settings wrap, then use full-width labels/selects on narrow screens. Code stays below the controls. The excerpt disclosure opens after enhancement at widths of at least (801px); native disclosures remain usable without enhancement.

Spacing frontmatter lists reused observed rem values, keyed by their numeric value. It does not establish a new named spacing scale. Preserve `min-width: 0`, wrapping controls and local horizontal code scrolling when extending either surface.

### Homepage: responsive boundaries

The homepage frame, expression section and footer cap at (1536px). Header/footer gutters are (5.2%); expression/closing sections use (7%). The specimen caps at (1320px) and uses an inline-size container. At widths of at least (1200px), headline/header/specimen dimensions follow bounded viewport clamps; the specimen uses (23.44vw) height, capped at (375px). The specimen/control band leads into one continuous lower field rather than detached cards.

At widths up to (1100px), the specimen uses `calc(100% - 80px)` width and (32vw) height with a (250px) minimum. The introduction spans both columns above the paired chart/table specimens. At widths up to (700px), the header wraps navigation into a full row and omits its redundant private label; the footer retains the private-preview statement. Content stacks in reading order with (24px) gutters. The specimen uses `calc(100% - 34px)`, (38vw) height and a (165px) minimum; action and phase controls wrap. Chart/table pairs remain two specimens side by side within each stacked group, each with a (140px) stage. Expression and closing sections become single-column. The lead is (19px) at the intermediate breakpoint and (17px) on mobile; expression body becomes (16px).

The wide-desktop primary target is clamped to a (44–54px) minimum height. Mobile primary/replay/example controls use minimum heights of (48px), (44px) and (44px); desktop replay and example-caption actions retain the observed compact (36px) and (30px) minima. These are the shipped pattern's dimensions, not a blanket authorization for smaller future controls.

## Elevation & Depth

The interface is flat: it uses tonal layering and one-pixel rules rather than ambient or raised shadows. The only authored `box-shadow` is a one-pixel line under the current primary navigation link (`0 1px var(--accent)`); it is a state indicator, not an elevation token. The current preview uses a specimen-black canvas and soft-graphite heading strip; the original white canvas and light heading strip remain in the foundation fallback. Their shared border establishes the boundary. Notices and code use quiet background changes.

### Homepage: flat tonal fields

Homepage depth comes from near-black and graphite fields, one-pixel rules and contrast; there are no authored homepage box shadows, glows, gradients or decorative blur. The continuous specimen band is a layout boundary rather than a floating card. A light focus outline (2px, offset 5px) supplies keyboard state; forced-colors mode uses `Highlight` for that outline.

## Shapes

Controls have gently curved corners using `rounded.control`; inline code uses `rounded.inline-code`. The preview header and canvas share `rounded.preview` at their exposed outer corners, with square adjoining corners. Code blocks, notices and ruled disclosures remain square. Keep the nine-dot brand mark as an inline SVG with circular dots rather than an image dependency.

### Homepage: dots and restrained controls

The signature geometry is circular: the nine-dot inline brand, font-outline dot lattice, chart point cloud, table dot rows and terminal period. Primary actions have the homepage action radius; replay has the pill radius. Caption actions, bands and dividers stay square/flat. The point cloud is bounded authored geometry derived from the specimen, not an unrelated particle field.

## Components

The foundation descriptions below retain their original extraction scope and geometry. The current docs/playground palette and state overrides are recorded under “Docs and playground: current appearance”; this palette handoff does not refresh unrelated historical component inventory.

### Buttons

Default buttons use paper, charcoal, a rule border and the shared control radius/padding. Their minimum height is (44px). Hover uses the soft surface and `control-hover-border`; pressed state uses `control-pressed`. The primary loading action uses sage and white, deepening on hover or press. The primary hover retains the shared hover border treatment. The small copy button is a deliberate observed exception with a (36px) minimum height and (0.75rem) type.

The motion button exposes pause state through `aria-pressed`, its label and a soft pressed surface. Pause preference is stored when available and remains session-local if storage fails. This control passes authority into the package; it does not animate the site chrome.

### Inputs / Fields

Settings use labelled native selects, with a (150px) minimum width and the default control styling. There is no custom select menu, general text-input component, error palette or disabled-state system in this slice. Clipboard failure exposes a labelled, read-only textarea with a paper background, rule border, mono text and (8rem) minimum height; focusing it selects its text for manual copying.

### Navigation

The header uses text links and the compact nine-dot mark. The current page has sage text and the one-pixel line; `aria-current="page"` supplies the semantic state. Side and contents links are plain at rest and underline on hover. Narrow documentation navigation uses native `details`/`summary`. The skip link becomes visible on focus and leads to the main content.

### Preview / Containers

The live preview is the defining container, not a generic card system. Its heading and canvas share one border boundary. Loading/reveal controls sit immediately below, followed by settings and code. Status and captions use muted text; feedback has a reserved line and `aria-live="polite"`. Notices use the soft surface and `role="status"` when reporting parsed-setting recovery.

### Code / Disclosures

Code excerpts and complete files use native disclosures with thin top/bottom rules. Summaries have a (44px) minimum height and a medium weight (550). The copy action sits alongside the excerpt summary. Code panels scroll locally and are keyboard-focusable; manual-copy feedback remains adjacent. Complete examples are separate from the short excerpt and retain their setup context.

### Focus and forced colors

Every focus-visible target receives a sage outline (2px) offset by (4px). In forced-colors mode, buttons, selects and the preview use `CanvasText` borders; the primary button uses `ButtonFace` and `ButtonText`; focus outlines use `Highlight`. Preserve these system-color semantics and native control/disclosure behavior when extending components.

### Docs and playground: current appearance

Existing buttons and native fields use the dark paper/near-white pair and explicit control-boundary token. Enabled button/select hover uses the hover boundary; default pressed buttons use pressed graphite. The enabled primary action uses pale action with dark text, retaining dark text on its neutral hover/pressed fill. Disabled Workbench buttons/selects/inputs retain the existing dashed rule border, dark paper and muted text; they do not take enabled hover/pressed colors. Field placeholders keep muted gray at full opacity. Invalid catalog inputs retain the existing current-color outline (2px, offset 2px), with no new error hue.

Current navigation, brand and feedback inherit pale action instead of sage. Focus remains an outline (2px, offset 4px), now near white. Preview and catalog specimen fields use specimen black; lead/article copy, semantic table rules/captions, code fields, manual-copy text and caller-owned dots use their scoped neutral roles. Dimensions, native control behavior, typography, dot/reveal motion and pause authority remain unchanged.

These styles are available in static HTML without JavaScript; this documents palette availability only, not completion of no-JavaScript enhancement/admission checks. Forced colors exclude the scoped palette: existing `Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `GrayText` and `Highlight` rules remain authoritative. The sidecar's current component snippets are static visual samples, not behavioral examples or qualification evidence. M2 optimization stays paused; M2/M4/#34 remain open, renderers provisional and npm publishing disabled.

### Package-owned handoff

The preview imports real `LoadingRegion` and `SkeletonText` React package entries and external package CSS. It opens ready/static. A new explicit cycle and pending state start loading; readiness is set by the application. Configuration changes retain the content nodes. Global visitor pause is delivered as `motion="paused"`; otherwise `motion="system"` leaves system preferences authoritative. The existing package contract bounds moving activity, including the documented four-second idle limit.

**The Still Chrome Rule.** Add no authored website-chrome animation or transition to this foundation. The real package handoff is its moving moment; do not simulate it in documentation snippets or replace package behavior with a website animation.

The sidecar's preview snippet is a static specimen of the container. It has no package runtime, readiness behavior or animation; operational examples remain in the app. This design handoff does not qualify the library's performance, browser floor, manual accessibility or release readiness.

### Homepage: actions and navigation

The pale **Try the playground** link is the primary action and repeats at the close. It uses the homepage primary component token, dark text, a small directional arrow and a neutral gray hover fill. **Read the docs** stays secondary and persistently underlined. Header/footer navigation is plain at rest and underlines on hover. Replay uses an inline SVG play icon, an outline pill and a compact phase list with `aria-current="step"`; example replay actions sit visibly in their captions. No additional card, chip, input or dialog system is inferred from this homepage.

### Homepage: still sample and real replay

The hero's server-rendered SVG word is an accessible-tree-hidden visual fallback; its native TextLoader replaces that visual after fonts settle. Chart/table initial point cloud and dot-row samples are website-owned, code-native still illustrations. They are explicitly labelled illustrative and hidden from the accessibility tree; their real mounted LoadingRegion/ChartLoader/TableLoader demonstrations take over on explicit replay. Reference chart/table results remain actual semantic SVG/table content. Sidecar specimens are static visual samples with no package runtime or working replay; the live app is the behavioral source of truth.

The shared motion provider owns the visitor's stored pause setting (session-local when storage fails) and follows `prefers-reduced-motion` changes. Before preference readiness, under pause/reduction, or for an unplayed shared URL, native motion is paused. Explicit replay starts a new cycle; application readiness is scheduled only while that replay is pending (850ms when moving), then the homepage text handoff lasts (1100ms). Terminal callbacks are filtered to the current cycle, so completed/obsolete transitions cannot manufacture a later phase. Chart uses public scan/morph-wipe recipes; table uses public type-on/rows recipes. The homepage-only text recipe uses public `defineAnimation`, bounded drawing commands and the existing engine; the lattice is data. No website frame loop or independent animation runtime is introduced.

**The Homepage Motion Authority Rule.** Visitor pause, system reduction, package visibility/resource bounds and application-owned readiness govern every replay; a still specimen never proves that live motion has run.

The public API, frozen package code/artifacts and library animation/accessibility contracts are unchanged. M2 optimization remains paused; M2/M4 stay open, renderer choices provisional and npm publishing disabled. This record does not qualify library performance, devices, manual accessibility or release readiness. The finish-review/verdict evidence is separate: the second reviewer resolved all visible fixes, including the round native period. The responsive comparator's four visible-caption registration failures keep its phase open, unforced and unverified. The final verdict is `.artifacts/m5-homepage/finish-verdict-final.md`; it leaves the responsive mechanical gate unverified due the crop/registration tool limitation. Recorded finish disposition is `fix`; owner disposition is pending. Do not convert this documentation into wholesale homepage/gate approval.

## Do's and Don'ts

### Do:

- **Do** use the scoped docs palette for Guide/Workbench pages while retaining the foundation fallback, system stack, quiet rules and native controls.
- **Do** preserve visible focus, system-color overrides, a reachable pause control and labelled disclosures/fields.
- **Do** reflow to a single column at the narrow breakpoint and keep wide code scrolling within its own panel.
- **Do** keep preview behavior owned by the real package and readiness owned by the application.
- **Do** retain readable instructions and code before client enhancement.

### Don't:

- **Don't** add animated website chrome around the package's own handoff.
- **Don't** treat the preview container as evidence of a broader card, chip or dialog library.
- **Don't** infer a theme toggle, theme persistence, additional accent palette, custom docs font or implemented wider Workbench grid from this palette extension.
- **Don't** turn private preview styling into a claim of package qualification or public release.

### Homepage: Do

- **Do** scope homepage-prefixed tokens and the local typeface to the homepage while preserving the Guide/Workbench system.
- **Do** retain circular dots and a round terminal period in both the still specimen and the real semantic target.
- **Do** keep labelled illustrative stills legible before replay and use the real frozen public APIs for live behavior.
- **Do** preserve pause/system authority, cycle-filtered completion, visible focus and forced-colors semantics.

### Homepage: Don't

- **Don't** add color accents, glow, gradients or random particles to the owner-pinned monochrome homepage.
- **Don't** promote static sidecar/snippet geometry into proof of live package behavior or qualification.
- **Don't** turn unresolved responsive comparison findings or this documentation into a passed gate or public-release claim.
