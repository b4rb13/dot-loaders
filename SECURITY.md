# Security policy

## Supported versions

Fixes go into the latest release of every package: `dotquilt`, `@dotquilt/react`, `@dotquilt/vue`, `@dotquilt/svelte` and `@dotquilt/angular`. Older versions don't get updates, so upgrade to the latest to receive a fix.

## Reporting a problem

Please don't post the details of a security problem in a public issue.

Open an issue that says only that you have a security report to make, without the details, and a maintainer will reply with a private way to send them.

It helps to include, once you can send the details:

- the package and version, and your framework and browser;
- what an attacker could do, and how;
- a small example that shows it.

You'll get an answer to the first issue, and a fix or a plan once the problem is confirmed. A fixed problem is described in the release notes after the release is out.

## How releases are made

Releases are built by GitHub Actions from this repository and staged on npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no publishing token is stored anywhere. A maintainer approves each one with two-factor authentication before it goes public. See [CONTRIBUTING.md](CONTRIBUTING.md#releasing) for the details.
