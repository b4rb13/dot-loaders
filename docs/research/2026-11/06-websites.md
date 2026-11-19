# 06: Website, docs and playground benchmark

Visited on 2026-11-19 to guide the dotquilt.dev rebuild (AUDIT.md Phase 4d). Visual direction is fixed by `design/SPEC.md`, "System, refined". Nothing here reopens it. This file only borrows structure and interaction patterns.

**Method**
- **Sites:** 21 sites and their docs or pricing pages.
- **Text:** every page was read through a text extraction.
- **Visual checks:** 14 sites were also opened in a real browser at 1440×900: Resend, Sonner, Motion, Aceternity, React Flow, Paper Shaders, Linear, Radix, Remotion, Clerk, GSAP, Magic UI, loading.io, and Tailwind Plus (attempted). On those pages I counted:
  - requests and transfer size, from Resource Timing;
  - `prefers-reduced-motion` CSS rules in same-origin stylesheets;
  - canvas, video and form controls.
- **Caveats:**
  - Cross-origin transfer sizes undercount.
  - The reduced-motion count misses handling done in JavaScript.
- **Not done:** no sign-ups, logins, purchases or forms.
- **Quotes:** marketing copy is quoted only as short headlines and button labels.

---

## Site notes

### 1. Aceternity UI (ui.aceternity.com)
1. **First viewport.**
   - Dark page with a left-aligned headline, "The React component library for beautiful landing pages."
   - On the right, a tilted 3D marquee of landing-page screenshots.
   - CTAs: "Browse Components" and "Get All-Access".
   - Proof is screenshots, not running components.
   - Nav: Components, Blocks, Pages, Interactions (New), Templates, Resources, Pricing, Login, Get All-Access, ⌘K search, theme toggle.
2. **Structure, top to bottom:**
   1. Trust row ("Trusted by 120,000+…" with avatars)
   2. Sponsor logos, including a "Your logo" slot
   3. Wall of about 30 quick links
   4. Logo wall (Google, Microsoft, …)
   5. "Copy, paste, or build with your AI agent"
   6. Free components (118+)
   7. Templates (17)
   8. Blocks (183+)
   9. Pages (5)
   10. Interactions (19)
   11. MCP section with stat tiles
   12. Tweet wall
   13. YouTuber features
   14. FAQ (9 questions)
   15. Final upsell, "Unlock Unlimited Access"
   16. Large footer
3. **Interactivity.**
   - The homepage is mostly cards and links. Interactions only appear on their own pages.
   - Measured: 250 requests, about 1.4 MB, 111 images, 1 reduced-motion rule. Heavy, and the motion is mostly decorative.
4. **Docs.**
   - Each component page has Preview/Code tabs, a registry ID with "Copy" and "Copy prompt", and CLI/Manual install (`npx shadcn@latest add @aceternity/…`).
   - Props tables. Sidebar groups by category, with "New" badges.
   - No StackBlitz or v0 links.
5. **Paid tier.**
   - Four cards: Free, 1-Year ($169), Lifetime ($199, "Most popular"), Team ($1,590 for 10 people). All are one-time payments.
   - Every paid card shows a struck-through "Regular price".
   - No comparison table. Nine-question FAQ. Tweet-wall testimonials. "Chat with us" for plan questions.
   - Inside the free docs:
     - a "Build faster with All-Access" banner near the top of every component page;
     - an "Aceternity UI Pro / Get lifetime access" block at the bottom;
     - "Get All-Access" in the header.
6. **Steal / avoid.**
   - **Steal:** a component ID with "Copy prompt" next to the code, so agents can install it.
   - **Avoid:** permanent "Regular price" strikethroughs, and an upsell banner on every free docs page. Both read as discount-store, the opposite of calm.

### 2. Magic UI (magicui.design, pro.magicui.design)
1. **First viewport.**
   - Site-wide promo bar: "Introducing Magic UI Pro…".
   - A "New" pill above the centered headline, "UI library for Design Engineers".
   - CTAs: "Browse Components" and "Browse Templates" (the second goes to Pro).
   - Tech-stack icons. No live component above the fold, so the hero is text only.
2. **Structure:** hero, then Showcase ("Companies choose Magic UI…": customer-site cards with funding labels such as "YC S24"), then a tweet wall, "Featured on YouTube", and the footer. Very short.
3. **Interactivity.** ⌘K search, theme toggle, GitHub star count (about 23k) and Discord count in the nav.
4. **Docs.**
   - Preview/Code tabs, "Open in v0", "Copy Page", CLI with pnpm/npm/yarn/bun tabs, Manual tab.
   - Props table (Prop/Type/Default/Description) and several variant examples (Vertical, 3D).
   - Sidebar puts "Templates" first, with "Pro" badges, inside the free docs. "New" badges are everywhere.
   - No replay button on previews.
5. **Paid tier.**
   - On the Pro site: "Get Unlimited Access", a 9-template grid with "Live Preview" links to hosted demos, one tier ($199 lifetime, "Recommended"), an ROI calculator (Magic UI vs about $20,000 custom build) and a 10-question FAQ.
   - Each free docs page ends with a "Limited Time Offer" block, "Ship Faster with Magic UI Pro", showing $199 and "Get Lifetime Access".
6. **Steal / avoid.**
   - **Steal:** "Live Preview" links that open a full working template, which is the honest way to sell bundles.
   - **Avoid:**
     - a text-only hero for a visual product;
     - a "Limited Time Offer" inside reference docs;
     - an ROI calculator with made-up numbers.

### 3. React Flow / xyflow (reactflow.dev, xyflow.com)
1. **First viewport.**
   - Headline "Wire your ideas with React Flow". The subhead names the component and what it builds.
   - CTAs: "Quickstart" and "React Flow Pro".
   - **The hero is the product.** It is a live flow with 11 nodes (verified in the DOM). A color picker node, a shape select node and a zoom slider node feed an output node that renders pink 3D cubes. You change the output by using the product.
   - Keyboard instructions are in the page text.
   - Top bar: "React Flow 13 is here!"
