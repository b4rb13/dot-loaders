import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const packed = JSON.parse(
  readFileSync('.artifacts/packed-report.json', 'utf8'),
);
export default defineConfig({
  metadata: {
    artifactSha256: packed.sha256,
    qualification: 'local diagnostics',
  },
  testDir: './tests/m2',
  testMatch: 'catalog.check.ts',
  timeout: 30000,
  workers: 1,
  fullyParallel: false,
  outputDir: '.artifacts/m2-catalog/results',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m2-catalog/browser-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4183',
    reducedMotion: 'no-preference',
    viewport: { width: 1280, height: 1000 },
    video: { mode: 'on', size: { width: 1280, height: 1000 } },
  },
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: { browserName: name as 'chromium' | 'firefox' | 'webkit' },
  })),
  webServer: {
    command: 'DOTQUILT_TEST_PORT=4183 bun tests/browser/server.ts',
    port: 4183,
    reuseExistingServer: false,
  },
});
