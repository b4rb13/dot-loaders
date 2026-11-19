# Changesets

Each file here is a pending changelog entry. `changeset version` turns them into `CHANGELOG.md` entries and bumps both packages together (a fixed group: React depends on the exact native version).

Nothing publishes automatically. Both manifests are `"private": true` until the npm name is decided and a release is approved. `bun run release:check` shows what a release would contain without publishing anything.