2. **Structure, top to bottom:**
   1. Stats row: "39.1K GitHub stars · 26.50M weekly installs · MIT", next to a short paragraph that MIT is sustained by Pro, plus a "React Flow Pro" button
   2. Partner program
   3. "Ready out-of-the-box"
   4. "Powered by us. Designed by you."
   5. "All the right components"
   6. Showcase ("Used in thousands of projects")
   7. Latest releases (three changelog cards)
   8. "A project by xyflow"
   9. Footer
   - xyflow.com is the umbrella site: three product cards, a showcase, and the team.
3. **Interactivity and quality.**
   - Measured: 75 requests, about 1.4 MB, 5 reduced-motion rules.
   - The hero's color input and some node buttons have no accessible name.
4. **Docs.**
   - Separate Learn, Reference, Examples, UI and Showcase sections.
   - Learn is grouped: Core Concepts, Customization, Layouting, Advanced Use, Tutorials, Troubleshooting.
   - Migration guides ("Migrate to v13" … v10) take the place of a version switcher.
   - Install tabs for npm, pnpm, yarn and bun; "Play online" opens CodeSandbox; a Playground link.
   - Examples are a grid of about 66 cards grouped by topic. About 16 of them have "Pro" appended to the title.
5. **Paid tier.**
   - Framed as funding MIT open source. Starter $169/mo, Professional $289/mo, Enterprise by quote (with perpetual access to Pro content).
   - 12-question FAQ that answers licensing head-on, for example "Can I use React Flow for my commercial project without a subscription?" and "What happens when I unsubscribe?"
   - Case studies (DoubleLoop, OneSignal, Carto) instead of a tweet wall.
   - A Pro example page shows "This is a Pro example." with a "Download ZIP" button and an upsell box ("Subscribe" / "Sign In"), not a blurred wall.
   - The free license requires an attribution badge; Pro removes it ("Remove Attribution" in the nav).
6. **Steal / avoid.**
   - **Steal:** a hero where the product is the demo and its own controls are the UI. Also the calm stats row that ties open source to Pro in one sentence.
   - **Avoid:** an attribution badge on the free tier. It is hostile for a placeholder library that should be invisible.

### 4. Motion (motion.dev, Motion+)
1. **First viewport.**
   - Dark page. A large canvas sphere of golden particle dots, which is a dot-field hero. Dotquilt has to look clearly different from it.
   - Headline: "The animation library loved by humans and agents alike."
   - An install line (`npm install motion && npx motion-ai`) with an inline copy button, a yellow "Get started" button, and "Free and open source. Previously Framer Motion."
2. **Structure, top to bottom:**
   1. "Small APIs. Expressive interfaces." (code + image tabs)
   2. Layout, gesture, scroll and spring sections, each with a snippet. The spring section has stiffness, damping and mass controls.
   3. Feature list ("Small by default", 3.2 kb)
   4. "Premium Motion UI components"
   5. "Access the full vault"
   6. AI Kit
   7. Performance Doctor
   8. Motion Studio
   9. Motion+ showcase (labeled "Motion+ exclusive")
   10. Partners (Framer, Cursor, Figma)
   11. "Made with Motion"
   12. "Latest from Motion" (changelog and articles)
   13. **"Choose where to start."**, a two-card fork: Motion (free, with the install command) or Motion+ ("Explore Motion+")
3. **Interactivity and quality.**
   - Spring sliders and a scroll-progress demo.
   - Measured: skip link present, 21 reduced-motion rules, 134 requests, 5 videos, 1 canvas.
4. **Docs.**
   - Long-form guides. Live examples are links to examples.motion.dev, not embeds.
   - Premium components are documented in the open docs and labeled "Motion+ (paid)", with "Not included in the free motion package". The API and usage are public; only the full source sits behind membership.
   - Free guides mention Motion+ components in-line where they are genuinely relevant (AnimateNumber, Cursor).
5. **Paid tier.**
   - Motion+ costs $399, "Pay once for each developer, keep it forever". Teams of two or more pay yearly per seat, with a seat stepper.
   - A free vs Motion+ comparison that lists both columns honestly.
   - Six-question FAQ (lifetime, seats, commercial use, agent need, PPP and student discounts, refunds). 14-day refund. Ten named testimonials.
6. **Steal / avoid.**
   - **Steal:** the "Choose where to start" fork as the single closing upsell, and paid components documented openly but clearly labeled.
   - **Avoid:** a homepage that becomes a catalogue of four paid tools. It buries the library.

### 5. GSAP (gsap.com)
1. **First viewport.**
   - Banner: "GSAP is now free for everyone, thanks to Webflow's support!"
   - Huge kinetic headline, "Animate Anything", with letters scrambling and colorful sticker shapes (a worm, a flower).
   - One CTA: "Get GSAP".
2. **Structure:** "Why GSAP", "Animate Anything", "Nice and Easy Easings", Tools cards (Scroll, SVG, Text, UI Interactions), showcase (titled "Brands using GSAP" but showing projects), plugin list, newsletter footer ("A Webflow Product").
3. **Interactivity.** Scramble-text and scroll effects. Expressive and playful.
4. **Docs.** Long-standing docs with CodePen embeds everywhere. Every API page links to runnable pens.
5. **Paid tier.** None now. Club GSAP was retired when Webflow made it free, and pricing is a "GSAP & Webflow" page.
6. **Steal / avoid.**
   - **Steal:** runnable embeds on every API page (CodePen culture).
   - **Avoid:** mascot-like stickers and kinetic type. They are explicitly ruled out by the SPEC ("No novelty").

### 6. Tailwind CSS + Tailwind Plus (tailwindcss.com)
1. **First viewport.**
   - Headline: "Rapidly build modern websites without ever leaving your HTML."
   - "Get started" and ⌘K search. A version badge ("v4.3") in the nav.
   - Proof is a code block and its rendered result side by side.
