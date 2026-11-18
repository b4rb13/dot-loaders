import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4/packed-report.json', import.meta.url),
    'utf8',
  ),
);
const run = 'current';
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope:
      'Remaining M4 motion, cycle phases and pointer alignment; renderer provisional',
  },
  testDir: './tests/motion-review',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 20000,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: `.artifacts/m4-motion-review/${run}/browser-results.json` },
    ],
  ],
  outputDir: `.artifacts/m4-motion-review/${run}/test-results`,
  use: {
    baseURL: 'http://127.0.0.1:4194',
    headless: true,
    reducedMotion: 'no-preference',
    viewport: { width: 900, height: 700 },
    video: 'on',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: [
    {
      command: 'bun tests/m4/server.ts',
      port: 4194,
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/table/server.ts',
      port: 4197,
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/shared-wrapper/server.ts',
      port: 4202,
      reuseExistingServer: false,
    },
  ],
});
