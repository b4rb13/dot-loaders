import { readFileSync } from 'node:fs';
import { arch, release } from 'node:os';
import { defineConfig } from '@playwright/test';

const artifact = JSON.parse(
  readFileSync(
    new URL('./.artifacts/packed-report.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifactSha256: artifact.sha256,
    toolchain: artifact.environment,
    runnerNode: process.version,
    osRelease: release(),
    arch: arch(),
  },
  testDir: './tests/browser',
  timeout: 20000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.DOTQUILT_BROWSER_REPORT ??
          '.artifacts/browser-results.json',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4181',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun tests/browser/server.ts',
    port: 4181,
    reuseExistingServer: false,
  },
});
