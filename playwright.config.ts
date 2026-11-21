import { defineConfig } from '@playwright/test';

// Main browser suite. Runs against the workspace build: `bun run build` first.
//   bun run test:e2e                 Chromium only (day to day)
//   ALL_BROWSERS=1 bun run test:e2e  Chromium, Firefox and WebKit
// Projects:
//   e2e     tests/e2e: every component's pending/ready behaviour, layout and
//           screenshots on plain fixture pages
//   native  tests/browser: detailed runtime behaviour (focus, events, motion
//           restrictions, CSP, static output, cleanup)
// Suites ported from the legacy runner. Each keeps its own fixture server,
// which builds its client from the workspace packages at startup.
const suites: {
  name: string;
  port: number;
  viewport?: { width: number; height: number };
}[] = [
  { name: 'coordination', port: 4201, viewport: { width: 1100, height: 1600 } },
  { name: 'presets', port: 4198 },
  { name: 'table', port: 4197 },
  {
    name: 'shared-wrapper',
    port: 4202,
    viewport: { width: 1100, height: 1600 },
  },
  { name: 'api', port: 4203 },
  { name: 'react', port: 4191 },
  { name: 'm4', port: 4194 },
  { name: 'layout', port: 4207, viewport: { width: 320, height: 2400 } },
  // The built docs site (apps/site).
  { name: 'site', port: 4331 },
];
// Example apps built by `bun run build`, each tested in tests/<name>.
const apps = [
  { name: 'next', port: 4360 },
  { name: 'nuxt', port: 4361 },
];
const browsers = (
  process.env.ALL_BROWSERS ? ['chromium', 'firefox', 'webkit'] : ['chromium']
) as ('chromium' | 'firefox' | 'webkit')[];

export default defineConfig({
  metadata: { artifactSha256: 'workspace' },
  timeout: 20000,
  forbidOnly: !!process.env.CI,
  // CI runners have 2 cores; the default would use one worker.
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Screenshot baselines are generated on macOS; CI on Linux renders fonts
  // differently, so CI skips pixel comparisons and keeps layout assertions.
  ignoreSnapshots: !!process.env.CI,
  updateSnapshots: 'missing',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: { headless: true, reducedMotion: 'no-preference' },
  projects: browsers.flatMap((browserName) => [
    {
      name: `e2e-${browserName}`,
      testDir: './tests/e2e',
      fullyParallel: true,
      use: { browserName, baseURL: 'http://127.0.0.1:4310' },
    },
    {
      name: `native-${browserName}`,
      testDir: './tests/browser',
      // Pages share nothing: ledgers and frame clocks live on each document.
      fullyParallel: true,
      use: { browserName, baseURL: 'http://127.0.0.1:4181' },
    },
    ...suites.map((suite) => ({
      name: `${suite.name}-${browserName}`,
      testDir: `./tests/${suite.name}`,
      testMatch: '*.spec.ts',
      fullyParallel: true,
      use: {
        browserName,
        baseURL: `http://127.0.0.1:${suite.port}`,
        ...(suite.viewport ? { viewport: suite.viewport } : {}),
      },
    })),
    ...apps.map((app) => ({
      name: `${app.name}-${browserName}`,
      testDir: `./tests/${app.name}`,
      fullyParallel: true,
      use: { browserName, baseURL: `http://127.0.0.1:${app.port}` },
    })),
  ]),
  webServer: [
    {
      command: 'bun tests/e2e/server.ts',
      port: 4310,
      // The server imports the built packages at startup; never reuse a stale one.
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/browser/server.ts',
      port: 4181,
      reuseExistingServer: false,
    },
    ...suites.map((suite) => ({
      command: `bun tests/${suite.name}/server.ts`,
      port: suite.port,
      reuseExistingServer: false,
    })),
    ...apps.map((app) => ({
      command: `bun run --cwd examples/${app.name} start`,
      port: app.port,
      reuseExistingServer: false,
    })),
  ],
});
