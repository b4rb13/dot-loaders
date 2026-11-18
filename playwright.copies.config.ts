import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packet = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m4-copies/fixtures.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    artifacts: packet.artifacts,
    scope: 'M4 custom/provider compatible-copy conformance, local engines only',
  },
  testDir: './tests/copies',
  testMatch: '*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.DOTQUILT_BROWSER_REPORT ??
          '.artifacts/m4-copies/browser-results.json',
      },
    ],
  ],
  outputDir: '.artifacts/m4-copies/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4206',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: { browserName: name as 'chromium' | 'firefox' | 'webkit' },
  })),
  webServer: {
    command: 'bun tests/copies/server.ts',
    port: 4206,
    reuseExistingServer: false,
  },
});
