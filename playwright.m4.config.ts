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
    catalog: 'eight-component incremental M4 slice; renderer provisional',
  },
  testDir: './tests/m4',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4/browser-results.json' }],
  ],
  outputDir: '.artifacts/m4/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4194',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun tests/m4/server.ts',
    port: 4194,
    reuseExistingServer: false,
  },
});
