# npm setup register

Package setup updated 2026-10-17; the last authentication observation remains 2026-10-16. The owner reports creating the npm account **b4rb13** and authorized preparation, with publication deferred until the product works and its release gates pass. A read-only `npm whoami` check returned `ENEEDAUTH`: this machine is not authenticated. This is not a finding that the account does not exist.

| Item | Status |
| --- | --- |
| Account creation | Owner-reported complete: `b4rb13`. |
| Authenticated identity and scope | Pending owner login and a fresh `npm whoami` result matching `b4rb13`. |
| Intended native / React identities | Candidates `@b4rb13/dotquilt` / `@b4rb13/dotquilt-react`; not reserved or published. Freeze after authenticated verification and a fresh package-name check. |
| Local routing | Repository `.npmrc` maps `@b4rb13` to the official registry. It contains no authentication configuration or secrets. |
| Package metadata | Repository, package directory, author, issues URL and official registry configured. Current local artifacts remain provisional `@dotquilt-internal/core` and `@dotquilt-internal/react`, with matching versions and an exact native dependency. |
| Publication guard | Workspace/core/React remain `private: true`; Changesets access is restricted and private tagging is disabled. Both publishConfig entries are restricted and both `prepublishOnly` hooks deliberately fail before publication. The M3 completion packet retains the direct installed-hook invocations and expected exit 1 for both packages. No publishing workflow, registry writes, staged versions or name placeholders. |
| Account security / recovery | Pending owner verification of 2FA and recovery access. Do not put passwords, recovery codes or registry credentials into this repository or chat. |
| Trusted publisher | Planned for the later specifically approved npm release gate; not configured. No write token created. |

For local tests with friends, use the [private tarball workflow](private-testing.md). No registry publication is necessary.

## Owner authentication, when convenient

Run `npm login --registry=https://registry.npmjs.org/` interactively, then `npm whoami --registry=https://registry.npmjs.org/`. Login is not required for private local tarball development or these tests. Authentication alone is not publication approval.

After authenticated verification, update the package identity consistently across exports/consumers, fixed release group, lockfile and docs in one reviewed change; pack and revalidate. The functioning React adapter is now in the same fixed group.

## Later release handoff

Keep the approved governance gates: full implementation evidence, reviewed package/notice/credential audit, exact release/artifact approval, source-visibility/provenance prerequisites and separate npm/GitHub/website permissions. Switch package privacy/access only in that authorized release change. Public scoped packages need public access configuration; the current restricted configuration deliberately does not prepare a public publish by accident.

At release time, reverify npm's supported trusted-publishing runtime and bootstrap procedure. Bind each real package to the exact GitHub owner/repository/workflow/environment, require the reviewed release environment, and verify actual provenance and registry installs after publishing. No placeholder first publish is permitted merely to configure package settings. Native-then-React release recovery and independent website approval remain governed by the approved policy.

Official setup references checked on this date: [scopes](https://docs.npmjs.com/about-scopes/), [2FA](https://docs.npmjs.com/configuring-two-factor-authentication/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [package privacy/publishConfig](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/). These are operational references, not evidence of completed account or registry setup.
