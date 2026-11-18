# Private local testing

npm publication is disabled. The workspace and core package are `private: true`, the core also has a deliberately failing `prepublishOnly` lifecycle guard, and no publishing workflow or credentials have been added. Running the guard directly returned exit code 1 as intended; no publish command or registry write was attempted. The GitHub repository is still private.

Use the packed file for testing in your own application or for manually sharing a candidate with invited testers. An npm account, public package, registry token or paid registry plan is unnecessary for this file-based workflow. Nothing has been sent to friends or uploaded by this task.

## Candidate

- Package: `@dotquilt-internal/core@0.0.0-m1.0` (provisional internal identity).
- File: `.artifacts/history/b0c3f447ae0b1739cd73213dc813c9803c63c6584722def00b139faff4d6db17/dotquilt-internal-core-0.0.0-m1.0.tgz`.
- SHA-256: `b0c3f447ae0b1739cd73213dc813c9803c63c6584722def00b139faff4d6db17`.
- Contents: compiled native JS, declarations, CSS, package metadata, README and MIT license; 45 allowlisted files, zero runtime dependencies.
- Status: an internal validation candidate. The implemented size gates pass under the owner-approved 4.5 KiB SkeletonBlock amendment; M1 is complete only for the recorded native slice, not a public release or full v1 qualification. See [evidence and remaining gates](m1-progress.md).

Share only the selected tarball and its digest through your chosen private channel. It does not include the application, m37 sources, repository credentials, planning history or unrelated prototype assets.

## Install into a separate test application

Verify the received file against the digest above:

```sh
shasum -a 256 /absolute/path/dotquilt-internal-core-0.0.0-m1.0.tgz
```

Then, from the test application's directory, use either package manager:

```sh
bun add --ignore-scripts /absolute/path/dotquilt-internal-core-0.0.0-m1.0.tgz
# Alternatively:
npm install --ignore-scripts --no-audit --no-fund /absolute/path/dotquilt-internal-core-0.0.0-m1.0.tgz
```

Use the [native quickstart](native-quickstart.md) for explicit registration, placeholder/content slots, app-owned loading state, accessibility and CSP setup. Consume the package exports through the application's bundler. React/Next adapters and the rich text/chart/table catalog are not delivered in this M1 candidate.

When replacing a candidate at the same provisional version, use a different tarball path containing its new digest, reinstall it and confirm the installed bytes. Do not assume a cached file or workspace link is the new artifact. Record the artifact digest, browser, steps, expected result and observed result with any feedback.

## Publication stays a separate action

Local testing does not require npm login and does not change the approved release gates. Keep both `private` flags and the lifecycle guard intact. Account authentication, final scope verification and later trusted-publishing setup remain listed in [npm setup](npm-setup.md); none grants permission to publish or make the GitHub repository public.