2. **Structure, top to bottom:**
   1. Sponsors ("Supported by the best.", 33 logos)
   2. "Built for the modern web": eleven feature vignettes, each a tiny code + result pair (responsive, filters, dark mode, P3, grid, transitions with four easing curves side by side, logical properties, container queries)
   3. Performance block
   4. "Ship faster and smaller" with tabbed files
   5. "Tailwind in the wild" logos
   6. Footer
3. **Interactivity.** Code tabs, and a separate playground (play.tailwindcss.com).
4. **Docs.** The best-in-class reference layout:
   - version switcher;
   - per-utility pages with class tables;
   - every example shows rendered output above the code.
5. **Paid tier (the most important finding).**
   - The Sept 9, 2026 post "Tailwind Labs is joining Shopify" says they are closing sign-ups for new customers. Existing customers keep access.
   - `/plus` and the UI-blocks pages now redirect to a login screen.
   - On the homepage, Plus was only ever a quiet "Plus" nav item.
   - Historical model, from memory and **not re-checked today**:
     - one-time payment (about $299 personal, $979 team);
     - live preview iframes with resize handles and light/dark;
     - code tabs locked for non-members.
6. **Steal / avoid.**
   - **Steal:** feature vignettes as many small proof units, each a single idea with code + result. Also the near-invisible "Plus" link on the free site.
   - **Avoid:** depending on a single one-time-payment bundle as the only revenue. Tailwind Plus's closure is a warning, not a model.

### 7. shadcn/ui (ui.shadcn.com)
1. **First viewport.**
   - Headline: "The Foundation for your Design System".
   - CTAs: "Get Started" and "View Components".
   - Below: a dense, working dashboard built from the components, with charts, a payout slider, notification toggles, a goal form and a read-only chat ("Demo is read only…").
2. **Structure:** hero, a composed showcase (a whole app made of the components), and a footer ("Built by shadcn at Vercel"). Nav: Docs, Components, Blocks, Charts, Directory, Typeset, Create.
3. **Interactivity.**
   - Real form controls in the showcase. GitHub count (128k) in the nav.
   - `/create`, a project/theme builder, is client-rendered. In my session the in-app browser navigated away from it to third-party sites during load, so I could not evaluate it.
4. **Docs (the reference anatomy):**
   - "Copy Page" (Markdown for agents), with Previous/Next at the top
   - a one-line description
   - a primitive switcher (Base UI / React Aria / Radix UI), the model for an "HTML / React" switch
   - Install with CLI/Manual tabs and pnpm/npm/yarn/bun tabs
   - Usage
   - examples, each a live preview with "Copy" and "View Code" (including an RTL example with a language dropdown)
   - API reference table, "On This Page" TOC, Prev/Next
5. **Paid tier.** None. A "Deploy to Vercel" callout is the only commercial element.
6. **Steal / avoid.**
   - **Steal:** the component-page anatomy, and "Copy Page" as Markdown.
   - **Avoid:** a hero that is a busy dashboard of unrelated widgets. Dotquilt's in-context demos should stay a few calm scenes.

### 8. Linear (linear.app)
1. **First viewport.**
   - Headline: "The product development system for teams and agents."
   - A full product window rendered as DOM, not a screenshot: issue DRV-8852 "Faster app launch", with an activity feed and a "1 / 84" pager.
   - Nav CTAs: "Log in" and "Sign up". A "New · Loops →" pill.
2. **Structure:** "A new species of product tool" (three "Fig 0.x" cards), Intake, Plan, AI, Build (each a product mock linking to a deep page), Changelog (4 entries), two named testimonials, "over 50,000 product teams", closing CTA "Built for the future. Available today."
3. **Quality.** 49 reduced-motion rules, the most of any site checked. Product mockups are real HTML, so they stay crisp and readable by assistive technology.
4. **Docs.** Separate docs site (not central to this benchmark).
5. **Paid tier.** Pricing page:
   - four cards (Free / Basic $10 / Business $16 / Enterprise), billed yearly;
   - a long comparison table of "Included"/"Not included" cells;
   - one trust stat, "Customer stories→".
