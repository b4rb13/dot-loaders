// Runs the older browser/SSR suites that test packed tarballs installed into
// clean temporary consumers (several React and Next versions included).
// They are slow (npm installs, Next builds) and are being ported into
// tests/e2e component by component; each ported suite is deleted here.
//
//   bun run test:legacy              all suites, Chromium only
//   bun run test:legacy m4 table     only the named suites
//   ALL_BROWSERS=1 bun run test:legacy
//
// Run `bun run build` first.

interface Suite {
  /** Commands that prepare packed consumers and fixtures. */
  prepare: string[][];
  /** Playwright configs to run, with the Chromium-only project filter. */
  configs?: { file: string; chromium: string }[];
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
    configs: [{ file: 'playwright.react.config.ts', chromium: 'chromium-*' }],
  },
  m4: {
    prepare: [['bun', 'run', 'scripts/prepare-m4.ts']],
    configs: [{ file: 'playwright.m4.config.ts', chromium: 'chromium' }],
    checks: [
      ['bun', 'run', 'scripts/verify-boundaries.ts'],
      ['bun', 'run', 'scripts/verify-catalog-ssr.ts'],
    ],
  },
};
// Suites reuse consumers that earlier suites install.
const requires: Record<string, string[]> = {
  react: ['native'],
  m4: ['react'],
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
      if (!process.env.ALL_BROWSERS) args.push(`--project=${config.chromium}`);
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
