# Application boundary

`apps/website` is the authorized M5 Next.js/React/Tailwind documentation and playground app. The first Guide/Workbench slice consumes frozen compiled public exports; complete native/React examples are separately installed and verified from private tarballs. It imports no prototype runtime or private core symbols.

Run `bun run dev:website` for local development or `bun run build:website` then `bun run --cwd apps/website start` for the production preview at http://127.0.0.1:4210. Website preparation verifies the 303-file runtime freeze before copying matching CSS assets. No package rebuild is part of the website task.

M2 optimization is paused; M2/M4 acceptance remains open. Native core and React adapter must not import Next/Tailwind/site dependencies. Both packages and the app remain private, npm publishing disabled. No deployment is configured or authorized. Scope/evidence: `docs/implementation/m5/progress.md`; roadmap #19, first slice #20.
