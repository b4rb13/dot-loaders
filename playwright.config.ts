import { defineConfig } from '@playwright/test';

// Main browser suite. Runs against the workspace build: `bun run build` first.
//   bun run test:e2e                 Chromium only (day to day)
//   ALL_BROWSERS=1 bun run test:e2e  Chromium, Firefox and WebKit
// Projects:
//   e2e     tests/e2e: every component's pending/ready behaviour, layout and
//           screenshots on plain fixture pages
//   native  tests/browser: detailed runtime behaviour (focus, events, motion
//           restrictions, CSP, static output, cleanup)
const browsers = (
  process.env.ALL_BROWSERS ? ['chromium', 'firefox', 'webkit'] : ['chromium']
) as ('chromium' | 'firefox' | 'webkit')[];

export default defineConfig({
  metadata: { artifactSha256: 'workspace' },
  timeout: 20000,
  forbidOnly: !!process.env.CI,
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
      // Several native tests observe frame timing and shared document state.
      workers: 1,
      use: { browserName, baseURL: 'http://127.0.0.1:4181' },
    },
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
  ],
});
