# Project instructions

## Current effort

This repository is in Wayfinder planning. The canonical map and decision tickets live in GitHub issues. Read `.agents/issue-tracker.md` before tracker operations. Do not silently turn decision tickets into implementation tasks.

Read the map's Destination and Notes before choosing work. Claim a ticket before investigating it. Human-in-the-loop decisions need the human's answer; agent recommendations are not approval.

## Source isolation

`/Users/derenikkhachatryan/WebstormProjects/m37-projects/m37_web` is read-only source material. Never edit it, install dependencies there, execute mutating scripts there, or commit changes to it. Extract only explicitly scoped loader files when the later migration is authorized by its implementation ticket. Do not copy secrets, application data, unrelated assets, or organization-specific policies.

## Research

Use official documentation, upstream source, and standards. Put each investigation on its own `research/<name>` branch in an isolated worktree. Never switch this shared checkout to a research branch. Push research branches without PRs; do not merge them. Findings are evidence for decisions, not accepted specifications.

## Future implementation constraints

Use Bun and Turborepo; keep the native custom-element core framework independent. React, Next.js, and Tailwind belong in the adapter or website rather than core runtime. Treat accessibility, motion preferences, SSR safety, cleanup, selective imports, and measured size/performance as release requirements.

Keep the repository private. Do not publish to npm or change repository visibility without explicit user authorization.