6. **Steal / avoid.**
   - **Steal:** product UI drawn in HTML/CSS (Dotquilt's components are HTML, so the hero can be real); "Fig 0.1"-style quiet numbering; changelog on the homepage.
   - **Avoid:** dark-only, glow-heavy styling. The SPEC wants light by default and a slate (not black) dark theme.

### 9. Vercel (vercel.com)
1. **First viewport.** "Agentic Infrastructure", with "Deploy now" and "Talk to sales". The copy is jargon-heavy.
2. **Structure:** three use-case bands, each with one customer stat (Notion, Zapier, Mintlify); "Recently shipped"; "Built by you, or your agents"; "Brand assets".
3. **Interactivity.** Minimal on the homepage. A zero-signup deploy (`vercel deploy --temporary`).
4. **Docs.** Large and well-indexed (not central here).
5. **Paid tier.**
   - Hobby $0 / Pro $20 / Enterprise.
   - Comparison tables grouped by product area, with footnotes.
   - FAQ such as "Which Vercel plan is right for me?" and a compliance list.
   - CTAs are low-key text links.
6. **Steal / avoid.**
   - **Steal:** one concrete customer number per section (later, when Dotquilt has real users).
   - **Avoid:** buzzword headlines. Dotquilt's headline should describe the thing.

### 10. Resend (resend.com)
1. **First viewport.**
   - Dark page with a 3D glass cube.
   - Serif headline "Email for developers" and the subline "The best way to reach humans instead of spam folders."
   - CTAs: "Get started" and "Documentation". A "What you missed at Resend Forward" pill.
2. **Structure, top to bottom:**
   1. Logos
   2. "Integrate this morning": a code panel with about 13 language tabs and framework sub-tabs
   3. "First-class developer experience": a Send button that streams fake `HTTP 200` responses
   4. Test mode
   5. Modular webhooks: a live-looking event log
   6. Editor
   7. Contacts and analytics
   8. "Develop emails using React": a file tree switching rendered emails
   9. Deliverability grid (9 items)
   10. One featured quote
   11. "Everything in your control"
   12. A wall of about 10 named testimonials
3. **Interactivity.** Language tabs, the simulated send, the file-tree preview. Every demo is a small faked product moment.
4. **Docs and agents.** The site serves agents a Markdown index (sections, llms-style links), so text fetchers see structured docs instead of the visual page.
5. **Paid tier.**
   - Pricing per product (Transactional, Marketing, …) with volume tiers. "Self-serve plans are billed monthly only."
   - A comparison table grouped into six sections and a 15-question FAQ.
6. **Steal / avoid.**
   - **Steal:** "simulated real moment" demos, where a button triggers a believable product response. For Dotquilt: "Fetch again" re-runs the pending → ready handoff in a card.
   - **Avoid:** 13 language tabs. Dotquilt needs exactly two (HTML and React).

### 11. Clerk (clerk.com)
1. **First viewport.**
   - Headline: "Everything you need for authentication".
   - Tabs: User / Multi-tenancy / Enterprise / Agent Authentication.
   - A rendered `<SignIn />` card ("Create your account"), with an automated cursor walking through it.
   - CTA: "Start building for free". The agent prompt "Add Clerk auth to my app: clerk.com/SKILL.md".
2. **Structure:** products, a "Trusted by" text list, four product bands, agents, platform, frameworks, integrations, testimonials (CEO-level quotes), "Start now, no strings attached", related links (llms.txt).
3. **Interactivity.** The tabbed hero swaps a live component per tab.
4. **Docs.** Quickstarts per framework, and llms.txt in the footer.
5. **Paid tier.**
   - "Clear pricing that scales with your business."
   - "No credit card required" said twice.
   - A four-column overview, add-ons, volume tables, themed comparison tables, and an FAQ that includes "Is Clerk cheaper than Auth0?".
6. **Steal / avoid.**
   - **Steal:** hero tabs that switch which real component is shown. Dotquilt could switch "Dashboard / Table / Chat" scenes under one headline.
   - **Avoid:** an automated fake cursor. It is motion for its own sake and competes with the loaders.

### 12. Liveblocks (liveblocks.io)
1. **First viewport (text only).** Fetchers receive a Markdown/agent page: the realtime infrastructure description, skills install, MCP server, and a links index.
2. **Structure.** For agents: getting started, skills, MCP, docs (llms.txt, "pages can be fetched as Markdown"), products, pricing, SDK list.
3. **Interactivity.** Not checked visually.
4. **Docs.** Every page is available as Markdown. The strongest agent-readability posture seen.
5. **Paid tier.**
   - Free, Pro $30/mo, Team from $600/mo, Enterprise.
   - "Plans at a glance" table, metered-rates table, limit tables grouped by category.
   - FAQ such as "Which Liveblocks plan should I choose?". SOC 2, HIPAA, uptime.
6. **Steal / avoid.**
   - **Steal:** serve Markdown versions of docs and an llms.txt (cheap with Starlight).
   - **Avoid:** usage-metered complexity. Not relevant to a component bundle.

### 13. Rive (rive.app)
1. **First viewport.**
   - Headline: "Build games, apps, and interactive UI".
   - "Start building free" and "Have a coding agent? Copy a starter prompt".
   - Proof is a showcase ("Rive City", "Play it live", "Get source").
2. **Structure:** showcase, a 5-step "how to get started", editor features, CLI, AnimaScript (an in-browser editor that compiles as you type), Figma to Rive, runtimes, **"Rive or HTML? Use the right tool for the job"** comparison table, why teams choose Rive, logos and testimonials with numbers (Spotify, Duolingo, CARS24 "~150KB to ~15KB"), newsletter.
3. **Interactivity.** A live code editor, and a "01 / 09" carousel.
4. **Docs.** Runtime docs per platform (not checked deeply).
5. **Paid tier.**
   - "Build and ship for free"; MIT runtimes; "No revenue share, no runtime fees, no royalties".
   - Per-seat tiers (Free / Cadet $9 / Voyager $32 / Enterprise).
   - Free exports carry a splash screen.
6. **Steal / avoid.**
   - **Steal:** the honest "when to use us vs not" table. For Dotquilt: "Dotquilt or a spinner? or a plain skeleton?"
   - **Avoid:** watermarking free output, which Dotquilt must never do.

### 14. Remotion (remotion.dev)
1. **First viewport.**
   - Headline "Make videos [interactively / agentically / programmatically]": the last word rotates, and the product video below matches it.
   - Copyable `$ npx create-video` and "Docs / Discord / GitHub 74k".
2. **Structure:** three "Make videos …" bands, automation, a "What makes Remotion good?" 20-card grid (cards tagged "Soon" or "Paid"), **pricing on the homepage**, "In good company" logos, "License questions? Book a 20 minute call", help, stats bar ("2021 · 6M+ installs/mo · 1200 pages of docs · 74K stars · 12K+ members · 300+ contributors"), "Ready to make your first video?".
3. **Interactivity and quality.**
   - The pricing block has toggles ("Remotion for Automators / Creators") and a renders slider that totals "$100/month".
   - Measured: 39 canvases, 5 videos, 12 reduced-motion rules.
4. **Docs.** Very deep (1200 pages). The embeddable Player is itself a product.
5. **Paid tier.**
   - "Completely free to use for any individual or small company - no catch". Free for up to 3 people.
   - Company License above that (usage-based); Enterprise from $500/mo.
   - "Paid" tags on individual cards in the feature grid.
6. **Steal / avoid.**
   - **Steal:**
     - a plain-language rule for who pays;
     - "Paid" and "Soon" tags on a feature grid, a calm way to show Pro items alongside free ones;
     - the stats bar of verifiable facts.
   - **Avoid:** a rotating headline word, which is kinetic novelty.

### 15. Raycast (raycast.com)
1. **First viewport.**
   - Headline: "Your shortcut to everything."
   - CTA "Download for Mac", plus "Install via Homebrew".
   - A big 3D keyboard illustration.
2. **Structure:** "It's not about saving time…" (four keyboard-labeled points including "99.8% crash-free rate"), extensions with category tabs, AI assistant mock, "Built for professionals like you" (about 25 named people with roles and favorite features), automation (snippets, quicklinks, hotkeys), "What else", Notes, community counts and YouTube grid, developer API, closing download.
3. **Interactivity.** Category tabs and mock UIs.
4. **Docs.** Developer docs are separate.
5. **Paid tier.**
   - Pricing opens with an FAQ, including "Why is Raycast free for personal use?".
   - A five-column grid (Free, Pro $10, Teams Free, Teams Pro, Enterprise), with Plus and Max nested.
   - "Teams Free… isn't a trial". 50% student discount.
   - On the homepage, Pro is just a nav item.
6. **Steal / avoid.**
   - **Steal:** answering "why is the free tier free?" in the open. It builds trust for a future Pro.
   - **Avoid:** a 3D hero object unrelated to the product's real UI.

### 16. Sonner and Vaul (sonner.emilkowal.ski, vaul.emilkowal.ski)
1. **First viewport.**
   - Sonner: a faint stack of toasts above the title "Sonner", the line "An opinionated toast component for React.", "Render a toast" and "GitHub", then "Documentation".
   - Vaul: just "Open Drawer". The product is the only proof.
2. **Structure (Sonner):**
   1. Installation (`npm install sonner`, copy)
   2. Usage
   3. Types (9 chips)
   4. Position (6 chips)
   5. Expand
   6. Other (rich colors, close button, headless)
   7. Course plug
3. **Interactivity and quality.**
   - Clicking a chip such as "Success" **fires the real toast and rewrites the code snippet** to `toast.success('Event has been created')`. Verified.
   - The whole page is about 326 KB, 19 requests, 1 reduced-motion rule.
4. **Docs.** A separate `/getting-started` docs site. The homepage is itself the best quick reference.
5. **Paid tier.** None. A top banner promotes the author's course with "7 days left to join". The countdown is the only off-note.
6. **Steal / avoid.**
   - **Steal:** **chips that drive the live component and the code at once.** This is the single best pattern for Dotquilt's states and options.
   - **Avoid:** countdown urgency banners.

### 17. Radix Primitives (radix-ui.com/primitives)
1. **First viewport.**
   - Headline: "Core building blocks for your design system".
   - One CTA, "Get started".
   - Under it, a horizontal carousel of **live components on soft gradient tiles** (Dialog, Dropdown Menu, Popover, Slider, Tabs, Accordion…), each with a one-line caption about accessibility.
2. **Structure:** live demo carousel, "See more components in the docs", case studies (Node.js, Vercel quotes and a logo row), "Spend less time on undifferentiated work" with stats (130M+ monthly downloads), **"So, you think you can build a dropdown?"** (eight hard-parts bullets), "Accessibility out of the box", API cards with code, "Adoption made easy", community.
3. **Interactivity.** Every tile is a working primitive.
4. **Docs.** Per-component pages with demo, features, install, anatomy, API tables, keyboard interactions and accessibility sections.
5. **Paid tier.** None ("Made by WorkOS").
6. **Steal / avoid.**
   - **Steal:** **the "hard parts" section plus the keyboard and accessibility tables.** Dotquilt's release requirements (focus, inert, reduced motion, forced colors, SSR) are exactly this kind of hidden quality.
   - **Avoid:** saturated gradient tiles. Use `subtle` surfaces instead.

### 18. Paper Shaders (shaders.paper.design)
1. **First viewport.**
   - Lowercase "paper shaders" and "ultra fast zero-dependency shaders for your designs".
   - A copyable `npm i @paper-design/shaders-react`. Directly below, a grid of live shader thumbnails.
2. **Structure:** categories (Image Filters, Logo Animations, Effects with 20 items). Each shader has its own page.
3. **Interactivity (shader page, verified).**
   - A big live canvas.
   - A floating control panel: Presets (Default / Triangles / Tree line / Wallpaper), color pickers, a shape select, size, gap, stroke and rotation sliders.
   - "copy link" and "open Paper", which is the paid design app.
   - Below: installation, a **code block that rewrites itself to the current settings** (`<DotGrid shape="triangle" …/>`), shader props, common props, description.
   - Accessibility gap: the controls are unlabeled text inputs.
4. **Docs.** The shader page *is* the doc: live canvas, then code, then a props table.
5. **Paid tier.** Indirect. The free library feeds the paid Paper app through an "open Paper" link on each page.
6. **Steal / avoid.**
   - **Steal:** **the playground model (live canvas, presets, live code, copy link).** Dotquilt's playground should feel like this, in light mode, with properly labeled controls.
   - **Avoid:** unlabeled numeric inputs.

### 19. animations.dev (Emil Kowalski's course)
1. **First viewport.**
   - Headline: "How do you craft animations that feel right?"
   - "Taught by Emil Kowalski" and "Enroll Now".
2. **Structure:** problem, side-by-side "which feels better" comparisons, promise, course player screenshots, testimonial wall, author, four-module curriculum with embedded working demos, walkthroughs, bonuses, endorsement (Matt Perry), pricing and FAQ.
3. **Interactivity.** Demos embedded in the sales copy ("Add toast", a Feedback popover, game cards).
4. **Docs.** Not applicable.
5. **Paid tier.**
   - One price ($299), "Access for life", team checkout with a 10–20% discount, PPP banner, student discount on request.
   - "Money-back guarantee, anytime".
   - A "Registration closes in" countdown.
6. **Steal / avoid.**
   - **Steal:** side-by-side "which feels better?" comparisons. For Dotquilt: a spinner vs a Dotquilt handoff, played in the same card.
   - **Avoid:** registration countdowns.

### 20. Animate UI (animate-ui.com)
1. **First viewport.**
   - Headline: "Animate your shadcn/ui components in one command".
   - "Get started" and "Browse primitives". An install command with npm, pnpm, yarn and bun tabs.
2. **Structure:** hero, then **"Every primitive, alive." / "Go ahead, play with them."**, a grid of nine live demos (switch, tabs, accordion, checkbox, sliding number, radio, icons, toast, progress), then the agent skill section ("Ask for motion in plain words."), then the footer.
3. **Interactivity.** Every demo works. A React/Vue switch in the nav and a Base UI / Radix / React Aria selector.
4. **Docs.** shadcn-style.
5. **Paid tier.** None.
6. **Steal / avoid.**
   - **Steal:** a short, confident homepage where the second screen is a grid of everything, alive.
   - **Avoid:** nothing major. It is thin on trust and proof for a paid future.

### 21. loading.io (category incumbent for loaders)
1. **First viewport.**
   - Busy page: Carbon ad, "Animation Made Easy.", a Gen-AI icon prompt.
   - A full loader generator with about 20 controls (palette, size, bar width and count, speed, fps, edge smoothing…).
   - Export as GIF, SVG, PNG or more, labeled "Free License" or "$1.99".
   - Cookie bar.
2. **Structure:** generator, "More than Preloaders", icons, "Meet Loading.io", "Service At Cost" (subscription or one-time, 7-day refund).
3. **Interactivity.** Powerful but cluttered. Controls look like a 2012 admin panel.
4. **Docs.** None in the component sense. Output is assets, not components.
5. **Paid tier.** Per-asset prices plus a subscription. Ads on the free site.
6. **Steal / avoid.**
   - **Steal:** the idea of a per-item license label (FREE / PRO) right where the user exports or copies code.
   - **Avoid:** almost everything visual. Ads, many controls at once, Gen-AI upsell. Dotquilt is the calm opposite of the category incumbent, so say that implicitly by design.

---

## Summary table

| Site | Hero proof | Best interactive moment | Docs or playground strength | Paid model and presentation | Steal | Avoid |
| --- | --- | --- | --- | --- | --- | --- |
| Aceternity | Screenshot marquee | (none on home) | Copy prompt + registry ID | 4 one-time tiers, strikethroughs, banners in docs | Copy-prompt for agents | Fake "Regular price", docs banners |
| Magic UI | Text only | — | Preview/Code, Open in v0, PM tabs | $199 lifetime; "Limited Time Offer" in docs | Live Preview of full templates | Text-only hero, offers in docs |
| React Flow | **Live product as hero** | Nodes are the controls | Learn/Reference/Examples split; migration guides | Monthly subs framed as funding MIT; Pro tag in example titles | Product-as-hero; stats row | Attribution badge on free |
| Motion | Dot-particle canvas + install line | Spring sliders | Paid comps documented openly, labeled | $399 lifetime/dev; seats yearly | **"Choose where to start" fork** | Paid-tool catalogue on home |
| GSAP | Kinetic type | Scramble text | CodePen on every API page | Free (Webflow) | Runnable embeds | Novelty stickers |
| Tailwind | Code + result | Feature vignettes | Gold-standard reference | Plus closed to new customers (Sep 2026) | Vignettes; quiet "Plus" link | Single bundle revenue |
| shadcn/ui | Composed live dashboard | Real controls in demo | **Component page anatomy**, Copy Page | None | Docs anatomy | Busy dashboard hero |
| Linear | Product UI in HTML | Pager/feed | — | Cards + long table | HTML-drawn product; 49 RM rules | Dark glow default |
| Vercel | Copy only | — | — | Grouped tables, FAQ | One stat per section | Buzzword headline |
| Resend | 3D object + code tabs | Simulated send | Agent Markdown index | Per-product volume tiers | "Simulated real moment" | 13 language tabs |
| Clerk | Live component in tabs | Tab-switched component | llms.txt, SKILL.md | "No credit card required" | Scene tabs in hero | Fake cursor |
| Liveblocks | (agent Markdown) | — | **Every page as Markdown** | Credits and metered | Markdown docs | Metering complexity |
| Rive | Showcase | Live compiler | Runtimes | Per-seat; splash on free | "Rive or HTML?" table | Watermarking free |
| Remotion | Rotating word + video | Pricing slider | Very deep docs | Free ≤3 people; "Paid" tags | Who-pays rule; stats bar | Rotating headline |
| Raycast | 3D keyboard | Category tabs | — | FAQ-first pricing | "Why is it free?" answered | Unrelated 3D object |
| Sonner/Vaul | **The component itself** | **Chips fire demo and rewrite code** | Page = reference | None (course banner) | Demo-and-code chips | Countdown banner |
| Radix | Live component carousel | Every tile works | A11y + keyboard tables | None | **"Hard parts" + a11y section** | Saturated tiles |
| Paper Shaders | Live shader grid | **Presets + live code + copy link** | Canvas → code → props | Feeds paid app | **Playground model** | Unlabeled inputs |
| animations.dev | Copy + author | Demos in sales copy | — | $299, team, PPP, refund anytime | Side-by-side comparisons | Countdown |
| Animate UI | Install + demo grid | "Every primitive, alive." | shadcn-style | None | Alive grid on screen 2 | Thin trust |
| loading.io | Generator + ad | 20-control generator | — | Per-asset $1.99 + subs + ads | Per-item FREE/PRO label | Clutter, ads |

---

## Top 15 patterns for dotquilt.dev (prioritized)

Each item: what to do, which site does it best, and how it looks in "System, refined".

1. **The hero is the product, running, with Replay and Pause.** *Best: React Flow (live flow whose nodes are the controls); Linear (product UI in HTML).*
   - Keep the locked hero, where the field of marks rises into the teal chart line and the metric cards hand over. It is real ChartLoader and TextLoader markup, not a video.
   - In the card's corner, two quiet 34 px ghost buttons in DM Mono: "Replay" (↺) and "Pause motion".
   - The pause button covers WCAG 2.2.2 for looping content. Its state persists via `localStorage`, and it defaults to paused under `prefers-reduced-motion`, which shows the settled ready state.
   - Hovering or focusing a card shows a faint DM Mono label (`ChartLoader`) that links to its docs.

2. **Chips that drive the live component and rewrite the code together.** *Best: Sonner.*
   - Under the hero, or as the first section, a single card with chip rows:
     - state: `pending · ready · error`;
     - mark: `dot · dash · square`;
     - theme: `light · dark`.
   - The code block below (SPEC code colors) rewrites in place, for example an illustrative `<chart-loader state="ready" mark="dash">` (use the real tag and attribute names).
   - The selected chip uses `accent-soft` with `accent` text. Code changes cross-fade with the Fade curve, never type out.

3. **Install line with copy and package-manager tabs, in the hero and at the top of every doc.** *Best: Motion (inline copy in hero); Animate UI and shadcn (npm/pnpm/yarn/bun tabs).*
   - One 40 px pill in DM Mono, for example `npm install @dotquilt-internal/core` (the current internal name; the published name is not decided).
   - Copy icon; on success, a check that settles in over about 400 ms.
   - The tabs remember the last package manager across the site.

4. **"Every component, in context" grid on screen two.** *Best: Animate UI ("Every primitive, alive."); Radix (live tiles); shadcn (composed app).*
   - Six to nine `surface` cards with 12 px radius and the card shadow. Each shows one component inside a realistic micro-scene: a KPI card, a table, a chat thread, an article, a profile.
   - Each card has a "Load again" link.
   - Scenes, not specimens, as the SPEC requires. No gradient tiles.

5. **Every preview can replay the handoff.** *Best: Resend's simulated moments and Sonner's chips. Magic UI lacks it, and loaders need it more than any other component.*
   - Every docs preview, example and playground canvas has "Load again". It re-runs pending, then settle, then ready, with the real timings.
   - Optionally a slim scrubber in the playground (pending to ready) so people can study the handoff frame by frame.
   - This is how the signature moment gets seen more than once.

6. **Docs component-page anatomy.** *Best: shadcn/ui; Magic UI for the PM tabs and "Open in".* In Starlight, in this order:
   1. Title and one-line description
   2. "Copy page" (Markdown)
   3. **HTML / React switch** (modeled on shadcn's primitive switcher), persisted per visitor
   4. Preview card (with Replay, theme, mark) and Code tab
   5. Install
   6. Usage
   7. Examples (each live, with Copy)
   8. API: attributes and props, events, CSS custom properties, states
   9. **Accessibility** and **SSR** subsections
   10. On-this-page TOC, Prev/Next

7. **Playground: canvas, presets, live code, copy link.** *Best: Paper Shaders.*
   - Left: the canvas is a realistic card (not an empty void), with a scene picker (Dashboard KPI / Table / Chat / Article).
   - Right: a 300 px `surface` panel. "Presets" chips on top, then labeled controls: mark, size, gap, speed, glow, theme, reduced motion.
   - Below: code that rewrites itself, with HTML/React tabs and Copy.
   - "Copy link" encodes the state in the URL, which the playground already does.
   - Every control has a visible `<label>` and keyboard steps. This fixes Paper's main flaw.

8. **A "hard parts" accessibility section with live toggles.** *Best: Radix ("So, you think you can build a dropdown?" and "Accessibility out of the box").*
   - A calm two-column section, "What a placeholder has to get right": focus never lands in placeholders; content is `inert` until ready; `aria-busy` and live-region handoff; reduced motion; forced colors; no layout shift; SSR markup.
   - Beside it, one live card with toggles for "Reduced motion" and "Forced colors (preview)".
   - Few competitors can claim this, and it is a real release requirement in AGENTS.md.

9. **A "spec sheet" proof row instead of vanity stats.** *Best: React Flow (stars · weekly installs · MIT, next to one sentence on sustainability); Remotion (stats bar).*
   - Pre-launch, use verifiable facts in DM Mono with `faint` labels: "x.x kB gzip per component" (from `bun run size`), "0 dependencies", "Web Components + React", "SSR-safe", "Respects reduced motion", "MIT".
   - Add downloads and stars only once they are flattering and real.

10. **One closing fork: free or Pro.** *Best: Motion ("Choose where to start.").*
    - The last homepage section: two equal cards.
    - Left: "Dotquilt", with "Free and open source", the install line and "Read the docs".
    - Right: "Dotquilt Pro", with "Coming later", one sentence on what it will add and "See what's planned →" to /pricing.
    - No price and no form. This and the nav "Pricing" link are the only Pro touchpoints on the homepage.

11. **Honest Pro labeling inside free surfaces, with no banners.** *Best: React Flow examples ("Pro" tag on the card title); Motion docs ("Motion+ (paid)" label, public API docs); Remotion feature grid ("Paid" or "Soon" tags).*
    - Once Pro exists, Pro examples and presets appear in the same gallery and playground lists with a small `accent-soft` "Pro" pill. Their API docs stay public.
    - A Pro detail page shows a working preview and a quiet "Part of Dotquilt Pro" note.
    - Never: top banners, modals, "Limited Time Offer" blocks, header "Get Pro" buttons, or blurred code walls.

12. **Pricing page: two columns, a "free stays free" promise, a licensing FAQ.** *Best: Motion+ (honest free vs paid columns); React Flow Pro FAQ (commercial use, cancellation); Raycast ("Why is Raycast free…?"); Remotion ("no catch").*
    - Now: "Free: everything shipping today (MIT, commercial use)" next to "Pro: coming later", listing what is planned with no price and no checkout. That respects the 2026-11-19 owner decision.
    - Under the columns, a one-line promise, "Components that are free today stay free."
    - FAQ:
      - "Can I use Dotquilt commercially?"
      - "Will anything free move to Pro?"
      - "What will Pro add?"
      - "How will licensing work for teams?"
      - "How do I hear when Pro launches?"
    - Answer the last question with GitHub Releases or Watch. An email list is an owner decision.

13. **"Latest releases" strip.** *Best: React Flow (three release cards on the homepage); Motion ("Latest from Motion"); Linear (changelog).*
    - Three hairline rows: version in DM Mono, date, one-line summary. Plus "All releases →" (GitHub Releases or /changelog).
    - It proves the library is alive, which matters before asking anyone to pay for Pro.

14. **Agent-ready docs.** *Best: Liveblocks (every page as Markdown); shadcn ("Copy Page"); Clerk (llms.txt, SKILL.md); Aceternity ("Copy prompt").*
    - Ship `/llms.txt`, per-page `.md` and a "Copy page" button in docs, plus "Copy prompt" on examples (for example, "Add a Dotquilt ChartLoader to this card…").
    - No AI branding in the hero. Keep it a utility in the docs chrome.

15. **Restraint as performance and accessibility.** *Best: Linear (49 reduced-motion rules, product UI in HTML); Sonner (about 0.3 MB whole page). Counter-example: Aceternity (250 requests, 111 images).*
    - No hero video. No screenshot marquees. Lazy-mount below-the-fold demos with IntersectionObserver.
    - One font pair, preloaded. Visible focus rings in `accent`.
    - Treat a page-weight budget like the component size budgets.
    - The site is a demonstration of the same calm the components promise.

Runners-up, worth doing later:
- Side-by-side "which feels better?": spinner vs handoff in identical cards (animations.dev).
- "Dotquilt or a spinner?" when-to-use table (Rive's "Rive or HTML?").
- Hero scene tabs, Dashboard / Table / Chat (Clerk).
- Showcase ("Used by") once there are real users (React Flow, Tailwind).

---

## Recommended information architecture for dotquilt.dev

**Global nav.**
- Left: wordmark, Docs, Examples, Playground, Pricing.
- Right: ⌘K search, GitHub (star count once meaningful), theme toggle.
- No "Get Pro" button. The nav item is "Pricing", not "Pro", so it serves both free and paid questions.

| Page | Purpose | Contents (top to bottom) | Pro surfacing |
| --- | --- | --- | --- |
| `/` Home | Show the handoff and earn an install in 60 seconds | 1. Hero: headline describing the thing, install line, Docs CTA, live field → chart → cards handoff with Replay and Pause. 2. Demo-and-code chips (state, mark, theme). 3. "In context" grid of 6–9 scenes. 4. The handoff, explained: a scrubbable pending → settle → ready strip with timing notes. 5. "What a placeholder has to get right" (a11y and SSR, live toggles). 6. HTML / React code tabs, the same component in both. 7. Spec-sheet row (sizes, deps, SSR, MIT). 8. Latest releases. 9. "Choose where to start" fork (Free / Pro, coming later). 10. Footer. | Only the closing fork card and the nav "Pricing" link |
| `/docs` (Starlight) | Reference and guides | Getting started (Introduction, Installation, Quick start: "Your first handoff"). Components (one page each, with the anatomy from item 6; the four skeleton primitives grouped). Guides (React, Server rendering, Theming, Motion and reduced motion, Accessibility, CSP, Custom animations). Reference (CSS custom properties, attributes and events, states, browser support). Migration and Changelog. `/llms.txt` and per-page Markdown. | None now. Later, Pro components get their own pages with a "Pro" pill and public API. No banners. |
| `/examples` | Prove it in realistic product UI; copy whole compositions | Filterable gallery (by component and scene: dashboard, table, chat, article, settings). Each card is live, with "Load again". Detail page: preview, code (HTML/React), Copy, "Copy prompt", "Open in playground". | Later: Pro compositions sit inline with a "Pro" pill and a working preview, at most about a quarter of the grid, plus a "Pro examples" filter |
| `/playground` | Tune a loader and take the code away | Scene picker, preset chips, labeled controls, live code with HTML/React tabs, Copy, "Copy link" (URL state), Reset | Later: Pro presets listed with a pill. Selecting one shows "Part of Dotquilt Pro" in the code area instead of code. Never a modal. |
| `/pricing` | Answer "is this free, and what's next?" honestly | Two columns (Free now; Pro coming later, what's planned, no price, no checkout), the "free stays free" promise, licensing FAQ, contact or GitHub link. Later: price, seats, refund policy, comparison table. | This is Pro's home until it ships |
| `/changelog` | Show momentum | Rendered from GitHub Releases, or a link to them | — |
| `/license` (exists) | MIT text plus a plain-language summary | — | Later: Pro license terms on their own page |
| `/showcase` | Social proof | **Hold** until there are real users. Do not fake logos. | — |

**Pro rules.** In one sentence: free users meet Pro at most in two places on the homepage (the nav "Pricing" link and the closing fork), on `/pricing`, and later as small "Pro" pills on gallery and playground items. Never in docs prose, banners, modals, headers, countdowns or struck-through prices.

**Open owner decisions this raises** (do not act on them yet):
- Whether to collect emails for a Pro waitlist. The alternative is pointing to GitHub Releases or Watch.
- Whether Pro pages get their own route (`/pro`) or stay inside `/pricing` until launch. Recommendation: stay in `/pricing`.
- The Pro pricing model. The market splits between one-time lifetime ($199–$399: Aceternity, Magic UI, Motion+) and subscriptions ($169+/mo: React Flow). Tailwind Plus closing to new customers in Sept 2026 is a caution about one-time-only revenue.
