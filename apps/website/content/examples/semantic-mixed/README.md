# Semantic projections and mixed ownership

Private preview 0.0.0-m2.0. Copy both reviewed frozen tarballs into vendor/ with the filenames from package.json. Use Bun 1.4.3 and React 19.3.1.

1. bun install --ignore-scripts
2. bun run build
3. bun run check
4. bun run start

Open http://127.0.0.1:4236/?integration=react or ?integration=native. Both use the same illustrative data, projections and recipes. This is a client-only React mount or native enhancement over useful static content, not React SSR; use the separate SSR/Next guide apps for hydration.

Load report, then Reveal report promptly to see shared chart/table choreography. The source chart uses explicit CSS-pixel line/bar/scatter geometry. Table cells/glyphs are measured from owned application spans with explicit row IDs/targets. The nested text owner has independent load/reveal controls. Refresh keeps existing content accessible; note input identity persists. Global example pause covers both owners; system restrictions remain engine-owned.

Provider cases: valid; one null then data; unavailable twice; intentionally non-finite geometry; intentional exception; incomplete table row target set; and international table content. This frozen semantic-table projection accepts printable ASCII only. The application keeps Café 東京 unchanged and returns null rather than inventing glyphs. These fault switches teach fallback, not production provider patterns. Providers never write DOM, infer readiness or start timers; private counters only record setup calls. Telemetry updates outside the owned content after application actions/events.

The explicit region handoff replaces child semantic morphs and does not invoke their providers. Recycle table rows during a moving handoff to invalidate captured ownership safely; do not treat array position as target identity. Refresh geometry after application-owned typography/layout changes. The projection handles this bounded plain-span table only; it is not a third-party grid, virtualized table or arbitrary international glyph adapter.

The application uses matching external styles and an enforced response CSP with style-src-attr 'none'. Missing required component CSS leaves loading controls disabled and content ready; reload is an ordinary recovery path. Static content works without JavaScript. Application CSS and local assets are still dependencies; visual guards are not authorization. No public npm release, renderer selection, browser-floor/manual AT/device/performance or full M2/M4 qualification is claimed. No deployment/publication command is provided.
