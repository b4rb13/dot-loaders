import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4/packed-report.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    renderer: 'provisional',
    scope: 'TableLoader native/current React',
  },
  testDir: './tests/table',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4/table-results.json' }],
  ],
  outputDir: '.artifacts/m4/table-results',
  use: {
    baseURL: 'http://127.0.0.1:4197',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun tests/table/server.ts',
    port: 4197,
    reuseExistingServer: false,
  },
});
