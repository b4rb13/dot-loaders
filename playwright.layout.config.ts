import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4-layout/fixtures.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope: 'M4 maximum-input reserved-layout and CLS, local engines only',
  },
  testDir: './tests/layout',
  testMatch: '*.spec.ts',
  timeout: 30000,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.DOTQUILT_BROWSER_REPORT ??
          '.artifacts/m4-layout/browser-results.json',
      },
    ],
  ],
  outputDir: '.artifacts/m4-layout/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4207',
    headless: true,
    viewport: { width: 320, height: 2400 },
    reducedMotion: 'no-preference',
  },
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: { browserName: name as 'chromium' | 'firefox' | 'webkit' },
  })),
  webServer: {
    command: 'bun tests/layout/server.ts',
    port: 4207,
    reuseExistingServer: false,
  },
});
