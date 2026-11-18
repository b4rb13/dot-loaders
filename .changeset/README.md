# Private release records

Changesets versions the native and React packages as a fixed group. Both receive the same version, and React depends on that exact native version. React/ReactDOM remain external peers; native has no runtime dependencies.

Changesets are pending records, not automatic publication. The current provisional tarballs retain their matching development version and are distinguished by SHA-256. Final npm import identity and all registry/public launch prerequisites remain separately gated. Both manifests are private, their prepublish hooks fail closed, and there is no credential-bearing publishing workflow.
