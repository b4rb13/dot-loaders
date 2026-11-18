import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4-shared-wrapper/fixtures.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope: 'M4 mixed/nested shared-wrapper; functional implementation only',
  },
  testDir: './tests/shared-wrapper',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: '.artifacts/m4-shared-wrapper/browser-results.json' },
    ],
  ],
  outputDir: '.artifacts/m4-shared-wrapper/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4202',
    headless: true,
    viewport: { width: 1100, height: 1600 },
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun tests/shared-wrapper/server.ts',
    port: 4202,
    reuseExistingServer: false,
  },
});
