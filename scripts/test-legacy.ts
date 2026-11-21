// The remaining checks that need the packed tarballs installed into clean
// consumers: the React suite rerun on React 19.0 (the oldest supported
// version), catalog SSR under Node and Bun on React 19.3 and 19.0, and the
// Vue, Svelte and Angular packages built into their example apps.
// Everything else runs in the main Playwright config and the unit suites.
//
//   bun run test:legacy              both suites, Chromium only
//   ALL_BROWSERS=1 bun run test:legacy
//
// Run `bun run build` first.

interface Suite {
  /** Commands that prepare packed consumers and fixtures. */
  prepare: string[][];
  /** Playwright configs to run, with Chromium-only and all-browser project filters. */
  configs?: { file: string; chromium: string; all?: string }[];
  /** Extra non-Playwright checks. */
  checks?: string[][];
  /** Extra environment for Playwright. */
  env?: Record<string, string>;
}

const suites: Record<string, Suite> = {
  // Packs and installs the tarballs the other suites consume. Packaging is
  // checked by scripts/pack-smoke.test.ts; the browser suite already runs
  // against the same dist files, so it is not rerun here.
  native: {
    prepare: [['bun', 'run', 'scripts/verify-packed.ts']],
  },
  react: {
    prepare: [
      ['bun', 'run', 'scripts/verify-react.ts'],
      ['bun', 'run', 'scripts/verify-react-ssr.ts'],
    ],
    // The fast suite runs these tests on the workspace React; this reruns
    // them once on React 19.0, the oldest supported version.
    configs: [
      {
        file: 'playwright.config.ts',
        chromium: 'react-chromium',
        all: 'react-*',
      },
    ],
    env: { DOTQUILT_REACT_FLOOR: '1' },
    // Catalog SSR under Node and Bun with React 19.3 and 19.0.
    checks: [['bun', 'run', 'scripts/verify-catalog-ssr.ts']],
  },
  // The Vue, Svelte and Angular packages installed from their tarballs into
  // fresh copies of the Nuxt, SvelteKit and Angular examples, built and served.
  frameworks: {
    prepare: [['bun', 'run', 'scripts/verify-frameworks.ts']],
  },
};
// Suites reuse consumers that earlier suites install.
const requires: Record<string, string[]> = {
  react: ['native'],
};

const requested = process.argv.slice(2);
for (const name of requested)
  if (!suites[name])
    throw new Error(
      `Unknown suite ${name}; choose from ${Object.keys(suites).join(', ')}`,
    );
const selected = new Set<string>();
const add = (name: string) => {
  for (const dependency of requires[name] ?? []) add(dependency);
  selected.add(name);
};
for (const name of requested.length ? requested : Object.keys(suites))
  add(name);

async function run(command: string[], env: Record<string, string> = {}) {
  console.log(`\n$ ${command.join(' ')}`);
  const child = Bun.spawn(command, {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, ...env },
  });
  return (await child.exited) === 0;
}

const failed: string[] = [];
for (const name of selected) {
  const suite = suites[name] as Suite;
  let ok = true;
  for (const command of suite.prepare) if (ok) ok = await run(command);
  for (const config of suite.configs ?? [])
    if (ok) {
      const args = ['bunx', '--no-install', 'playwright', 'test'];
      args.push(`--config=${config.file}`);
      const project = process.env.ALL_BROWSERS ? config.all : config.chromium;
      if (project) args.push(`--project=${project}`);
      if (!(await run(args, suite.env))) failed.push(`${name}: ${config.file}`);
    }
  for (const command of suite.checks ?? [])
    if (ok && !(await run(command))) failed.push(`${name}: ${command.at(-1)}`);
  if (!ok) failed.push(`${name}: prepare`);
}
if (failed.length) {
  console.error(`\nLegacy suites failed:\n  ${failed.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nLegacy suites passed: ${[...selected].join(', ')}`);

export {};
