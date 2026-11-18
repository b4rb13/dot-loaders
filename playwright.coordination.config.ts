import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4-coordination/fixtures.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope: 'M4 mixed/nested coordination; functional implementation only',
  },
  testDir: './tests/coordination',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4-coordination/browser-results.json' }],
  ],
  outputDir: '.artifacts/m4-coordination/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4201',
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
    command: 'bun tests/coordination/server.ts',
    port: 4201,
    reuseExistingServer: false,
  },
});
