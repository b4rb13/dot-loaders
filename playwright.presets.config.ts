import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4-presets/fixtures.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope: 'M4 family presets; functional implementation only',
  },
  testDir: './tests/presets',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4-presets/browser-results.json' }],
  ],
  outputDir: '.artifacts/m4-presets/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4198',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun tests/presets/server.ts',
    port: 4198,
    reuseExistingServer: false,
  },
});
